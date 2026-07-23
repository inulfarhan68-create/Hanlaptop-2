import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicianCommissions } from '@/db/schema';
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { eq, and, gte, lte, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const technicianId = searchParams.get('technicianId');
    const status = searchParams.get('status'); // 'UNPAID' | 'PAID'
    const startDateParam = searchParams.get('startDate');
    const endDateParam = searchParams.get('endDate');

    try {
        let conditions = [];
        
        const scope = storeScope(authResult, technicianCommissions.storeId);
        if (scope) conditions.push(scope);

        if (technicianId) {
            conditions.push(eq(technicianCommissions.technicianId, technicianId));
        }

        if (status) {
            conditions.push(eq(technicianCommissions.status, status));
        }

        if (startDateParam) {
            conditions.push(gte(technicianCommissions.createdAt, new Date(startDateParam)));
        }

        if (endDateParam) {
            conditions.push(lte(technicianCommissions.createdAt, new Date(endDateParam)));
        }

        const results = await db.query.technicianCommissions.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                technician: true,
                serviceOrder: true,
                transaction: true,
                payoutTransaction: true,
            },
            orderBy: desc(technicianCommissions.createdAt)
        });

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch commissions:", error);
        return NextResponse.json({ error: "Failed to fetch commissions" }, { status: 500 });
    }
}
