import { NextResponse } from "next/server";
import { db } from "@/db";
import {
    devicePassports,
    deviceLifecycleLogs,
    deviceRefurbishments,
    qcInspections,
    warrantyClaims,
    transactions,
    transactionItems,
    inventory
} from "@/db/schema";
import { eq, and, desc, asc } from "drizzle-orm";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

// GET /api/inventory/passports/[id]/lifecycle
// Returns comprehensive timeline of a device's entire lifecycle
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { id } = await context.params;

        // Get the device passport with all related data
        const passport = await db.query.devicePassports.findFirst({
            where: and(
                eq(devicePassports.id, id),
                storeScope(authResult, devicePassports.storeId)
            ),
            with: {
                inventory: {
                    columns: {
                        itemName: true,
                        category: true,
                        specs: true,
                        imageUrl: true
                    }
                },
                currentTransaction: {
                    columns: {
                        id: true,
                        invoiceNumber: true,
                        transactionType: true,
                        amount: true,
                        createdAt: true
                    },
                    with: {
                        customer: {
                            columns: {
                                id: true,
                                name: true,
                                phone: true
                            }
                        }
                    }
                }
            }
        });

        if (!passport) {
            return NextResponse.json({ error: "Device passport not found" }, { status: 404 });
        }

        // Get all QC inspections for this passport
        const qcHistory = await db.query.qcInspections.findMany({
            where: eq(qcInspections.passportId, id),
            with: {
                technician: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [desc(qcInspections.createdAt)]
        });

        // Get all refurbishments for this passport
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

        // Get warranty claims linked to this passport
        const warrantyHistory = await db.query.warrantyClaims.findMany({
            where: eq(warrantyClaims.passportId, id),
            with: {
                customer: {
                    columns: {
                        id: true,
                        name: true,
                        phone: true
                    }
                },
                technician: {
                    columns: {
                        id: true,
                        name: true
                    }
                },
                transaction: true // Include all fields
            },
            orderBy: [desc(warrantyClaims.createdAt)]
        });

        // Get lifecycle logs
        const lifecycleLogs = await db.query.deviceLifecycleLogs.findMany({
            where: eq(deviceLifecycleLogs.passportId, id),
            with: {
                actor: {
                    columns: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [asc(deviceLifecycleLogs.createdAt)] // Ascending for timeline
        });

        // Get all transactions involving this passport (via transaction items that match inventory + serial logic)
        // First, get inventory items sold with this passport
        const salesHistory: any[] = [];

        if (passport.currentTransactionId) {
            // Get the current/latest transaction
            const currentSale = await db.query.transactions.findFirst({
                where: eq(transactions.id, passport.currentTransactionId),
                with: {
                    customer: {
                        columns: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    }
                }
            });

            if (currentSale) {
                salesHistory.push({
                    type: 'SALE',
                    transaction: currentSale,
                    passportStatus: passport.status,
                    warrantyEndDate: passport.warrantyEndDate
                });
            }
        }

        // Calculate health score based on latest QC
        const latestQC = qcHistory[0];
        let healthScore = passport.healthScore || 0;

        if (latestQC) {
            // Calculate health score from QC data
            const scores = [
                latestQC.screenScore || 0,
                latestQC.batteryHealth || 0,
                latestQC.keyboardScore || 0,
                latestQC.usbPortsScore || 0,
                latestQC.hingeScore || 0,
                latestQC.wifiScore || 0,
                latestQC.bodyScore || 0
            ].filter(s => s > 0);

            if (scores.length > 0) {
                healthScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
            }
        }

        // Build comprehensive timeline
        const timeline: TimelineEvent[] = [];

        // 1. Add procurement/lifecycle status changes
        for (const log of lifecycleLogs) {
            timeline.push({
                id: log.id,
                type: 'STATUS_CHANGE',
                title: getStatusChangeTitle(log.fromStatus, log.toStatus),
                description: log.notes || null,
                date: log.createdAt,
                actor: log.actor?.name || 'System',
                data: {
                    fromStatus: log.fromStatus,
                    toStatus: log.toStatus,
                    referenceId: log.referenceId
                }
            });
        }

        // 2. Add QC inspections
        for (const qc of qcHistory) {
            timeline.push({
                id: qc.id,
                type: 'QC',
                title: `QC Inspection - Grade ${qc.grade}`,
                description: qc.notes || null,
                date: qc.createdAt,
                actor: qc.technician?.name || 'Unknown Technician',
                data: {
                    grade: qc.grade,
                    batteryHealth: qc.batteryHealth,
                    batteryCycle: qc.batteryCycle,
                    screenScore: qc.screenScore,
                    keyboardScore: qc.keyboardScore,
                    wifiScore: qc.wifiScore,
                    bodyScore: qc.bodyScore,
                    componentChecks: {
                        touchpad: qc.touchpadStatus,
                        speaker: qc.speakerStatus,
                        mic: qc.micStatus,
                        bluetooth: qc.bluetoothStatus,
                        webcam: qc.webcamStatus,
                        hdmi: qc.hdmiStatus,
                        charging: qc.chargingStatus,
                        fingerprint: qc.fingerprintStatus
                    },
                    maxSellingPrice: qc.maxSellingPrice,
                    warrantyDays: qc.warrantyDays
                }
            });
        }

        // 3. Add refurbishments
        for (const ref of refurbishments) {
            timeline.push({
                id: ref.id,
                type: 'REFURBISH',
                title: getRefurbishTitle(ref.activityType),
                description: ref.description,
                date: ref.createdAt,
                actor: ref.technician?.name || 'Unknown Technician',
                data: {
                    activityType: ref.activityType,
                    cost: ref.cost,
                    componentReplaced: ref.componentReplaced,
                    oldSpec: ref.oldSpec,
                    newSpec: ref.newSpec
                }
            });
        }

        // 4. Add warranty claims
        for (const claim of warrantyHistory) {
            timeline.push({
                id: claim.id,
                type: 'WARRANTY',
                title: `Warranty Claim - ${claim.status}`,
                description: claim.issueDescription,
                date: claim.createdAt,
                actor: claim.technician?.name || 'Customer',
                data: {
                    status: claim.status,
                    issueDescription: claim.issueDescription,
                    resolutionNotes: claim.resolutionNotes,
                    customer: claim.customer,
                    invoiceNumber: claim.transaction?.invoiceNumber,
                    totalAmount: claim.transaction?.amount
                }
            });
        }

        // 5. Add sales history
        for (const sale of salesHistory) {
            timeline.push({
                id: sale.transaction.id,
                type: 'SALE',
                title: `Sold to ${sale.transaction.customer?.name || 'Customer'}`,
                description: sale.transaction.invoiceNumber
                    ? `Invoice: ${sale.transaction.invoiceNumber}`
                    : null,
                date: sale.transaction.createdAt,
                actor: sale.transaction.customer?.name || 'Customer',
                data: {
                    invoiceNumber: sale.transaction.invoiceNumber,
                    totalAmount: sale.transaction.amount,
                    customer: sale.transaction.customer,
                    warrantyEndDate: sale.warrantyEndDate,
                    passportStatus: sale.passportStatus
                }
            });
        }

        // Sort timeline by date ascending
        timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Return comprehensive response
        return NextResponse.json({
            device: {
                id: passport.id,
                serialNumber: passport.serialNumber,
                status: passport.status,
                grade: passport.grade,
                originalCost: passport.originalCost,
                warrantyEndDate: passport.warrantyEndDate,
                healthScore,
                // Hardware identification
                imei: passport.imei,
                macAddress: passport.macAddress,
                windowsKey: passport.windowsKey,
                batterySerial: passport.batterySerial,
                motherboardSerial: passport.motherboardSerial,
                batteryHealth: passport.batteryHealth,
                batteryCycle: passport.batteryCycle,
                // Related inventory
                inventory: passport.inventory,
                currentTransaction: passport.currentTransaction
            },
            summary: {
                totalQC: qcHistory.length,
                totalRefurbishments: refurbishments.length,
                totalWarrantyClaims: warrantyHistory.length,
                totalSales: salesHistory.length,
                totalUpgradeCost: refurbishments.reduce((sum, r) => sum + (r.cost || 0), 0)
            },
            timeline,
            qcHistory,
            refurbishments,
            warrantyHistory,
            salesHistory
        });

    } catch (error: any) {
        console.error("Failed to get device lifecycle:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// Helper functions
function getStatusChangeTitle(fromStatus: string | null, toStatus: string): string {
    if (!fromStatus) {
        return `Device Procured (${toStatus})`;
    }

    const statusLabels: Record<string, string> = {
        'PROCURED': 'Procured',
        'QC_PENDING': 'Pending QC',
        'QC_PASSED': 'QC Passed',
        'QC_FAILED': 'QC Failed',
        'AVAILABLE': 'Available for Sale',
        'RESERVED': 'Reserved',
        'SOLD': 'Sold',
        'TRADE_IN': 'Trade-in Received',
        'TRADE_OUT': 'Trade-out Completed',
        'SERVICING': 'Under Service',
        'DISPOSED': 'Disposed'
    };

    return `Status Changed: ${statusLabels[fromStatus] || fromStatus} → ${statusLabels[toStatus] || toStatus}`;
}

function getRefurbishTitle(activityType: string): string {
    const activityLabels: Record<string, string> = {
        'CLEANING': 'Deep Cleaning',
        'REPASTA': 'Thermal Repasta',
        'UPGRADE_RAM': 'RAM Upgrade',
        'UPGRADE_SSD': 'SSD Upgrade',
        'REPLACE_COMPONENT': 'Component Replacement',
        'OTHER': 'Other Service'
    };

    return activityLabels[activityType] || activityType;
}

// Timeline event type
interface TimelineEvent {
    id: string;
    type: 'STATUS_CHANGE' | 'QC' | 'REFURBISH' | 'WARRANTY' | 'SALE';
    title: string;
    description: string | null;
    date: Date;
    actor: string;
    data: any;
}
