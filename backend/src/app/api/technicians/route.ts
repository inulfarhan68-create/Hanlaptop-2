import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicians, activityLogs, serviceOrders, technicianCommissions } from '@/db/schema';
import { requireAuth, requireWriteAccess, storeScope, requireFeature } from "@/lib/auth-guard";
import { technicianSchema } from '@/lib/validators';
import { eq, desc, like, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("hr");
    if (featureCheck instanceof NextResponse) return featureCheck;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const activeOnly = searchParams.get('active') === 'true';

    try {
        let conditions = [];
        const scope = storeScope(authResult, technicians.storeId);
        if (scope) conditions.push(scope);

        if (activeOnly) {
            conditions.push(eq(technicians.isActive, true));
        }

        if (search) {
            conditions.push(like(technicians.name, `%${search}%`));
        }

        // Fetch technicians with computed service stats
        const results = await db.select({
            id: technicians.id,
            name: technicians.name,
            phone: technicians.phone,
            isActive: technicians.isActive,
            commissionType: technicians.commissionType,
            commissionValue: technicians.commissionValue,
            createdAt: technicians.createdAt,
            totalServices: sql<number>`count(${serviceOrders.id})`,
            completedServices: sql<number>`sum(case when ${serviceOrders.status} = 'Diambil' or ${serviceOrders.status} = 'Selesai' then 1 else 0 end)`,
            averageRating: sql<number>`avg(${serviceOrders.rating})`,
            totalRatings: sql<number>`sum(case when ${serviceOrders.rating} is not null then 1 else 0 end)`,
            unpaidCommissions: sql<number>`sum(case when ${technicianCommissions.status} = 'UNPAID' then ${technicianCommissions.commissionAmount} else 0 end)`,
        })
        .from(technicians)
        .leftJoin(serviceOrders, eq(technicians.id, serviceOrders.technicianId))
        .leftJoin(technicianCommissions, eq(serviceOrders.id, technicianCommissions.serviceOrderId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(technicians.id)
        .orderBy(desc(technicians.createdAt));

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch technicians:", error);
        return NextResponse.json({ error: "Failed to fetch technicians" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("hr");
    if (featureCheck instanceof NextResponse) return featureCheck;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a technician" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = technicianSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, isActive, commissionType, commissionValue } = parsed.data;

        const [newTechnician] = await db.insert(technicians).values({
            storeId: authResult.storeId,
            name,
            phone,
            isActive: isActive ?? true,
            commissionType: commissionType ?? 'percentage',
            commissionValue: commissionValue ?? 0,
            createdAt: new Date(),
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_TECHNICIAN",
            entityType: "technician",
            entityId: newTechnician.id,
            details: JSON.stringify({ name: newTechnician.name, phone: newTechnician.phone })
        });

        return NextResponse.json(newTechnician, { status: 201 });
    } catch (error) {
        console.error("Failed to create technician:", error);
        return NextResponse.json({ error: "Failed to create technician" }, { status: 500 });
    }
}
