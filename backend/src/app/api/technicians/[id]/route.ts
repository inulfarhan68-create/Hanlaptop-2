import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicians, activityLogs } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { technicianSchema } from '@/lib/validators';
import { eq } from 'drizzle-orm';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const { id } = await context.params;
        const body = await request.json();
        const parsed = technicianSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { name, phone, isActive, commissionType, commissionValue } = parsed.data;

        const [updatedTechnician] = await db.update(technicians)
            .set({ name, phone, isActive, commissionType, commissionValue })
            .where(eq(technicians.id, id))
            .returning();

        if (!updatedTechnician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: updatedTechnician.storeId,
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

    try {
        const { id } = await context.params;

        const [deletedTechnician] = await db.delete(technicians)
            .where(eq(technicians.id, id))
            .returning();

        if (!deletedTechnician) {
            return NextResponse.json({ error: "Technician not found" }, { status: 404 });
        }

        await db.insert(activityLogs).values({
            storeId: deletedTechnician.storeId,
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
