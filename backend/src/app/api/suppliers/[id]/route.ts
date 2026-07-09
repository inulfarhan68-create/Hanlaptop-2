import { NextResponse } from 'next/server';
import { db } from '@/db';
import { suppliers, activityLogs } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { supplierSchema } from '@/lib/validators';
import { eq, and } from 'drizzle-orm';

/**
 * Helper: Verify supplier belongs to user's store (SaaS Tenant Isolation)
 */
async function verifySupplierAccess(authResult: any, supplierId: string) {
    // Owner (global) can access all suppliers
    if ((authResult.user as any).role === "owner" || authResult.storeId === "all") {
        const supplier = await db.query.suppliers.findFirst({
            where: eq(suppliers.id, supplierId)
        });
        return supplier ? { supplier, authorized: true } : { supplier: null, authorized: false, response: NextResponse.json({ error: "Supplier not found" }, { status: 404 }) };
    }

    // Non-owner: must check storeId match
    const supplier = await db.query.suppliers.findFirst({
        where: and(
            eq(suppliers.id, supplierId),
            eq(suppliers.storeId, authResult.storeId)
        )
    });

    if (!supplier) {
        return {
            supplier: null,
            authorized: false,
            response: NextResponse.json({ error: "Supplier not found or access denied" }, { status: 404 })
        };
    }

    return { supplier, authorized: true };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify supplier belongs to user's store
    const { supplier: existingSupplier, authorized, response } = await verifySupplierAccess(authResult, id);
    if (!authorized) return response;

    try {
        const body = await request.json();
        const parsed = supplierSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, email, address, notes } = parsed.data;

        const [updatedSupplier] = await db.update(suppliers)
            .set({ name, phone, email, address, notes })
            .where(and(
                eq(suppliers.id, id),
                // 🔒 Double-check storeId in update
                authResult.storeId !== "all" ? eq(suppliers.storeId, authResult.storeId) : undefined
            ))
            .returning();

        if (!updatedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: existingSupplier!.storeId,
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
    if (authResult.storeRole !== 'owner' && authResult.storeRole !== 'manager' && (authResult.user as any).role !== 'owner') {
        return NextResponse.json({ error: "Forbidden. Only owner or manager can delete suppliers." }, { status: 403 });
    }

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify supplier belongs to user's store
    const { supplier: existingSupplier, authorized, response } = await verifySupplierAccess(authResult, id);
    if (!authorized) return response;

    try {
        const [deletedSupplier] = await db.update(suppliers)
            .set({ deletedAt: new Date() })
            .where(and(
                eq(suppliers.id, id),
                // 🔒 Double-check storeId in delete
                authResult.storeId !== "all" ? eq(suppliers.storeId, authResult.storeId) : undefined
            ))
            .returning();

        if (!deletedSupplier) {
            return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: existingSupplier!.storeId,
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
