import { NextResponse } from 'next/server';
import { db } from '@/db';
import { employees, activityLogs, user, technicians } from '@/db/schema';
import { requireReportAccess, requireOwnerOrManager } from '@/lib/auth-guard';
import { employeeSchema } from '@/lib/validators';
import { eq, and, desc } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let conditions = [];
        if (authResult.storeId !== "all") {
            conditions.push(eq(employees.storeId, authResult.storeId));
        }

        const list = await db.query.employees.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            orderBy: [desc(employees.createdAt)],
            with: {
                user: true,
                technician: true,
                store: true
            }
        });

        return NextResponse.json(list);
    } catch (error) {
        console.error("Failed to fetch employees:", error);
        return NextResponse.json({ error: "Failed to fetch employees" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const parsed = employeeSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { name, phone, email, role, userId, technicianId, basicSalary, allowance, isActive } = parsed.data;

        let targetStoreId = authResult.storeId;
        if (authResult.storeId === "all") {
            if (!body.storeId) {
                return NextResponse.json({ error: "Cabang wajib dipilih jika berada di Semua Cabang" }, { status: 400 });
            }
            targetStoreId = body.storeId;
        }

        // Prevent duplicate mapping if userId or technicianId is provided
        if (userId) {
            const existingUser = await db.query.employees.findFirst({
                where: and(
                    eq(employees.storeId, targetStoreId),
                    eq(employees.userId, userId)
                )
            });
            if (existingUser) {
                return NextResponse.json({ error: "Akun User ini sudah dihubungkan ke karyawan lain" }, { status: 400 });
            }
        }
        if (technicianId) {
            const existingTech = await db.query.employees.findFirst({
                where: and(
                    eq(employees.storeId, targetStoreId),
                    eq(employees.technicianId, technicianId)
                )
            });
            if (existingTech) {
                return NextResponse.json({ error: "Teknisi ini sudah dihubungkan ke karyawan lain" }, { status: 400 });
            }
        }

        const [newEmployee] = await db.insert(employees).values({
            storeId: targetStoreId,
            name,
            phone: phone || null,
            email: email || null,
            role,
            userId: userId || null,
            technicianId: technicianId || null,
            basicSalary,
            allowance,
            isActive: isActive ?? true,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: targetStoreId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_EMPLOYEE",
            entityType: "employees",
            entityId: newEmployee.id,
            details: JSON.stringify({ name: newEmployee.name, role: newEmployee.role })
        });

        return NextResponse.json(newEmployee, { status: 201 });
    } catch (error) {
        console.error("Failed to create employee:", error);
        return NextResponse.json({ error: "Failed to create employee" }, { status: 500 });
    }
}
