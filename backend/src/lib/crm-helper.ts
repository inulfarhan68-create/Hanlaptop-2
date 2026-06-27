import { db } from "@/db";
import { membershipPoints, crmReminders } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function awardPoints(tx: any, customerId: string, amount: number, invoiceNumber: string) {
    if (!customerId) return;
    const earned = Math.floor(amount / 10000); // 1 point per Rp 10.000 spent
    if (earned <= 0) return;

    const existing = await tx.query.membershipPoints.findFirst({
        where: eq(membershipPoints.customerId, customerId)
    });

    const historyEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        points: earned,
        description: `Poin dari transaksi ${invoiceNumber || ""}`
    };

    if (existing) {
        const history = JSON.parse(existing.history || "[]");
        history.push(historyEntry);
        await tx.update(membershipPoints)
            .set({
                points: Number(existing.points) + earned,
                history: JSON.stringify(history),
                updatedAt: new Date()
            })
            .where(eq(membershipPoints.id, existing.id));
    } else {
        await tx.insert(membershipPoints).values({
            id: crypto.randomUUID(),
            customerId,
            points: earned,
            history: JSON.stringify([historyEntry]),
            createdAt: new Date(),
            updatedAt: new Date()
        });
    }
}

export async function scheduleServiceReminder(tx: any, storeId: string, customerId: string, customerPhone: string, deviceName: string) {
    if (!customerId) return;

    // Calculate scheduled date (6 months from now)
    const future = new Date();
    future.setMonth(future.getMonth() + 6);
    const scheduledDate = future.toISOString().split("T")[0]; // YYYY-MM-DD

    await tx.insert(crmReminders).values({
        id: crypto.randomUUID(),
        storeId,
        customerId,
        customerPhone: customerPhone || null,
        type: "SERVICE_MAINTENANCE_6M",
        scheduledDate,
        status: "PENDING",
        createdAt: new Date()
    });
}
