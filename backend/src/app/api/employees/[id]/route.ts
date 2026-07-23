import { NextResponse } from 'next/server';
import { db } from '@/db';
import { employees, activityLogs } from '@/db/schema';
import { requireReportAccess, requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { employeeSchema } from '@/lib/validators';
import { eq, and, ne } from 'drizzle-orm';

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const item = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, id),
                storeScope(authResult, employees.storeId)
            ),
            with: {
                user: true,
                technician: true,
                store: true
            }
        });

        if (!item) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        return NextResponse.json(item);
    } catch (error) {
        console.error("Failed to fetch employee:", error);
        return NextResponse.json({ error: "Failed to fetch employee" }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const body = await request.json();
        const parsed = employeeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, phone, email, role, userId, technicianId, basicSalary, allowance, isActive } = parsed.data;

        // Verify employee exists and belongs to store
        const existing = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, id),
                storeScope(authResult, employees.storeId)
            )
        });

        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        // Prevent duplicate mapping if userId or technicianId is provided
        if (userId) {
            const existingUser = await db.query.employees.findFirst({
                where: and(
                    eq(employees.storeId, existing.storeId),
                    eq(employees.userId, userId),
                    ne(employees.id, id)
                )
            });
            if (existingUser) {
                return NextResponse.json({ error: "Akun User ini sudah dihubungkan ke karyawan lain" }, { status: 400 });
            }
        }
        if (technicianId) {
            const existingTech = await db.query.employees.findFirst({
                where: and(
                    eq(employees.storeId, existing.storeId),
                    eq(employees.technicianId, technicianId),
                    ne(employees.id, id)
                )
            });
            if (existingTech) {
                return NextResponse.json({ error: "Teknisi ini sudah dihubungkan ke karyawan lain" }, { status: 400 });
            }
        }

        const [updatedEmployee] = await db.update(employees)
            .set({
                name,
                phone: phone || null,
                email: email || null,
                role,
                userId: userId || null,
                technicianId: technicianId || null,
                basicSalary,
                allowance,
                isActive: isActive ?? true,
                updatedAt: new Date()
            })
            .where(eq(employees.id, id))
            .returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existing.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_EMPLOYEE",
            entityType: "employees",
            entityId: id,
            details: JSON.stringify({ name: updatedEmployee.name, role: updatedEmployee.role })
        });

        return NextResponse.json(updatedEmployee);
    } catch (error) {
        console.error("Failed to update employee:", error);
        return NextResponse.json({ error: "Failed to update employee" }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    try {
        const existing = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, id),
                storeScope(authResult, employees.storeId)
            )
        });

        if (!existing) {
            return NextResponse.json({ error: "Employee not found" }, { status: 404 });
        }

        await db.delete(employees).where(eq(employees.id, id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existing.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_EMPLOYEE",
            entityType: "employees",
            entityId: id,
            details: JSON.stringify({ name: existing.name })
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete employee:", error);
        return NextResponse.json({ error: "Failed to delete employee" }, { status: 500 });
    }
}
