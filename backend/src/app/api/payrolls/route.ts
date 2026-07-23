import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payrolls, employees } from '@/db/schema';
import { requireOwnerOrManager, storeScope, requireFeature } from "@/lib/auth-guard";
import { payrollSchema } from '@/lib/validators';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("hr");
    if (featureCheck instanceof NextResponse) return featureCheck;

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period');
    const employeeId = searchParams.get('employeeId');

    try {
        let conditions = [];
        const scope = storeScope(authResult, payrolls.storeId);
        if (scope) conditions.push(scope);
        if (period) {
            conditions.push(eq(payrolls.period, period));
        }
        if (employeeId) {
            conditions.push(eq(payrolls.employeeId, employeeId));
        }

        const list = await db.query.payrolls.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(payrolls.createdAt)],
            with: {
                employee: true,
                store: true
            }
        });

        return NextResponse.json(list);
    } catch (error) {
        console.error("Failed to fetch payrolls:", error);
        return NextResponse.json({ error: "Failed to fetch payrolls" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("hr");
    if (featureCheck instanceof NextResponse) return featureCheck;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a payroll" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = payrollSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { employeeId, period, basicSalary, allowance, commissions, overtime, deductions, notes } = parsed.data;

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

        // Verify no duplicate payroll for this employee & period
        const existing = await db.query.payrolls.findFirst({
            where: and(
                eq(payrolls.storeId, authResult.storeId),
                eq(payrolls.employeeId, employeeId),
                eq(payrolls.period, period)
            )
        });

        if (existing) {
            return NextResponse.json({ error: "Slip gaji untuk karyawan ini di periode tersebut sudah ada" }, { status: 400 });
        }

        const netSalary = (basicSalary + allowance + commissions + overtime) - deductions;

        const [newPayroll] = await db.insert(payrolls).values({
            storeId: authResult.storeId,
            employeeId,
            period,
            basicSalary,
            allowance,
            commissions,
            overtime,
            deductions,
            netSalary: netSalary > 0 ? netSalary : 0,
            paymentMethod: body.paymentMethod || 'Cash',
            paymentStatus: 'UNPAID',
            notes: notes || null,
            createdAt: new Date()
        }).returning();

        return NextResponse.json(newPayroll, { status: 201 });
    } catch (error) {
        console.error("Failed to create payroll:", error);
        return NextResponse.json({ error: "Failed to create payroll" }, { status: 500 });
    }
}
