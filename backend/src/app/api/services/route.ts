import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders, activityLogs } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import crypto from "crypto";
import { requireAuth, requireWriteAccess, requirePermission } from "@/lib/auth-guard";
import { Permissions } from "@/lib/permissions";
import { serviceOrderSchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requirePermission(Permissions.SERVICE_READ);
    if (authResult instanceof NextResponse) return authResult;

    try {
        const storeCond = authResult.storeId !== "all" ? eq(serviceOrders.storeId, authResult.storeId) : undefined;
        
        const data = await db.query.serviceOrders.findMany({
            where: storeCond,
            orderBy: [desc(serviceOrders.receivedDate)],
            with: {
                customer: true,
                technician: true
            }
        });
        return NextResponse.json(data);
    } catch (error) {
        console.error("Failed to fetch service orders:", error);
        return NextResponse.json({ error: "Failed to fetch service orders" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requirePermission(Permissions.SERVICE_CREATE);
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Please select a specific branch to create a service order" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const parsed = serviceOrderSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { 
            customerId, 
            customerName, 
            customerPhone, 
            customerAddress,
            deviceName, 
            issue, 
            estimatedCost, 
            technicianName,
            technicianId,
            notes,
            warrantyClaimed,
            originalTransactionId,
        } = parsed.data;

        const id = crypto.randomUUID();
        
        const result = await db.insert(serviceOrders).values({
            id,
            storeId: authResult.storeId,
            customerId: customerId || null,
            customerName,
            customerPhone: customerPhone || "",
            customerAddress: customerAddress || "",
            deviceName,
            issue,
            status: "Diterima",
            technicianName: technicianName || "",
            technicianId: technicianId || null,
            estimatedCost: estimatedCost || 0,
            finalCost: 0,
            receivedDate: new Date(),
            notes: notes || "",
            warrantyClaimed: warrantyClaimed ?? false,
            originalTransactionId: originalTransactionId || null,
        }).returning();

        // Log activity
        await db.insert(activityLogs).values({
            storeId: authResult.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "CREATE_SERVICE",
            entityType: "service_orders",
            entityId: id,
            details: JSON.stringify({ deviceName, issue })
        });

        return NextResponse.json(result[0], { status: 201 });
    } catch (error: any) {
        console.error("Failed to create service order:", error);
        return NextResponse.json({ error: error.message || "Failed to create service order" }, { status: 500 });
    }
}
