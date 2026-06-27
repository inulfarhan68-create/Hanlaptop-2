import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payrolls, employees, transactions, journalEntries, cashierShifts, technicianCommissions, employeeLoans, activityLogs } from '@/db/schema';
import { requireOwnerOrManager } from '@/lib/auth-guard';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const item = await db.query.payrolls.findFirst({
            where: and(
                eq(payrolls.id, id),
                authResult.storeId !== "all" ? eq(payrolls.storeId, authResult.storeId) : undefined
            ),
            with: {
                employee: true
            }
        });

        if (!item) {
            return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Failed to fetch payroll:", error);
        return NextResponse.json({ error: "Failed to fetch payroll" }, { status: 500 });
    }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to update a payroll" }, { status: 400 });
    }

    const { id } = await context.params;

    try {
        // Fetch payroll record
        const payroll = await db.query.payrolls.findFirst({
            where: and(
                eq(payrolls.id, id),
                eq(payrolls.storeId, authResult.storeId)
            )
        });

        if (!payroll) {
            return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
        }

        if (payroll.paymentStatus === 'PAID') {
            return NextResponse.json({ error: "Gaji ini sudah dibayarkan" }, { status: 400 });
        }

        const body = await request.json();
        const action = body.action; // e.g. "PAYOUT"

        if (action === "PAYOUT") {
            const paymentMethod = body.paymentMethod || payroll.paymentMethod || 'Cash';
            const liquidAccount = paymentMethod === "Cash" ? "Kas" : "Bank";

            // Fetch employee
            const employee = await db.query.employees.findFirst({
                where: eq(employees.id, payroll.employeeId)
            });

            if (!employee) {
                return NextResponse.json({ error: "Karyawan tidak ditemukan" }, { status: 404 });
            }

            // Get active shift
            const activeShift = await db.query.cashierShifts.findFirst({
                where: and(
                    eq(cashierShifts.storeId, authResult.storeId),
                    eq(cashierShifts.status, "OPEN")
                )
            });

            // Process payout inside a database transaction
            const updated = await db.transaction(async (tx) => {
                // 1. Create operasional payout transaction
                const payoutDesc = `Beban Gaji Karyawan - Gaji & Komisi Karyawan: ${employee.name} (${payroll.period})`;
                const [newTx] = await tx.insert(transactions).values({
                    storeId: authResult.storeId,
                    transactionType: "Operasional",
                    amount: payroll.netSalary,
                    description: payoutDesc,
                    paymentMethod,
                    paymentStatus: "Lunas",
                    userId: authResult.user.id,
                    shiftId: activeShift?.id || null,
                    transactionDate: new Date(),
                    createdAt: new Date()
                }).returning();

                // Journal entries: Debit "Beban Gaji Karyawan" (Expense), Credit Kas/Bank
                await tx.insert(journalEntries).values([
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Beban Gaji Karyawan", debit: payroll.netSalary, credit: 0 },
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: payroll.netSalary }
                ]);

                // 2. Mark technicians unpaid commissions to PAID if any
                if (employee.technicianId && payroll.commissions > 0) {
                    await tx.update(technicianCommissions)
                        .set({
                            status: 'PAID',
                            paidAt: new Date(),
                            payoutTransactionId: newTx.id
                        })
                        .where(and(
                            eq(technicianCommissions.storeId, authResult.storeId),
                            eq(technicianCommissions.technicianId, employee.technicianId),
                            eq(technicianCommissions.status, 'UNPAID')
                        ));
                }

                // 3. Deduct from employee loans if any
                if (payroll.deductions > 0) {
                    let remainingDeduction = payroll.deductions;
                    const unpaidLoans = await tx.query.employeeLoans.findMany({
                        where: and(
                            eq(employeeLoans.storeId, authResult.storeId),
                            eq(employeeLoans.employeeId, payroll.employeeId),
                            ne(employeeLoans.status, 'PAID')
                        ),
                        orderBy: [employeeLoans.loanDate] // pay oldest first
                    });

                    for (const loan of unpaidLoans) {
                        if (remainingDeduction <= 0) break;

                        const outstanding = loan.amount - loan.paidAmount;
                        if (outstanding <= 0) continue;

                        const paymentToApply = Math.min(remainingDeduction, outstanding);
                        const newPaidAmount = loan.paidAmount + paymentToApply;
                        const isFullyPaid = newPaidAmount >= loan.amount;

                        await tx.update(employeeLoans)
                            .set({
                                paidAmount: newPaidAmount,
                                status: isFullyPaid ? 'PAID' : 'PARTIAL'
                            })
                            .where(eq(employeeLoans.id, loan.id));

                        remainingDeduction -= paymentToApply;
                    }
                }

                // 4. Update payroll status
                const [updatedPayroll] = await tx.update(payrolls)
                    .set({
                        paymentMethod,
                        paymentStatus: 'PAID',
                        paidAt: new Date(),
                        payoutTransactionId: newTx.id
                    })
                    .where(eq(payrolls.id, id))
                    .returning();

                return updatedPayroll;
            });

            // Log activity
            await db.insert(activityLogs).values({
                storeId: authResult.storeId,
                userId: authResult.user.id,
                userName: authResult.user.name,
                action: "PAYOUT_PAYROLL",
                entityType: "payrolls",
                entityId: id,
                details: JSON.stringify({ employeeName: employee.name, netSalary: payroll.netSalary, period: payroll.period })
            });

            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Failed to pay payroll:", error);
        return NextResponse.json({ error: "Failed to pay payroll" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const existing = await db.query.payrolls.findFirst({
            where: and(
                eq(payrolls.id, id),
                eq(payrolls.storeId, authResult.storeId)
            ),
            with: {
                employee: true
            }
        });

        if (!existing) {
            return NextResponse.json({ error: "Payroll record not found" }, { status: 404 });
        }

        if (existing.paymentStatus === 'PAID') {
            return NextResponse.json({ error: "Gaji yang sudah dibayarkan tidak dapat dihapus" }, { status: 400 });
        }

        await db.delete(payrolls).where(eq(payrolls.id, id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_PAYROLL",
            entityType: "payrolls",
            entityId: id,
            details: JSON.stringify({ employeeName: existing.employee?.name, period: existing.period })
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete payroll:", error);
        return NextResponse.json({ error: "Failed to delete payroll" }, { status: 500 });
    }
}
