import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, transactions, activityLogs } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { customerSchema } from '@/lib/validators';
import { eq, desc, like, or, sql, and, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');

    try {
        let conditions = [isNull(customers.deletedAt)];
        if (authResult.storeId !== "all") {
            conditions.push(eq(customers.storeId, authResult.storeId));
        }

        if (search) {
            const searchCondition = or(
                like(customers.name, `%${search}%`),
                like(customers.phone, `%${search}%`)
            );
            if (searchCondition) conditions.push(searchCondition);
        }

        // Fetch customers with their stats computed
        const results = await db.select({
            id: customers.id,
            name: customers.name,
            phone: customers.phone,
            address: customers.address,
            notes: customers.notes,
            createdAt: customers.createdAt,
            totalTransactions: sql<number>`count(${transactions.id})`,
            totalSpent: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
            lastVisitDate: sql<Date>`max(${transactions.transactionDate})`,
        })
        .from(customers)
        .leftJoin(transactions, eq(customers.id, transactions.customerId))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(customers.id)
        .orderBy(desc(customers.createdAt));

        return NextResponse.json(results);
    } catch (error) {
        console.error("Failed to fetch customers:", error);
        return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a customer" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = customerSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, address, notes } = parsed.data;

        const [newCustomer] = await db.insert(customers).values({
            storeId: authResult.storeId,
            name,
            phone,
            address,
            notes,
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_CUSTOMER",
            entityType: "customer",
            entityId: newCustomer.id,
            details: JSON.stringify({ name: newCustomer.name, phone: newCustomer.phone })
        });

        return NextResponse.json(newCustomer, { status: 201 });
    } catch (error) {
        console.error("Failed to create customer:", error);
        return NextResponse.json({ error: "Failed to create customer" }, { status: 500 });
    }
}
