import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicians, activityLogs } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { technicianSchema } from '@/lib/validators';
import { eq, and } from 'drizzle-orm';

/**
 * Helper: Verify technician belongs to user's store (SaaS Tenant Isolation)
 */
async function verifyTechnicianAccess(authResult: any, technicianId: string) {
    // Owner (global) can access all technicians
    if (authResult.user.role === "owner" || authResult.storeId === "all") {
        const technician = await db.query.technicians.findFirst({
            where: eq(technicians.id, technicianId)
        });
        return technician ? { technician, authorized: true } : { technician: null, authorized: false, response: NextResponse.json({ error: "Technician not found" }, { status: 404 }) };
    }

    // Non-owner: must check storeId match
    const technician = await db.query.technicians.findFirst({
        where: and(
            eq(technicians.id, technicianId),
            eq(technicians.storeId, authResult.storeId)
        )
    });

    if (!technician) {
        return {
            technician: null,
            authorized: false,
            response: NextResponse.json({ error: "Technician not found or access denied" }, { status: 404 })
        };
    }

    return { technician, authorized: true };
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify technician belongs to user's store
    const { technician: existingTechnician, authorized, response } = await verifyTechnicianAccess(authResult, id);
    if (!authorized) return response;

    try {
        const body = await request.json();
        const parsed = technicianSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, isActive, commissionType, commissionValue } = parsed.data;

        const [updatedTechnician] = await db.update(technicians)
            .set({ name, phone, isActive, commissionType, commissionValue })
            .where(and(
                eq(technicians.id, id),
                // 🔒 Double-check storeId in update
                authResult.storeId !== "all" ? eq(technicians.storeId, authResult.storeId) : undefined
            ))
            .returning();

        if (!updatedTechnician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: existingTechnician!.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "EDIT_TECHNICIAN",
            entityType: "technician",
            entityId: id,
            details: JSON.stringify({ name: updatedTechnician.name, isActive: updatedTechnician.isActive })
        });

        return NextResponse.json(updatedTechnician);
    } catch (error) {
        console.error("Failed to update technician:", error);
        return NextResponse.json({ error: "Failed to update technician" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    // Only owner or manager can delete technicians
    if (authResult.storeRole !== 'owner' && authResult.storeRole !== 'manager' && authResult.user.role !== 'owner') {
        return NextResponse.json({ error: "Forbidden. Only owner or manager can delete technicians." }, { status: 403 });
    }

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify technician belongs to user's store
    const { technician: existingTechnician, authorized, response } = await verifyTechnicianAccess(authResult, id);
    if (!authorized) return response;

    try {
        const [deletedTechnician] = await db.delete(technicians)
            .where(and(
                eq(technicians.id, id),
                // 🔒 Double-check storeId in delete
                authResult.storeId !== "all" ? eq(technicians.storeId, authResult.storeId) : undefined
            ))
            .returning();

        if (!deletedTechnician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: existingTechnician!.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_TECHNICIAN",
            entityType: "technician",
            entityId: id,
            details: JSON.stringify({ name: deletedTechnician.name })
        });

        return NextResponse.json({ message: "Technician deleted successfully" });
    } catch (error) {
        console.error("Failed to delete technician:", error);
        return NextResponse.json({ error: "Failed to delete technician" }, { status: 500 });
    }
}
