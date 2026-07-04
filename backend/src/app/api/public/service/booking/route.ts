import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders } from "@/db/schema";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            storeId,
            customerName,
            customerPhone,
            customerAddress,
            deviceName,
            issue,
            estimatedCost,
            notes
        } = body;

        // Validation
        if (!customerName || !customerPhone || !deviceName || !issue) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Insert into service_orders as 'Diterima' (or we can use 'Diterima' as initial status for booking)
        const newBooking = await db.insert(serviceOrders).values({
            storeId: storeId || 'default',
            customerName,
            customerPhone,
            customerAddress: customerAddress || null,
            deviceName,
            issue,
            status: 'Diterima', // Initial status
            estimatedCost: Number(estimatedCost) || 0,
            finalCost: 0,
            notes: notes || "Booking diajukan melalui Landing Page.",
            receivedDate: new Date(),
            createdAt: new Date()
        }).returning();

        return NextResponse.json({ success: true, booking: newBooking[0] });
    } catch (error: any) {
        console.error("Failed to submit service booking:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
