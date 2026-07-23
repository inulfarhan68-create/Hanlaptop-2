import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers, activityLogs, transactions } from '@/db/schema';
import { requireAuth, requireWriteAccess, storeScope } from '@/lib/auth-guard';
import { supplierSchema } from '@/lib/validators';
import { eq, desc, like, or, sql, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    try {
        let conditions = [isNull(suppliers.deletedAt)];
        const scope = storeScope(authResult, suppliers.storeId);
        if (scope) conditions.push(scope);

        if (search) {
            const searchCondition = or(
                like(suppliers.name, `%${search}%`),
                like(suppliers.phone, `%${search}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        // Fetch suppliers with calculated transaction stats
        const results = await db.select({
            id: suppliers.id,
            name: suppliers.name,
            phone: suppliers.phone,
            email: suppliers.email,
            address: suppliers.address,
            notes: suppliers.notes,
            createdAt: suppliers.createdAt,
            totalTransactions: sql<number>`count(${transactions.id})`,
            totalSpent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
        })
        .from(suppliers)
        .leftJoin(transactions, eq(suppliers.id, transactions.supplierId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(suppliers.id)
        .orderBy(desc(suppliers.createdAt));

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch suppliers:", error);
        return NextResponse.json({ error: "Failed to fetch suppliers" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a supplier" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = supplierSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, email, address, notes } = parsed.data;

        const [newSupplier] = await db.insert(suppliers).values({
            storeId: authResult.storeId,
            name,
            phone,
            email,
            address,
            notes,
            createdAt: new Date(),
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_SUPPLIER",
            entityType: "supplier",
            entityId: newSupplier.id,
            details: JSON.stringify({ name: newSupplier.name, phone: newSupplier.phone })
        });

        return NextResponse.json(newSupplier, { status: 201 });
    } catch (error) {
        console.error("Failed to create supplier:", error);
        return NextResponse.json({ error: "Failed to create supplier" }, { status: 500 });
    }
}
