import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, employees } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { date, photo, location } = body;

        if (!date) {
            return NextResponse.json({ error: "Tanggal lokal diperlukan." }, { status: 400 });
        }

        // Find employee mapping
        const employee = await db.query.employees.findFirst({
            where: eq(employees.userId, authResult.user.id)
        });

        if (!employee) {
            return NextResponse.json({ error: "Akun Anda belum terhubung dengan data karyawan." }, { status: 400 });
        }

        // Find existing clock in record for today
        const existing = await db.query.attendances.findFirst({
            where: and(
                eq(attendances.employeeId, employee.id),
                eq(attendances.date, date)
            )
        });

        if (!existing) {
            return NextResponse.json({ error: "Data absensi masuk (Clock In) tidak ditemukan untuk hari ini." }, { status: 400 });
        }

        if (existing.clockOut) {
            return NextResponse.json({ error: "Anda sudah melakukan Clock Out hari ini." }, { status: 400 });
        }

        const result = await db.update(attendances)
            .set({
                clockOut: new Date(),
                photoOut: photo || null,
                locationOut: location || null
            })
            .where(eq(attendances.id, existing.id))
            .returning();

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to Clock Out:", error);
        return NextResponse.json({ error: error.message || "Gagal memproses Clock Out." }, { status: 500 });
    }
}
