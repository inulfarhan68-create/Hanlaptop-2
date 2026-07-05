import { db } from "@/db";
import { devicePassports, deviceLifecycleLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export type PassportStatus = 'PROCURED' | 'INBOUND_QC' | 'READY_FOR_SALE' | 'RESERVED' | 'SOLD' | 'UNDER_SERVICE' | 'TRADED_IN' | 'WRITTEN_OFF';

export async function transitionDeviceStatus(
    storeId: string,
    serialNumber: string,
    newStatus: PassportStatus,
    actorId?: string,
    referenceId?: string,
    notes?: string,
    txClient?: any // Optional transaction client
) {
    const client = txClient || db;
    
    // 1. Find the passport
    const passport = await client.query.devicePassports.findFirst({
        where: and(
            eq(devicePassports.serialNumber, serialNumber),
            eq(devicePassports.storeId, storeId)
        )
    });

    if (!passport) {
        throw new Error(`Device Passport for SN ${serialNumber} not found.`);
    }

    if (passport.status === newStatus) {
        return passport; // No change needed
    }

    // 2. Update passport
    const updateData: any = {
        status: newStatus,
        updatedAt: new Date()
    };

    if (newStatus === 'SOLD' || newStatus === 'RESERVED') {
        updateData.currentTransactionId = referenceId;
    } else if (newStatus === 'READY_FOR_SALE') {
        updateData.currentTransactionId = null;
    }

    const [updated] = await client.update(devicePassports)
        .set(updateData)
        .where(eq(devicePassports.id, passport.id))
        .returning();

    // 3. Log lifecycle transition
    await client.insert(deviceLifecycleLogs).values({
        passportId: passport.id,
        fromStatus: passport.status,
        toStatus: newStatus,
        actorId: actorId || null,
        referenceId: referenceId || null,
        notes: notes || null
    });

    return updated;
}

export async function registerDevicePassport(
    storeId: string,
    inventoryId: string,
    serialNumber: string,
    initialStatus: PassportStatus = 'READY_FOR_SALE',
    originalCost: number = 0,
    actorId?: string
) {
    // Check if already exists
    const existing = await db.query.devicePassports.findFirst({
        where: and(
            eq(devicePassports.serialNumber, serialNumber),
            eq(devicePassports.storeId, storeId)
        )
    });

    if (existing) {
        throw new Error(`Device Passport for SN ${serialNumber} already exists.`);
    }

    const [passport] = await db.insert(devicePassports).values({
        storeId,
        inventoryId,
        serialNumber,
        status: initialStatus,
        originalCost,
    }).returning();

    await db.insert(deviceLifecycleLogs).values({
        passportId: passport.id,
        toStatus: initialStatus,
        actorId: actorId || null,
        notes: "Initial registration"
    });

    return passport;
}
