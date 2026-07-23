import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, qcInspections, activityLogs, devicePassports } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWriteAccess, storeScope } from "@/lib/auth-guard";
import { qcInspectionSchema } from "@/lib/validators";
import { transitionDeviceStatus } from "@/lib/digital-passport";

export const dynamic = 'force-dynamic';

/**
 * Auto-calculate QC grade based on per-component checklist scores.
 * 
 * Grade A: All scores >= 90 (pristine condition)
 * Grade B: All scores >= 60, avg >= 75 (minor cosmetic issues, slight battery drop)
 * Grade C: Any score < 60 but none at 0 (functional defects present)
 * REJECT: Any critical component score = 0 (non-functional)
 */
function calculateGrade(scores: {
    screenScore: number;
    batteryHealth: number;
    keyboardScore: number;
    usbPortsScore: number;
    hingeScore: number;
    wifiScore: number;
    bodyScore: number;
}): 'A' | 'B' | 'C' | 'REJECT' {
    const all = [
        scores.screenScore,
        scores.batteryHealth,
        scores.keyboardScore,
        scores.usbPortsScore,
        scores.hingeScore,
        scores.wifiScore,
        scores.bodyScore,
    ];

    const min = Math.min(...all);
    const avg = all.reduce((a, b) => a + b, 0) / all.length;

    // REJECT: Any critical component completely dead
    if (min === 0) return 'REJECT';

    // Grade A: All >= 90, body cosmetics >= 90%
    if (min >= 90 && scores.bodyScore >= 90) return 'A';

    // Grade B: All functional (>= 60), overall average good (>= 75)
    if (min >= 60 && avg >= 75) return 'B';

    // Grade C: Has defects but nothing completely dead
    return 'C';
}

/**
 * Determine max selling price ceiling based on grade and cost price.
 */
function getMaxSellingPrice(grade: string, costPrice: number): number {
    switch (grade) {
        case 'A': return costPrice * 1.40; // Up to 40% margin
        case 'B': return costPrice * 1.25; // Up to 25% margin
        case 'C': return costPrice * 1.10; // Up to 10% margin
        case 'REJECT': return costPrice * 0.50; // Salvage value
        default: return costPrice;
    }
}

/**
 * Determine warranty days based on grade.
 */
function getWarrantyDays(grade: string): number {
    switch (grade) {
        case 'A': return 90;  // 3 months
        case 'B': return 30;  // 1 month
        case 'C': return 7;   // 1 week
        case 'REJECT': return 0; // No warranty
        default: return 0;
    }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        console.log("[QC POST API] received body:", body);
        
        // Use ID from params and body
        const parsed = qcInspectionSchema.parse({ ...body, inventoryId: id });
        console.log("[QC POST API] parsed success, inventoryId:", parsed.inventoryId, "grade:", parsed.grade);

        return await db.transaction(async (tx) => {
            // Verify inventory exists
            const [item] = await tx.select().from(inventory).where(
                and(eq(inventory.id, parsed.inventoryId), storeScope(authResult, inventory.storeId))
            );

            if (!item) {
                console.log("[QC POST API] inventory item not found in DB! ID:", parsed.inventoryId);
                return NextResponse.json({ error: "Inventory item not found" }, { status: 404 });
            }
            console.log("[QC POST API] item found:", item.itemName);

            // Auto-calculate grade from checklist scores
            const scores = {
                screenScore: parsed.screenScore,
                batteryHealth: parsed.batteryHealth,
                keyboardScore: parsed.keyboardScore,
                usbPortsScore: parsed.usbPortsScore,
                hingeScore: parsed.hingeScore,
                wifiScore: parsed.wifiScore,
                bodyScore: parsed.bodyScore,
            };

            const autoGrade = calculateGrade(scores);
            const finalGrade = parsed.grade || autoGrade; // Allow manual override

            const maxSellingPrice = getMaxSellingPrice(finalGrade, item.costPrice);
            const warrantyDays = getWarrantyDays(finalGrade);

            // Record QC Inspection with full checklist
            const [qcRecord] = await tx.insert(qcInspections).values({
                inventoryId: parsed.inventoryId,
                technicianId: parsed.technicianId,
                grade: finalGrade,
                screenScore: scores.screenScore,
                batteryHealth: scores.batteryHealth,
                batteryCycle: parsed.batteryCycle || 0,
                keyboardScore: scores.keyboardScore,
                usbPortsScore: scores.usbPortsScore,
                hingeScore: scores.hingeScore,
                wifiScore: scores.wifiScore,
                bodyScore: scores.bodyScore,
                // Component status checks
                touchpadStatus: parsed.touchpadStatus || 'NOT_TESTED',
                speakerStatus: parsed.speakerStatus || 'NOT_TESTED',
                micStatus: parsed.micStatus || 'NOT_TESTED',
                bluetoothStatus: parsed.bluetoothStatus || 'NOT_TESTED',
                webcamStatus: parsed.webcamStatus || 'NOT_TESTED',
                hdmiStatus: parsed.hdmiStatus || 'NOT_TESTED',
                chargingStatus: parsed.chargingStatus || 'NOT_TESTED',
                fingerprintStatus: parsed.fingerprintStatus || 'NOT_TESTED',
                maxSellingPrice,
                warrantyDays,
                notes: parsed.notes,
            }).returning();

            // Determine condition based on grade
            let newCondition = 'USED_B';
            switch (finalGrade) {
                case 'A': newCondition = 'USED_A'; break;
                case 'B': newCondition = 'USED_B'; break;
                case 'C': newCondition = 'USED_C'; break;
                case 'REJECT': newCondition = 'BROKEN'; break;
            }

            // Update inventory: set condition, cap selling price if exceeds max
            const updateData: Record<string, any> = { condition: newCondition };
            
            if (item.sellingPrice > maxSellingPrice || item.sellingPrice === 0) {
                updateData.sellingPrice = maxSellingPrice;
            }

            await tx.update(inventory)
                .set(updateData)
                .where(eq(inventory.id, parsed.inventoryId));

            // If this item was received under the "inbound QC required" flow, its device
            // passports are still parked at INBOUND_QC. Now that QC is done, release them:
            // a passing grade goes to READY_FOR_SALE, a REJECT is written off. Items that
            // never went through inbound QC simply have no INBOUND_QC passports here (no-op).
            const inboundPassports = await tx
                .select({ serialNumber: devicePassports.serialNumber })
                .from(devicePassports)
                .where(and(
                    eq(devicePassports.inventoryId, parsed.inventoryId),
                    eq(devicePassports.status, 'INBOUND_QC')
                ));
            const postQcStatus = finalGrade === 'REJECT' ? 'WRITTEN_OFF' : 'READY_FOR_SALE';
            for (const p of inboundPassports) {
                await transitionDeviceStatus(
                    item.storeId,
                    p.serialNumber,
                    postQcStatus,
                    authResult.user.id,
                    qcRecord.id,
                    `QC ${finalGrade}: released from inbound inspection`,
                    tx
                );
            }

            // Log activity
            await tx.insert(activityLogs).values({
                userId: authResult.user.id,
                userName: authResult.user.name || 'Unknown',
                action: 'QC_INSPECTION',
                entityType: 'INVENTORY',
                entityId: parsed.inventoryId,
                details: `QC Inspection completed. Auto-grade: ${autoGrade}, Final: ${finalGrade}. Condition: ${newCondition}. Max price: ${maxSellingPrice}. Warranty: ${warrantyDays} days.`,
            });

            return NextResponse.json({ 
                success: true, 
                qcInspection: qcRecord, 
                newCondition,
                autoGrade,
                finalGrade,
                maxSellingPrice,
                warrantyDays,
                scores,
            });
        });
    } catch (error: any) {
        console.error("QC Engine API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
