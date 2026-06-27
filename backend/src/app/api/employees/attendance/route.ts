import { NextResponse } from "next/server";
import { db } from "@/db";
import { attendances, employees } from "@/db/schema";
import { and, eq, like, desc } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period"); // YYYY-MM
        const employeeId = searchParams.get("employeeId");
        
        const isOwnerOrManager = authResult.storeRole === "owner" || 
                                 authResult.storeRole === "manager" || 
                                 (authResult.user as any).role === "owner" || 
                                 (authResult.user as any).role === "manager";

        // Find employee record mapped to this user
        const currentEmployee = await db.query.employees.findFirst({
            where: eq(employees.userId, authResult.user.id)
        });
        if (!isOwnerOrManager && !currentEmployee) {
            return NextResponse.json({ error: "Akun Anda belum terhubung dengan data karyawan." }, { status: 400 });
        }

        // Build where conditions
        let conditions = [];
        
        // 1. Filter by store
        if (authResult.storeId !== "all") {
            conditions.push(eq(attendances.storeId, authResult.storeId));
        }

        // 2. Filter by employee (privacy/role check)
        if (!isOwnerOrManager && currentEmployee) {
            conditions.push(eq(attendances.employeeId, currentEmployee.id));
        } else if (employeeId) {
            conditions.push(eq(attendances.employeeId, employeeId));
        }

        // 3. Filter by period (YYYY-MM)
        if (period) {
            conditions.push(like(attendances.date, `${period}-%`));
        }

        // Assemble conditions
        const whereClause = conditions.length > 0 
            ? and(...conditions) 
            : undefined;

        const data = await db.query.attendances.findMany({
            where: whereClause,
            orderBy: [desc(attendances.date), desc(attendances.clockIn)],
            with: {
                employee: true
            }
        });

        return NextResponse.json({
            attendances: data,
            employee: currentEmployee
        });
    } catch (error: any) {
        console.error("Failed to fetch attendances:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat absensi." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { date, photo, location, notes } = body;

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

        if (!employee.isActive) {
            return NextResponse.json({ error: "Status karyawan Anda dinonaktifkan." }, { status: 403 });
        }

        // Check if already clocked-in for this date
        const existing = await db.query.attendances.findFirst({
            where: and(
                eq(attendances.employeeId, employee.id),
                eq(attendances.date, date)
            )
        });

        if (existing) {
            return NextResponse.json({ error: `Anda sudah melakukan absensi masuk (Clock In) pada tanggal ${date}.` }, { status: 400 });
        }

        const id = crypto.randomUUID();
        const result = await db.insert(attendances).values({
            id,
            storeId: employee.storeId,
            employeeId: employee.id,
            date,
            clockIn: new Date(),
            status: "HADIR",
            photoIn: photo || null,
            locationIn: location || null,
            notes: notes || "",
            createdAt: new Date()
        }).returning();

        return NextResponse.json(result[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to Clock In:", error);
        return NextResponse.json({ error: error.message || "Gagal memproses Clock In." }, { status: 500 });
    }
}
