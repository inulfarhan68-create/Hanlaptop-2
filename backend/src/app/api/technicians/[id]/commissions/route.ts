import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicianCommissions, serviceOrders } from '@/db/schema';
import { requireAuth } from '@/lib/auth-guard';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const commissions = await db.select({
            id: technicianCommissions.id,
            serviceOrderId: technicianCommissions.serviceOrderId,
            transactionId: technicianCommissions.transactionId,
            serviceAmount: technicianCommissions.serviceAmount,
            partsAmount: technicianCommissions.partsAmount,
            commissionAmount: technicianCommissions.commissionAmount,
            status: technicianCommissions.status,
            paidAt: technicianCommissions.paidAt,
            createdAt: technicianCommissions.createdAt,
            serviceDevice: serviceOrders.deviceName,
            serviceIssue: serviceOrders.issue,
            customerName: serviceOrders.customerName
        })
        .from(technicianCommissions)
        .leftJoin(serviceOrders, eq(technicianCommissions.serviceOrderId, serviceOrders.id))
        .where(
            and(
                eq(technicianCommissions.technicianId, params.id),
                authResult.storeId !== "all" ? eq(technicianCommissions.storeId, authResult.storeId) : undefined
            )
        )
        .orderBy(desc(technicianCommissions.createdAt));

        return NextResponse.json(commissions);
    } catch (error: any) {
        console.error("Failed to fetch technician commissions:", error);
        return NextResponse.json({ error: error.message || "Failed to fetch technician commissions" }, { status: 500 });
    }
}
