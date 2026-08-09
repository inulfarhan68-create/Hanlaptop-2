import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, employees, activityLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireWriteAccess, storeScope, requireFeature } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    // Plan gate: the collection route enforces this, the item route did not.
    const planGate = await requireFeature("hr", authResult);
    if (planGate instanceof NextResponse) return planGate;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    // Verify Owner or Manager role
    const isOwnerOrManager = authResult.storeRole === "owner" || 
                             authResult.storeRole === "manager" || 
                             (authResult.user.role === "owner" || authResult.user.role === "platform_admin") || 
                             authResult.user.role === "manager";

    if (!isOwnerOrManager) {
        return NextResponse.json({ error: "Hanya Owner atau Manager yang memiliki akses ini." }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { id, employeeId, date, status, notes } = body;

        if (!employeeId || !date || !status) {
            return NextResponse.json({ error: "Kolom karyawan, tanggal, dan status wajib diisi." }, { status: 400 });
        }

        // The employee id arrives in the body, so it must be bounded to the caller's
        // own stores — otherwise a manager could log attendance against another
        // tenant's staff. 404 rather than 403: don't confirm the id exists elsewhere.
        const employee = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, employeeId),
                storeScope(authResult, employees.storeId)
            )
        });

        if (!employee) {
            return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
        }

        let result;
        if (id) {
            // Update existing record
            result = await db.update(attendances)
                .set({
                    status,
                    notes: notes || "",
                })
                // Tie the row to the employee resolved above, which is already
                // store-scoped — an attendance id alone is not a permission.
                .where(and(
                    eq(attendances.id, id),
                    eq(attendances.employeeId, employeeId)
                ))
                .returning();
                
            // Log activity
            await db.insert(activityLogs).values({
                storeId: employee.storeId,
                userId: authResult.user.id,
                userName: authResult.user.name,
                action: "UPDATE_ATTENDANCE_ADMIN",
                entityType: "attendances",
                entityId: id,
                details: JSON.stringify({ employeeName: employee.name, date, status })
            });
        } else {
            // Check if record already exists for today
            const existing = await db.query.attendances.findFirst({
                where: and(
                    eq(attendances.employeeId, employeeId),
                    eq(attendances.date, date)
                )
            });

            if (existing) {
                return NextResponse.json({ error: `Catatan absensi sudah ada untuk karyawan ini pada tanggal ${date}.` }, { status: 400 });
            }

            const newId = crypto.randomUUID();
            result = await db.insert(attendances).values({
                id: newId,
                storeId: employee.storeId,
                employeeId,
                date,
                status,
                notes: notes || "",
                createdAt: new Date()
            }).returning();

            // Log activity
            await db.insert(activityLogs).values({
                storeId: employee.storeId,
                userId: authResult.user.id,
                userName: authResult.user.name,
                action: "CREATE_ATTENDANCE_ADMIN",
                entityType: "attendances",
                entityId: newId,
                details: JSON.stringify({ employeeName: employee.name, date, status })
            });
        }

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to update attendance admin:", error);
        return NextResponse.json({ error: error.message || "Gagal memperbarui absensi." }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    // Plan gate: the collection route enforces this, the item route did not.
    const planGate = await requireFeature("hr", authResult);
    if (planGate instanceof NextResponse) return planGate;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    const isOwnerOrManager = authResult.storeRole === "owner" || 
                             authResult.storeRole === "manager" || 
                             (authResult.user.role === "owner" || authResult.user.role === "platform_admin") || 
                             authResult.user.role === "manager";

    if (!isOwnerOrManager) {
        return NextResponse.json({ error: "Hanya Owner atau Manager yang memiliki akses ini." }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID absensi diperlukan." }, { status: 400 });
        }

        // Scope the lookup: an attendance id from the query string must not reach
        // another tenant's record.
        const existing = await db.query.attendances.findFirst({
            where: and(
                eq(attendances.id, id),
                storeScope(authResult, attendances.storeId)
            ),
            with: { employee: true }
        });

        if (!existing) {
            return NextResponse.json({ error: "Catatan absensi tidak ditemukan." }, { status: 404 });
        }

        await db.delete(attendances).where(eq(attendances.id, id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existing.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_ATTENDANCE_ADMIN",
            entityType: "attendances",
            entityId: id,
            details: JSON.stringify({ employeeName: existing.employee?.name, date: existing.date })
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to delete attendance admin:", error);
        return NextResponse.json({ error: error.message || "Gagal menghapus absensi." }, { status: 500 });
    }
}
