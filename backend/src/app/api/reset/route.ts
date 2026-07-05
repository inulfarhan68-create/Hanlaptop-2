import { NextResponse } from "next/server";
import { db } from "@/db";
import {
    transactions,
    transactionItems,
    journalEntries,
    inventory,
    customers,
    suppliers,
    technicians,
    technicianCommissions,
    cashierShifts,
    activityLogs,
    serviceOrders,
    stockOpnames,
    stockOpnameItems,
    stockTransfers,
    stockTransferItems,
    employees,
    employeeLoans,
    payrolls,
    attendances,
    purchaseRequisitions,
    membershipPoints,
    crmReminders,
    bankMutations,
    qcInspections,
    warrantyClaims,
    warrantyClaimParts,
    consignmentPayables,
    storeSettings,
} from "@/db/schema";
import { requireOwnerOnly } from "@/lib/auth-guard";
import { resetDbSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
    // ── Security: Block in production ──
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
        return NextResponse.json(
            { error: "Endpoint ini dinonaktifkan di lingkungan production demi keamanan data." },
            { status: 403 }
        );
    }

    const rateLimitResponse = await checkRateLimit(request, 5, 60_000); // Very strict: 5 per minute
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwnerOnly();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const parsed = resetDbSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid confirmation string", details: parsed.error.format() }, { status: 400 });
        }

        // Delete in correct FK dependency order
        // Child tables first, then parent tables

        // Warranty
        await db.delete(warrantyClaimParts);
        await db.delete(warrantyClaims);

        // Stock operations
        await db.delete(stockOpnameItems);
        await db.delete(stockOpnames);
        await db.delete(stockTransferItems);
        await db.delete(stockTransfers);

        // QC & Consignment
        await db.delete(qcInspections);
        await db.delete(consignmentPayables);

        // Procurement
        await db.delete(purchaseRequisitions);

        // Finance
        await db.delete(bankMutations);
        await db.delete(journalEntries);

        // Transactions
        await db.delete(transactionItems);
        await db.delete(transactions);

        // Service
        await db.delete(serviceOrders);

        // Inventory
        await db.delete(inventory);

        // Payroll & HR
        await db.delete(attendances);
        await db.delete(payrolls);
        await db.delete(employeeLoans);
        await db.delete(employees);

        // Commissions & shifts
        await db.delete(technicianCommissions);
        await db.delete(cashierShifts);

        // CRM
        await db.delete(membershipPoints);
        await db.delete(crmReminders);

        // Activity logs
        await db.delete(activityLogs);

        // Master data
        await db.delete(customers);
        await db.delete(suppliers);
        await db.delete(technicians);

        // Store settings (logo, templates, etc.) - reset to blank
        await db.delete(storeSettings);

        return NextResponse.json({ message: "Database successfully reset. All operational data cleared." }, { status: 200 });
    } catch (error: any) {
        console.error("Failed to reset database:", error);
        return NextResponse.json({ error: error.message || "Failed to reset database" }, { status: 500 });
    }
}
