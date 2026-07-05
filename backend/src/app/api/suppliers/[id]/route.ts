import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers, activityLogs } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { supplierSchema } from '@/lib/validators';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const { id } = await context.params;
        const body = await request.json();
        const parsed = supplierSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, email, address, notes } = parsed.data;

        const [updatedSupplier] = await db.update(suppliers)
            .set({ name, phone, email, address, notes })
            .where(eq(suppliers.id, id))
            .returning();

        if (!updatedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: updatedSupplier.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "EDIT_SUPPLIER",
            entityType: "supplier",
            entityId: id,
            details: JSON.stringify({ name: updatedSupplier.name })
        });

        return NextResponse.json(updatedSupplier);
    } catch (error) {
        console.error("Failed to update supplier:", error);
        return NextResponse.json({ error: "Failed to update supplier" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    // Only owner or manager can delete suppliers
    if (authResult.storeRole !== 'owner' && authResult.storeRole !== 'manager' && authResult.user.role !== 'owner') {
        return NextResponse.json({ error: "Forbidden. Only owner or manager can delete suppliers." }, { status: 403 });
    }

    try {
        const { id } = await context.params;

        const [deletedSupplier] = await db.update(suppliers)
            .set({ deletedAt: new Date() })
            .where(eq(suppliers.id, id))
            .returning();

        if (!deletedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: deletedSupplier.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_SUPPLIER",
            entityType: "supplier",
            entityId: id,
            details: JSON.stringify({ name: deletedSupplier.name })
        });

        return NextResponse.json({ message: "Supplier deleted successfully" });
    } catch (error) {
        console.error("Failed to delete supplier:", error);
        return NextResponse.json({ error: "Failed to delete supplier" }, { status: 500 });
    }
}
