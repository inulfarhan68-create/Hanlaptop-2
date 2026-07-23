import { NextResponse } from "next/server";
import { db } from "@/db";
import { warrantyClaims, warrantyClaimParts, inventory, journalEntries, activityLogs, serviceOrders, customers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireWriteAccess, storeScope } from "@/lib/auth-guard";
import { warrantyResolutionSchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

/**
 * Helper: Verify warranty claim belongs to user's store (SaaS Tenant Isolation)
 */
async function verifyWarrantyClaimAccess(authResult: any, claimId: string) {
    // 🔒 Tenant-safe: storeScope handles platform_admin (no filter) vs tenant (inArray).
    // Always returns 404 to prevent enumeration attacks.
    const claim = await db.query.warrantyClaims.findFirst({
        where: and(
            eq(warrantyClaims.id, claimId),
            storeScope(authResult, warrantyClaims.storeId)
        )
    });

    if (!claim) {
        return {
            claim: null,
            authorized: false,
            response: NextResponse.json({ error: "Warranty claim not found" }, { status: 404 })
        };
    }

    return { claim, authorized: true };
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    // 🔒 SaaS Tenant Isolation: Verify warranty claim belongs to user's store
    const { claim: existingClaim, authorized, response } = await verifyWarrantyClaimAccess(authResult, id);
    if (!authorized) return response;

    try {
        const body = await request.json();
        const parsed = warrantyResolutionSchema.parse(body);

        return await db.transaction(async (tx) => {
            // Re-fetch with storeId check inside transaction
            const [claim] = await tx.select().from(warrantyClaims).where(and(
                eq(warrantyClaims.id, id),
                // 🔒 Double-check storeId
                storeScope(authResult, warrantyClaims.storeId)
            ));
            if (!claim) {
                return NextResponse.json({ error: "Warranty claim not found or access denied" }, { status: 404 });
            }

            let serviceOrderId = claim.serviceOrderId;

            // When transitioning to INSPECTING, auto-create a linked service order
            if (parsed.status === 'INSPECTING' && !claim.serviceOrderId) {
                // Fetch customer info
                const [customer] = await tx.select().from(customers).where(eq(customers.id, claim.customerId));

                const [newSO] = await tx.insert(serviceOrders).values({
                    storeId: claim.storeId,
                    customerId: claim.customerId,
                    customerName: customer?.name || 'Unknown',
                    customerPhone: customer?.phone || '',
                    deviceName: `Warranty Claim - ${claim.issueDescription.substring(0, 50)}`,
                    issue: claim.issueDescription,
                    status: 'Dikerjakan',
                    technicianId: parsed.technicianId || claim.technicianId || null,
                    technicianName: null,
                    warrantyClaimed: true,
                    originalTransactionId: claim.transactionId,
                    notes: `Auto-created from Warranty Claim #${claim.id.substring(0, 8)}`,
                }).returning();

                serviceOrderId = newSO.id;
            }

            // If resolving (COMPLETED), handle parts usage and journaling
            if (parsed.status === 'COMPLETED' && parsed.partsUsed && parsed.partsUsed.length > 0) {
                let totalPartCost = 0;

                for (const part of parsed.partsUsed) {
                    // Check inventory - with storeId check
                    const [invItem] = await tx.select().from(inventory).where(and(
                        eq(inventory.id, part.inventoryId),
                        storeScope(authResult, inventory.storeId)
                    ));
                    if (!invItem || invItem.quantity < part.quantity) {
                        throw new Error(`Insufficient stock for part ID: ${part.inventoryId}`);
                    }

                    totalPartCost += (part.costPrice * part.quantity);

                    // Deduct stock
                    await tx.update(inventory)
                        .set({ quantity: invItem.quantity - part.quantity })
                        .where(eq(inventory.id, part.inventoryId));

                    // Record part usage
                    await tx.insert(warrantyClaimParts).values({
                        claimId: claim.id,
                        inventoryId: part.inventoryId,
                        quantity: part.quantity,
                        costPrice: part.costPrice,
                    });
                }

                if (totalPartCost > 0) {
                    // PRD: Biaya sparepart garansi DILARANG masuk HPP Penjualan
                    // Journal: Debit Biaya Klaim Garansi, Kredit Persediaan Sparepart
                    await tx.insert(journalEntries).values([
                        {
                            storeId: claim.storeId,
                            transactionId: claim.transactionId,
                            accountName: 'Biaya Klaim Garansi',
                            debit: totalPartCost,
                            credit: 0
                        },
                        {
                            storeId: claim.storeId,
                            transactionId: claim.transactionId,
                            accountName: 'Persediaan Sparepart',
                            debit: 0,
                            credit: totalPartCost
                        }
                    ]);
                }
            }

            // Update claim status
            const updateData: Record<string, any> = {
                status: parsed.status,
                resolutionNotes: parsed.resolutionNotes,
                updatedAt: new Date(),
            };

            if (parsed.technicianId) {
                updateData.technicianId = parsed.technicianId;
            }

            if (serviceOrderId && !claim.serviceOrderId) {
                updateData.serviceOrderId = serviceOrderId;
            }

            const [updatedClaim] = await tx.update(warrantyClaims)
                .set(updateData)
                .where(eq(warrantyClaims.id, claim.id))
                .returning();

            // Log activity
            await tx.insert(activityLogs).values({
                storeId: claim.storeId,
                userId: authResult.user.id,
                userName: authResult.user.name || 'Unknown',
                action: 'UPDATE_WARRANTY_CLAIM',
                entityType: 'WARRANTY_CLAIM',
                entityId: claim.id,
                details: `Warranty claim status: ${claim.status} → ${parsed.status}${serviceOrderId && !claim.serviceOrderId ? '. Auto-created service order.' : ''}`,
            });

            return NextResponse.json({ success: true, claim: updatedClaim, serviceOrderId });
        });
    } catch (error: any) {
        console.error("Update Warranty Claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
