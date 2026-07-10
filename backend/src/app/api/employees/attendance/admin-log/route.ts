import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, employees, activityLogs } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    // Verify Owner or Manager role
    const isOwnerOrManager = authResult.storeRole === "owner" || 
                             authResult.storeRole === "manager" || 
                             authResult.user.role === "owner" || 
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

        const employee = await db.query.employees.findFirst({
            where: eq(employees.id, employeeId)
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
                .where(eq(attendances.id, id))
                .returning();
                
            // Log activity
            await db.insert(activityLogs).values({
                storeId: authResult.storeId === "all" ? employee.storeId : authResult.storeId,
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
                storeId: authResult.storeId === "all" ? employee.storeId : authResult.storeId,
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

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    const isOwnerOrManager = authResult.storeRole === "owner" || 
                             authResult.storeRole === "manager" || 
                             authResult.user.role === "owner" || 
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

        const existing = await db.query.attendances.findFirst({
            where: eq(attendances.id, id),
            with: { employee: true }
        });

        if (!existing) {
            return NextResponse.json({ error: "Catatan absensi tidak ditemukan." }, { status: 404 });
        }

        await db.delete(attendances).where(eq(attendances.id, id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId === "all" ? existing.storeId : authResult.storeId,
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
