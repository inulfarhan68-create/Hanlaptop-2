import { NextResponse } from 'next/server';
import { db } from '@/db';
import { customers, activityLogs, transactions } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { customerSchema } from '@/lib/validators';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const { id } = await context.params;
        const body = await request.json();
        const parsed = customerSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, address, notes } = parsed.data;

        const [updatedCustomer] = await db.update(customers)
            .set({ name, phone, address, notes })
            .where(eq(customers.id, id))
            .returning();

        if (!updatedCustomer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // Also update customerName in transactions if name changed
        if (name) {
            await db.update(transactions)
                .set({ customerName: name })
                .where(eq(transactions.customerId, id));
        }

        await db.insert(activityLogs).values({
            storeId: updatedCustomer.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "EDIT_CUSTOMER",
            entityType: "customer",
            entityId: id,
            details: JSON.stringify({ name: updatedCustomer.name })
        });

        return NextResponse.json(updatedCustomer);
    } catch (error) {
        console.error("Failed to update customer:", error);
        return NextResponse.json({ error: "Failed to update customer" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    // Only owner or manager can delete customers
    if (authResult.storeRole !== 'owner' && authResult.storeRole !== 'manager' && authResult.user.role !== 'owner') {
        return NextResponse.json({ error: "Forbidden. Only owner or manager can delete customers." }, { status: 403 });
    }

    try {
        const { id } = await context.params;

        const [deletedCustomer] = await db.update(customers)
            .set({ deletedAt: new Date() })
            .where(eq(customers.id, id))
            .returning();

        if (!deletedCustomer) {
            return NextResponse.json({ error: "Customer not found" }, { status: 404 });
        }

        // We don't delete transactions, the foreign key handles setting customerId to null

        await db.insert(activityLogs).values({
            storeId: deletedCustomer.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_CUSTOMER",
            entityType: "customer",
            entityId: id,
            details: JSON.stringify({ name: deletedCustomer.name })
        });

        return NextResponse.json({ message: "Customer deleted successfully" });
    } catch (error) {
        console.error("Failed to delete customer:", error);
        return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 });
    }
}
