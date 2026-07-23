import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixedAssets, depreciationEntries, fiscalPeriods, journalEntries, chartOfAccounts } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requireReportAccess, requireOwner, requireFeature } from "@/lib/auth-guard";
import { calculateMonthlyDepreciation } from "@/services/AccountingService";

export const dynamic = 'force-dynamic';

// POST /api/accounting/fixed-assets/depreciate
// Calculate depreciation for a period
export async function POST(request: Request) {
    const authResult = await requireOwner();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("fixedAssets");
    if (featureCheck instanceof NextResponse) return featureCheck;

    try {
        const body = await request.json();
        const { fiscalPeriodId, assetIds } = body;

        if (!fiscalPeriodId) {
            return NextResponse.json(
                { error: "fiscalPeriodId is required" },
                { status: 400 }
            );
        }

        // Get fiscal period
        const period = await db.query.fiscalPeriods.findFirst({
            where: and(
                eq(fiscalPeriods.id, fiscalPeriodId),
                eq(fiscalPeriods.storeId, authResult.storeId)
            )
        });

        if (!period) {
            return NextResponse.json(
                { error: "Fiscal period not found" },
                { status: 404 }
            );
        }

        if (period.status === 'CLOSED') {
            return NextResponse.json(
                { error: "Cannot add depreciation to a closed period" },
                { status: 400 }
            );
        }

        // Get assets to depreciate
        let assets;
        if (assetIds && assetIds.length > 0) {
            assets = await db.query.fixedAssets.findMany({
                where: and(
                    eq(fixedAssets.storeId, authResult.storeId),
                    eq(fixedAssets.status, 'active')
                ),
                orderBy: fixedAssets.code,
            });
            assets = assets.filter(a => assetIds.includes(a.id));
        } else {
            assets = await db.query.fixedAssets.findMany({
                where: and(
                    eq(fixedAssets.storeId, authResult.storeId),
                    eq(fixedAssets.status, 'active')
                ),
                orderBy: fixedAssets.code,
            });
        }

        const results = [];
        const now = new Date();

        for (const asset of assets) {
            // Check if depreciation already exists for this period
            const existingDepr = await db.query.depreciationEntries.findFirst({
                where: and(
                    eq(depreciationEntries.fixedAssetId, asset.id),
                    eq(depreciationEntries.fiscalPeriodId, fiscalPeriodId)
                )
            });

            if (existingDepr) {
                results.push({
                    assetId: asset.id,
                    assetCode: asset.code,
                    assetName: asset.name,
                    status: 'skipped',
                    reason: 'Depreciation already calculated for this period',
                    depreciation: existingDepr.amount,
                });
                continue;
            }

            // Calculate monthly depreciation
            const monthlyDepreciation = calculateMonthlyDepreciation(
                asset.purchasePrice,
                asset.salvageValue,
                asset.usefulLifeMonths
            );

            if (monthlyDepreciation <= 0) {
                // Asset is fully depreciated
                await db.update(fixedAssets)
                    .set({ status: 'fully_depreciated', updatedAt: now })
                    .where(eq(fixedAssets.id, asset.id));

                results.push({
                    assetId: asset.id,
                    assetCode: asset.code,
                    assetName: asset.name,
                    status: 'skipped',
                    reason: 'Asset is fully depreciated',
                    depreciation: 0,
                });
                continue;
            }

            // Get accumulated depreciation before this period
            const priorDepr = await db.select({
                total: depreciationEntries.cumulativeAmount
            })
            .from(depreciationEntries)
            .innerJoin(fiscalPeriods, eq(depreciationEntries.fiscalPeriodId, fiscalPeriods.id))
            .where(and(
                eq(depreciationEntries.fixedAssetId, asset.id),
                sql`${fiscalPeriods.year} * 100 + ${fiscalPeriods.month} < ${period.year} * 100 + ${period.month || 0}`
            ))
            .orderBy(desc(fiscalPeriods.year), desc(fiscalPeriods.month))
            .limit(1);

            const priorAccumulated = Number(priorDepr[0]?.total) || 0;
            const newAccumulated = priorAccumulated + monthlyDepreciation;
            const netBookValue = asset.purchasePrice - newAccumulated;

            // Create depreciation entry
            const [deprEntry] = await db.insert(depreciationEntries).values({
                storeId: authResult.storeId,
                fixedAssetId: asset.id,
                fiscalPeriodId,
                amount: monthlyDepreciation,
                cumulativeAmount: newAccumulated,
                netBookValue: Math.max(netBookValue, asset.salvageValue),
                createdAt: now,
            }).returning();

            // Check if fully depreciated after this entry
            if (netBookValue <= asset.salvageValue) {
                await db.update(fixedAssets)
                    .set({ status: 'fully_depreciated', updatedAt: now })
                    .where(eq(fixedAssets.id, asset.id));
            }

            results.push({
                assetId: asset.id,
                assetCode: asset.code,
                assetName: asset.name,
                status: 'created',
                depreciation: monthlyDepreciation,
                cumulativeDepreciation: newAccumulated,
                netBookValue: Math.max(netBookValue, asset.salvageValue),
                entryId: deprEntry.id,
            });
        }

        return NextResponse.json({
            fiscalPeriod: {
                id: period.id,
                year: period.year,
                month: period.month,
            },
            results,
            summary: {
                totalAssets: assets.length,
                processed: results.filter(r => r.status === 'created').length,
                skipped: results.filter(r => r.status === 'skipped').length,
                totalDepreciation: results
                    .filter(r => r.status === 'created')
                    .reduce((sum, r) => sum + r.depreciation, 0),
            }
        });
    } catch (error: any) {
        console.error("Failed to calculate depreciation:", error);
        return NextResponse.json(
            { error: error.message || "Failed to calculate depreciation" },
            { status: 500 }
        );
    }
}
