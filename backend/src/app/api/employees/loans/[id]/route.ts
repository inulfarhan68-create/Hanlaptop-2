import { NextResponse } from 'next/server';
import { db } from '@/db';
import { employeeLoans, activityLogs } from '@/db/schema';
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const item = await db.query.employeeLoans.findFirst({
            where: and(
                eq(employeeLoans.id, id),
                storeScope(authResult, employeeLoans.storeId)
            ),
            with: {
                employee: true
            }
        });

        if (!item) {
            return NextResponse.json({ error: "Loan record not found" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Failed to fetch loan:", error);
        return NextResponse.json({ error: "Failed to fetch loan" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        // 🔒 SaaS Tenant Isolation: storeScope handles platform_admin vs tenant
        const existing = await db.query.employeeLoans.findFirst({
            where: and(
                eq(employeeLoans.id, id),
                storeScope(authResult, employeeLoans.storeId)
            ),
            with: {
                employee: true
            }
        });

        if (!existing) {
            return NextResponse.json({ error: "Loan record not found or access denied" }, { status: 404 });
        }

        // Use the loan's actual storeId for logging when owner/platform_admin is on "all"
        const actualStoreId = existing.storeId;

        await db.delete(employeeLoans).where(eq(employeeLoans.id, id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: actualStoreId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_EMPLOYEE_LOAN",
            entityType: "employee_loans",
            entityId: id,
            details: JSON.stringify({ employeeName: existing.employee?.name, amount: existing.amount })
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete loan:", error);
        return NextResponse.json({ error: "Failed to delete loan" }, { status: 500 });
    }
}
