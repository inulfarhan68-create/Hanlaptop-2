import { NextResponse } from "next/server";
import { db } from "@/db";
import { employees, technicianCommissions, employeeLoans, attendances } from "@/db/schema";
import { and, eq, like, ne } from "drizzle-orm";
import { requireOwnerOrManager } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const period = searchParams.get("period"); // YYYY-MM

    if (!employeeId || !period) {
        return NextResponse.json({ error: "employeeId dan period (YYYY-MM) wajib disertakan." }, { status: 400 });
    }

    try {
        // 1. Fetch employee
        const employee = await db.query.employees.findFirst({
            where: and(
                eq(employees.id, employeeId),
                authResult.storeId !== "all" ? eq(employees.storeId, authResult.storeId) : undefined
            )
        });

        if (!employee) {
            return NextResponse.json({ error: "Karyawan tidak ditemukan." }, { status: 404 });
        }

        // 2. Fetch Unpaid Commissions if technician is linked
        let totalCommissions = 0;
        if (employee.technicianId) {
            const unpaidCommissions = await db.query.technicianCommissions.findMany({
                where: and(
                    eq(technicianCommissions.technicianId, employee.technicianId),
                    eq(technicianCommissions.status, "UNPAID")
                )
            });
            totalCommissions = unpaidCommissions.reduce((sum, item) => sum + (item.commissionAmount || 0), 0);
        }

        // 3. Fetch Unpaid/Outstanding Loans (Kasbon)
        const unpaidLoans = await db.query.employeeLoans.findMany({
            where: and(
                eq(employeeLoans.employeeId, employee.id),
                ne(employeeLoans.status, "PAID")
            )
        });
        const outstandingLoans = unpaidLoans.reduce((sum, item) => sum + ((item.amount || 0) - (item.paidAmount || 0)), 0);

        // 4. Fetch Attendances in Period
        const attendanceLogs = await db.query.attendances.findMany({
            where: and(
                eq(attendances.employeeId, employee.id),
                like(attendances.date, `${period}-%`)
            )
        });
        const hadirDays = attendanceLogs.filter(a => a.status === "HADIR").length;
        const sakitDays = attendanceLogs.filter(a => a.status === "SAKIT").length;
        const izinDays = attendanceLogs.filter(a => a.status === "IZIN").length;
        const alfaDays = attendanceLogs.filter(a => a.status === "ALFA").length;

        return NextResponse.json({
            employeeId: employee.id,
            employeeName: employee.name,
            period,
            basicSalary: employee.basicSalary || 0,
            allowance: employee.allowance || 0,
            commissions: totalCommissions,
            suggestedDeduction: outstandingLoans, // Suggested deduction is the entire kasbon
            unpaidLoans: outstandingLoans, // Frontend compatibility
            hadirDays,
            sakitDays,
            izinDays,
            alfaDays,
            totalWorkDays: hadirDays + sakitDays + izinDays + alfaDays
        });
    } catch (error: any) {
        console.error("Failed to calculate payroll:", error);
        return NextResponse.json({ error: error.message || "Gagal mengkalkulasi gaji." }, { status: 500 });
    }
}
