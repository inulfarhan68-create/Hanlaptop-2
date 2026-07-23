import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceRefurbishments, devicePassports, deviceLifecycleLogs, inventory, journalEntries } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import { ACCOUNT_CODES } from "@/constants/accounting";

export const dynamic = 'force-dynamic';

// Valid activity types
const VALID_ACTIVITY_TYPES = [
    'CLEANING',
    'REPASTA',
    'UPGRADE_RAM',
    'UPGRADE_SSD',
    'REPLACE_COMPONENT',
    'OTHER'
] as const;

type ActivityType = typeof VALID_ACTIVITY_TYPES[number];

// POST /api/inventory/passports/[id]/refurbish
// Record a refurbishment activity for a device
// Can optionally deduct sparepart inventory and create journal entry for expense
export async function POST(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    // Require owner or manager role for refurbishment records
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;
        const body = await request.json();

        const {
            activityType,
            description,
            cost = 0,
            componentReplaced,
            oldSpec,
            newSpec,
            notes,
            technicianId,
            // Optional: sparepart inventory deduction
            sparepartInventoryId,
            sparepartQty = 1,
            // Optional: create journal entry for expense
            createJournalEntry = true
        } = body;

        // Validate required fields
        if (!activityType || !description) {
            return NextResponse.json(
                { error: "activityType and description are required" },
                { status: 400 }
            );
        }

        // Validate activity type
        if (!VALID_ACTIVITY_TYPES.includes(activityType)) {
            return NextResponse.json(
                { error: `Invalid activityType. Must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}` },
                { status: 400 }
            );
        }

        // Verify passport exists
        const passport = await db.query.devicePassports.findFirst({
            where: and(
                eq(devicePassports.id, id),
                storeScope(authResult, devicePassports.storeId)
            )
        });

        if (!passport) {
            return NextResponse.json(
                { error: "Device passport not found" },
                { status: 404 }
            );
        }

        // Start transaction
        return await db.transaction(async (tx) => {
            // 1. Deduct sparepart inventory if specified
            let sparepartUsed = null;
            if (sparepartInventoryId && sparepartQty > 0) {
                const sparepart = await tx.query.inventory.findFirst({
                    where: eq(inventory.id, sparepartInventoryId)
                });

                if (!sparepart) {
                    throw new Error("Sparepart inventory not found");
                }

                if (sparepart.quantity < sparepartQty) {
                    throw new Error(`Insufficient stock for sparepart: ${sparepart.itemName}. Available: ${sparepart.quantity}`);
                }

                // Deduct sparepart
                await tx.update(inventory)
                    .set({ quantity: sparepart.quantity - sparepartQty })
                    .where(eq(inventory.id, sparepartInventoryId));

                sparepartUsed = {
                    inventoryId: sparepartInventoryId,
                    name: sparepart.itemName,
                    qty: sparepartQty,
                    unitCost: sparepart.costPrice
                };
            }

            // 2. Create refurbishment record
            const [refurbishment] = await tx.insert(deviceRefurbishments).values({
                passportId: id,
                storeId: passport.storeId,
                technicianId: technicianId || null,
                activityType: activityType as string,
                description,
                cost: cost || 0,
                componentReplaced: componentReplaced || null,
                oldSpec: oldSpec || null,
                newSpec: newSpec || null,
                notes: notes || null
            }).returning();

            // 3. Create lifecycle log entry
            const activityLabels: Record<string, string> = {
                'CLEANING': 'Deep Cleaning',
                'REPASTA': 'Thermal Repasta',
                'UPGRADE_RAM': 'RAM Upgrade',
                'UPGRADE_SSD': 'SSD Upgrade',
                'REPLACE_COMPONENT': 'Component Replacement',
                'OTHER': 'Other Service'
            };

            const logNotes = `${activityLabels[activityType]}: ${description}${cost ? ` (Biaya: Rp ${cost.toLocaleString('id-ID')})` : ''}${sparepartUsed ? ` [Sparepart: ${sparepartUsed.name} x${sparepartUsed.qty}]` : ''}`;

            await tx.insert(deviceLifecycleLogs).values({
                passportId: id,
                fromStatus: passport.status,
                toStatus: passport.status, // Status doesn't change on refurbishment
                actorId: authResult.user?.id || null,
                referenceId: refurbishment.id,
                notes: logNotes
            });

            // 4. Create journal entries for expense if cost > 0 and flag is true
            let journalEntriesCreated = null;
            if (createJournalEntry && cost > 0) {
                const journalEntriesToCreate = [];

                // Debit: Beban Perbaikan/Service
                journalEntriesToCreate.push({
                    storeId: passport.storeId,
                    transactionId: refurbishment.id,
                    accountCode: ACCOUNT_CODES.BEBAN_PERBAIKAN, // Beban Perbaikan
                    accountName: "Beban Perbaikan & Perawatan",
                    debit: cost,
                    credit: 0,
                    notes: `${activityLabels[activityType]}: ${description}`
                });

                // Credit: Persediaan Sparepart (if sparepart used) or Kas
                journalEntriesToCreate.push({
                    storeId: passport.storeId,
                    transactionId: refurbishment.id,
                    accountCode: sparepartUsed ? ACCOUNT_CODES.PERSEDIAAN_SPAREPART : ACCOUNT_CODES.KAS, // Persediaan Sparepart or Kas
                    accountName: sparepartUsed ? "Persediaan Sparepart" : "Kas",
                    debit: 0,
                    credit: cost,
                    notes: sparepartUsed
                        ? `Sparepart: ${sparepartUsed.name} x${sparepartUsed.qty}`
                        : `Biaya ${activityLabels[activityType]}`
                });

                journalEntriesCreated = await tx.insert(journalEntries).values(journalEntriesToCreate).returning();
            }

            return NextResponse.json({
                success: true,
                refurbishment,
                sparepartUsed,
                journalEntry: journalEntriesCreated?.[0] || null,
                message: sparepartUsed
                    ? `Refurbishment recorded. Sparepart ${sparepartUsed.name} deducted.`
                    : "Refurbishment activity recorded successfully"
            });
        });

    } catch (error: any) {
        console.error("Failed to record refurbishment:", error);
        return NextResponse.json(
            { error: error.message || "Failed to record refurbishment" },
            { status: 500 }
        );
    }
}

// GET /api/inventory/passports/[id]/refurbish
// Get all refurbishment records for a device
export async function GET(
    request: Request,
    context: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;

        // Verify passport exists
        const passport = await db.query.devicePassports.findFirst({
            where: and(
                eq(devicePassports.id, id),
                storeScope(authResult, devicePassports.storeId)
            )
        });

        if (!passport) {
            return NextResponse.json(
                { error: "Device passport not found" },
                { status: 404 }
            );
        }

        // Get refurbishment records
        const refurbishments = await db.query.deviceRefurbishments.findMany({
            where: eq(deviceRefurbishments.passportId, id),
            with: {
                technician: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [desc(deviceRefurbishments.createdAt)]
        });

        // Calculate total upgrade cost
        const totalCost = refurbishments.reduce((sum, r) => sum + (r.cost || 0), 0);

        return NextResponse.json({
            passportId: id,
            serialNumber: passport.serialNumber,
            refurbishments,
            summary: {
                totalActivities: refurbishments.length,
                totalCost,
                byType: refurbishments.reduce((acc, r) => {
                    acc[r.activityType] = (acc[r.activityType] || 0) + 1;
                    return acc;
                }, {} as Record<string, number>)
            }
        });

    } catch (error: any) {
        console.error("Failed to get refurbishments:", error);
        return NextResponse.json(
            { error: error.message || "Failed to get refurbishments" },
            { status: 500 }
        );
    }
}
