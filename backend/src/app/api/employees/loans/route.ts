import { NextResponse } from 'next/server';
import { db } from '@/db';
import { employeeLoans, employees, transactions, journalEntries, cashierShifts, activityLogs } from '@/db/schema';
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { employeeLoanSchema } from '@/lib/validators';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let conditions = [];
        const scope = storeScope(authResult, employeeLoans.storeId);
        if (scope) conditions.push(scope);

        const list = await db.query.employeeLoans.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(employeeLoans.createdAt)],
            with: {
                employee: true,
                store: true
            }
        });

        return NextResponse.json(list);
    } catch (error) {
        console.error("Failed to fetch loans:", error);
        return NextResponse.json({ error: "Failed to fetch loans" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a loan" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = employeeLoanSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { employeeId, amount, description, loanDate } = parsed.data;
        const paymentMethod = body.paymentMethod || "Cash"; // Cash or Transfer Bank

        // Verify employee exists in store
        const employee = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, employeeId),
                eq(employees.storeId, authResult.storeId)
            )
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

        // Run as transaction
        const result = await db.transaction(async (tx) => {
            // 1. Create Operasional transaction
            const liquidAccount = paymentMethod === "Cash" ? "Kas" : "Bank";
            const loanDescription = `Kasbon Karyawan: ${employee.name} (${description || ''})`;

            const [newTx] = await tx.insert(transactions).values({
                storeId: authResult.storeId,
                transactionType: "Operasional",
                amount,
                description: loanDescription,
                paymentMethod,
                paymentStatus: "Lunas",
                userId: authResult.user.id,
                shiftId: activeShift?.id || null,
                transactionDate: loanDate || new Date(),
                createdAt: new Date()
            }).returning();

            // Journal entries: Debit "Kasbon Karyawan" (Receivable), Credit Cash/Bank
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: "Kasbon Karyawan", debit: amount, credit: 0 },
                { storeId: authResult.storeId, transactionId: newTx.id, accountName: liquidAccount, debit: 0, credit: amount }
            ]);

            // 2. Insert loan record
            const [newLoan] = await tx.insert(employeeLoans).values({
                storeId: authResult.storeId,
                employeeId,
                amount,
                paidAmount: 0,
                status: 'UNPAID',
                description: description || null,
                loanDate: loanDate || new Date(),
                createdAt: new Date()
            }).returning();

            return newLoan;
        });

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_EMPLOYEE_LOAN",
            entityType: "employee_loans",
            entityId: result.id,
            details: JSON.stringify({ employeeName: employee.name, amount })
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error("Failed to create loan:", error);
        return NextResponse.json({ error: "Failed to create loan" }, { status: 500 });
    }
}
