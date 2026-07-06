import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixedAssets, depreciationEntries, fiscalPeriods, journalEntries, chartOfAccounts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireReportAccess, requireOwner } from "@/lib/auth-guard";
import { calculateMonthlyDepreciation, calculateAccumulatedDepreciation, getFixedAssetsWithDepreciation } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// GET /api/accounting/fixed-assets - List all fixed assets
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const assets = await getFixedAssetsWithDepreciation(authResult.storeId);
        return NextResponse.json(assets);
    } catch (error: any) {
        console.error("Failed to fetch fixed assets:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch fixed assets" },
            { status: 500 }
        );
    }
}

// POST /api/accounting/fixed-assets - Create new fixed asset
export async function POST(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const {
            name, description, purchaseDate, purchasePrice,
            usefulLifeMonths, salvageValue, depreciationMethod,
            accountCode, accumulatedDepreciationAccount, depreciationExpenseAccount
        } = body;

        // Validate required fields
        if (!name || !purchaseDate || !purchasePrice || !usefulLifeMonths) {
            return NextResponse.json(
                { error: "name, purchaseDate, purchasePrice, and usefulLifeMonths are required" },
                { status: 400 }
            );
        }

        // Generate asset code
        const prefix = 'ATL';
        const year = new Date(purchaseDate).getFullYear();
        const latestAsset = await db.query.fixedAssets.findFirst({
            where: eq(fixedAssets.storeId, authResult.storeId),
            orderBy: desc(fixedAssets.code),
        });

        let nextNum = 1;
        if (latestAsset && latestAsset.code) {
            const lastNum = parseInt(latestAsset.code.split('-')[1], 10);
            if (!isNaN(lastNum)) nextNum = lastNum + 1;
        }
        const code = `${prefix}-${String(nextNum).padStart(3, '0')}`;

        const now = new Date();
        const [newAsset] = await db.insert(fixedAssets).values({
            storeId: authResult.storeId,
            code,
            name,
            description: description || null,
            purchaseDate,
            purchasePrice,
            usefulLifeMonths,
            salvageValue: salvageValue || 0,
            depreciationMethod: depreciationMethod || 'straight_line',
            accountCode: accountCode || '1220', // Default to Peralatan
            accumulatedDepreciationAccount: accumulatedDepreciationAccount || '1230',
            depreciationExpenseAccount: depreciationExpenseAccount || '5270',
            status: 'active',
            createdAt: now,
            updatedAt: now,
        }).returning();

        return NextResponse.json(newAsset, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create fixed asset:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create fixed asset" },
            { status: 500 }
        );
    }
}

// PUT /api/accounting/fixed-assets - Update fixed asset
export async function PUT(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { id, name, description, status, disposedDate, disposedNotes, disposedProceeds } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Asset ID is required" },
                { status: 400 }
            );
        }

        const existing = await db.query.fixedAssets.findFirst({
            where: and(
                eq(fixedAssets.id, id),
                eq(fixedAssets.storeId, authResult.storeId)
            )
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Asset not found" },
                { status: 404 }
            );
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (status !== undefined) updateData.status = status;
        if (disposedDate !== undefined) updateData.disposedDate = disposedDate;
        if (disposedNotes !== undefined) updateData.disposedNotes = disposedNotes;
        if (disposedProceeds !== undefined) updateData.disposedProceeds = disposedProceeds;

        const [updatedAsset] = await db.update(fixedAssets)
            .set(updateData)
            .where(eq(fixedAssets.id, id))
            .returning();

        return NextResponse.json(updatedAsset);
    } catch (error: any) {
        console.error("Failed to update fixed asset:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update fixed asset" },
            { status: 500 }
        );
    }
}

// DELETE /api/accounting/fixed-assets - Delete fixed asset (soft delete)
export async function DELETE(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Asset ID is required" },
                { status: 400 }
            );
        }

        // Soft delete by setting status to disposed
        await db.update(fixedAssets)
            .set({
                status: 'disposed',
                disposedDate: new Date().toISOString().split('T')[0],
                disposedNotes: 'Disposed via API',
                updatedAt: new Date(),
            })
            .where(and(
                eq(fixedAssets.id, id),
                eq(fixedAssets.storeId, authResult.storeId)
            ));

        return NextResponse.json({ success: true, message: "Asset disposed" });
    } catch (error: any) {
        console.error("Failed to dispose fixed asset:", error);
        return NextResponse.json(
            { error: error.message || "Failed to dispose fixed asset" },
            { status: 500 }
        );
    }
}
