import { NextResponse } from "next/server";
import { db } from "@/db";
import { deviceRefurbishments, devicePassports, deviceLifecycleLogs } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireOwnerOrManager } from "@/lib/auth-guard";

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
            technicianId
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
                authResult.storeId !== "all" ? eq(devicePassports.storeId, authResult.storeId) : undefined
            )
        });

        if (!passport) {
            return NextResponse.json(
                { error: "Device passport not found" },
                { status: 404 }
            );
        }

        // Create refurbishment record
        const [refurbishment] = await db.insert(deviceRefurbishments).values({
            passportId: id,
            storeId: authResult.storeId !== "all" ? authResult.storeId : "default",
            technicianId: technicianId || null,
            activityType: activityType as string,
            description,
            cost: cost || 0,
            componentReplaced: componentReplaced || null,
            oldSpec: oldSpec || null,
            newSpec: newSpec || null,
            notes: notes || null
        }).returning();

        // Create lifecycle log entry
        const activityLabels: Record<string, string> = {
            'CLEANING': 'Deep Cleaning',
            'REPASTA': 'Thermal Repasta',
            'UPGRADE_RAM': 'RAM Upgrade',
            'UPGRADE_SSD': 'SSD Upgrade',
            'REPLACE_COMPONENT': 'Component Replacement',
            'OTHER': 'Other Service'
        };

        await db.insert(deviceLifecycleLogs).values({
            passportId: id,
            fromStatus: passport.status,
            toStatus: passport.status, // Status doesn't change on refurbishment
            actorId: (authResult.user as any)?.id || null,
            referenceId: refurbishment.id,
            notes: `${activityLabels[activityType]}: ${description}${cost ? ` (Cost: Rp ${cost.toLocaleString('id-ID')})` : ''}`
        });

        return NextResponse.json({
            success: true,
            refurbishment,
            message: "Refurbishment activity recorded successfully"
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
                authResult.storeId !== "all" ? eq(devicePassports.storeId, authResult.storeId) : undefined
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
