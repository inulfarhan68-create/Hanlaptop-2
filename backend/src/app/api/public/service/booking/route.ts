import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders } from "@/db/schema";
import { checkRateLimit } from "@/lib/rate-limit";
import { publicServiceBookingSchema } from "@/lib/validators";
import { resolvePublicStore } from "@/lib/public/submission";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    // Unauthenticated, and it writes into a shop's live service queue — throttle
    // before doing anything else. Without this anyone could flood a competitor's
    // queue with fake bookings; store ids are public, since getPublicCatalog
    // returns them. A booking is a human filling in a form, so 5/minute per IP is
    // generous.
    const rateLimited = await checkRateLimit(request, 5, 60_000);
    if (rateLimited) return rateLimited;

    try {
        const parsed = publicServiceBookingSchema.safeParse(await request.json());
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Data booking tidak lengkap", details: parsed.error.format() },
                { status: 400 }
            );
        }
        const {
            storeId, customerName, customerPhone, customerAddress,
            deviceName, issue, estimatedCost, notes,
        } = parsed.data;

        const store = await resolvePublicStore(storeId);
        if (!store) {
            return NextResponse.json({ error: "Toko tujuan tidak ditemukan" }, { status: 404 });
        }

        const [booking] = await db.insert(serviceOrders).values({
            storeId: store.id,
            customerName,
            customerPhone,
            customerAddress: customerAddress || null,
            deviceName,
            issue,
            status: 'Diterima', // Initial status
            estimatedCost,
            finalCost: 0,
            notes: notes || "Booking diajukan melalui Landing Page.",
            receivedDate: new Date(),
            createdAt: new Date()
        }).returning();

        return NextResponse.json({ success: true, booking });
    } catch (error: any) {
        console.error("Failed to submit service booking:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
