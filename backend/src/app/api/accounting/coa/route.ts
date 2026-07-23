import { NextResponse } from "next/server";
import { db } from "@/db";
import { chartOfAccounts } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireReportAccess, requireOwner, storeScope, requireFeature } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

// GET /api/accounting/coa - List all accounts
export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const { searchParams } = new URL(request.url);
        const type = searchParams.get("type");
        const activeOnly = searchParams.get("active") !== "false";

        let conditions = [];

        const scope = storeScope(authResult, chartOfAccounts.storeId);
        if (scope) conditions.push(scope);
        if (type) {
            conditions.push(eq(chartOfAccounts.type, type));
        }
        if (activeOnly) {
            conditions.push(eq(chartOfAccounts.isActive, true));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const accounts = await db.query.chartOfAccounts.findMany({
            where: whereClause,
            orderBy: [chartOfAccounts.type, chartOfAccounts.code],
        });

        return NextResponse.json(accounts);
    } catch (error: any) {
        console.error("Failed to fetch chart of accounts:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch chart of accounts" },
            { status: 500 }
        );
    }
}

// POST /api/accounting/coa - Create new account
export async function POST(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const body = await request.json();
        const { code, name, type, subType, parentId, openingBalance, normalBalance } = body;

        // Validate required fields
        if (!code || !name || !type) {
            return NextResponse.json(
                { error: "Code, name, and type are required" },
                { status: 400 }
            );
        }

        // Validate type
        const validTypes = ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'];
        if (!validTypes.includes(type)) {
            return NextResponse.json(
                { error: `Invalid type. Must be one of: ${validTypes.join(', ')}` },
                { status: 400 }
            );
        }

        // Check for duplicate code in same store
        const existing = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.storeId, authResult.storeId),
                eq(chartOfAccounts.code, code)
            )
        });

        if (existing) {
            return NextResponse.json(
                { error: `Account code ${code} already exists` },
                { status: 400 }
            );
        }

        const now = new Date();
        const [newAccount] = await db.insert(chartOfAccounts).values({
            storeId: authResult.storeId,
            code,
            name,
            type,
            subType: subType || null,
            parentId: parentId || null,
            openingBalance: openingBalance || 0,
            isActive: true,
            isSystem: false,
            normalBalance: normalBalance || (type === 'Revenue' || type === 'Liability' || type === 'Equity' ? 'Credit' : 'Debit'),
            createdAt: now,
            updatedAt: now,
        }).returning();

        return NextResponse.json(newAccount, { status: 201 });
    } catch (error: any) {
        console.error("Failed to create account:", error);
        return NextResponse.json(
            { error: error.message || "Failed to create account" },
            { status: 500 }
        );
    }
}

// PUT /api/accounting/coa - Update account
export async function PUT(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const body = await request.json();
        const { id, name, subType, parentId, openingBalance, isActive, normalBalance } = body;

        if (!id) {
            return NextResponse.json(
                { error: "Account ID is required" },
                { status: 400 }
            );
        }

        // Get existing account
        const existing = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.id, id),
                eq(chartOfAccounts.storeId, authResult.storeId)
            )
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Account not found" },
                { status: 404 }
            );
        }

        // Cannot modify system accounts
        if (existing.isSystem && (name || openingBalance !== undefined)) {
            return NextResponse.json(
                { error: "Cannot modify system account name or opening balance" },
                { status: 400 }
            );
        }

        const updateData: any = {
            updatedAt: new Date(),
        };

        if (name && !existing.isSystem) updateData.name = name;
        if (subType !== undefined) updateData.subType = subType;
        if (parentId !== undefined) updateData.parentId = parentId;
        if (openingBalance !== undefined && !existing.isSystem) updateData.openingBalance = openingBalance;
        if (isActive !== undefined) updateData.isActive = isActive;
        if (normalBalance !== undefined) updateData.normalBalance = normalBalance;

        const [updatedAccount] = await db.update(chartOfAccounts)
            .set(updateData)
            .where(eq(chartOfAccounts.id, id))
            .returning();

        return NextResponse.json(updatedAccount);
    } catch (error: any) {
        console.error("Failed to update account:", error);
        return NextResponse.json(
            { error: error.message || "Failed to update account" },
            { status: 500 }
        );
    }
}

// DELETE /api/accounting/coa - Soft delete account
export async function DELETE(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("accounting");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { error: "Account ID is required" },
                { status: 400 }
            );
        }

        // Get existing account
        const existing = await db.query.chartOfAccounts.findFirst({
            where: and(
                eq(chartOfAccounts.id, id),
                eq(chartOfAccounts.storeId, authResult.storeId)
            )
        });

        if (!existing) {
            return NextResponse.json(
                { error: "Account not found" },
                { status: 404 }
            );
        }

        // Cannot delete system accounts
        if (existing.isSystem) {
            return NextResponse.json(
                { error: "Cannot delete system accounts" },
                { status: 400 }
            );
        }

        // Soft delete by setting isActive = false
        await db.update(chartOfAccounts)
            .set({
                isActive: false,
                updatedAt: new Date()
            })
            .where(eq(chartOfAccounts.id, id));

        return NextResponse.json({ success: true, message: "Account deactivated" });
    } catch (error: any) {
        console.error("Failed to delete account:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete account" },
            { status: 500 }
        );
    }
}
