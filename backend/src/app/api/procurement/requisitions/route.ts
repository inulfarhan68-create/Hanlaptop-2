import { NextResponse } from "next/server";
import { db } from "@/db";
import { purchaseRequisitions, employees } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireAuth, storeScope, requireFeature, requireWritable } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("purchaseOrder");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        let conditions = [];
        const scope = storeScope(authResult, purchaseRequisitions.storeId);
        if (scope) conditions.push(scope);

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const data = await db.query.purchaseRequisitions.findMany({
            where: whereClause,
            orderBy: [desc(purchaseRequisitions.createdAt)],
            with: {
                requester: true,
                store: true
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch purchase requisitions:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat permintaan pembelian." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const demoBlock = requireWritable(authResult);
    if (demoBlock) return demoBlock;

    const featureCheck = await requireFeature("purchaseOrder");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const body = await request.json();
        const { itemName, quantity, estimatedCost, supplierName, notes } = body;

        if (!itemName || !quantity || !estimatedCost) {
            return NextResponse.json({ error: "Nama barang, jumlah, dan estimasi biaya wajib diisi." }, { status: 400 });
        }

        // Find employee mapping
        const employee = await db.query.employees.findFirst({
            where: eq(employees.userId, authResult.user.id)
        });

        if (!employee) {
            return NextResponse.json({ error: "Akun Anda belum terhubung dengan data karyawan untuk mengajukan pembelian." }, { status: 400 });
        }

        const result = await db.insert(purchaseRequisitions).values({
            id: crypto.randomUUID(),
            storeId: authResult.storeId === "all" ? employee.storeId : authResult.storeId,
            requesterId: employee.id,
            itemName,
            quantity: Number(quantity),
            estimatedCost: Number(estimatedCost),
            supplierName: supplierName || "",
            status: "PENDING",
            notes: notes || "",
            createdAt: new Date()
        }).returning();

        return NextResponse.json(result[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to create purchase requisition:", error);
        return NextResponse.json({ error: error.message || "Gagal mengajukan pembelian." }, { status: 500 });
    }
}
