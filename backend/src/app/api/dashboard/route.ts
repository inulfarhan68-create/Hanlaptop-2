import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, transactions, inventory, transactionItems, warrantyClaims } from "@/db/schema";
import { count, and, gte, lte, desc, eq, sum, isNull } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { withActiveTransactions, withActiveJournalEntries } from "@/db/query-helpers";

export const dynamic = 'force-dynamic';

function getPreviousPeriod(fromStr: string | null, toStr: string | null) {
    if (!fromStr || !toStr) return { prevFrom: null, prevTo: null };
    
    const from = new Date(fromStr);
    const to = new Date(toStr);
    
    const isStartOfMonth = from.getDate() === 1;
    const tempNextDay = new Date(to);
    tempNextDay.setDate(tempNextDay.getDate() + 1);
    const isEndOfMonth = tempNextDay.getDate() === 1;
    const isSameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
    
    if (isStartOfMonth && isEndOfMonth && isSameMonth) {
        const prevFrom = new Date(from.getFullYear(), from.getMonth() - 1, 1);
        const prevTo = new Date(from.getFullYear(), from.getMonth(), 0);
        return { prevFrom, prevTo };
    }
    
    const durationMs = to.getTime() - from.getTime();
    const prevTo = new Date(from.getTime() - 24 * 60 * 60 * 1000);
    const prevFrom = new Date(prevTo.getTime() - durationMs);
    
    prevFrom.setHours(0, 0, 0, 0);
    prevTo.setHours(23, 59, 59, 999);
    
    return { prevFrom, prevTo };
}

async function getAssetsAtDate(storeId: string, dateLimit: Date) {
    const storeCond = storeId !== "all" ? eq(journalEntries.storeId, storeId) : undefined;
    
    const balances = await db.select({
        accountName: journalEntries.accountName,
        totalDebit: sum(journalEntries.debit).mapWith(Number),
        totalCredit: sum(journalEntries.credit).mapWith(Number)
    })
    .from(journalEntries)
    .where(
        withActiveJournalEntries(
            storeCond 
                ? and(storeCond, lte(journalEntries.createdAt, dateLimit)) 
                : lte(journalEntries.createdAt, dateLimit)
        )
    )
    .groupBy(journalEntries.accountName);
    
    let kas = 0;
    let bank = 0;
    let qris = 0;
    let piutang = 0;
    let persediaan = 0;
    let asetTetap = 0;
    let kliring = 0;
    
    balances.forEach(entry => {
        const deb = entry.totalDebit || 0;
        const cred = entry.totalCredit || 0;
        const name = entry.accountName;
        
        if (name === "Kas") {
            kas += deb - cred;
        } else if (name === "Bank") {
            bank += deb - cred;
        } else if (name === "QRIS") {
            qris += deb - cred;
        } else if (name === "Piutang Usaha") {
            piutang += deb - cred;
        } else if (name === "Persediaan") {
            persediaan += deb - cred;
        } else if (name === "Aset Tetap" || name === "Kendaraan" || name === "Peralatan" || name === "Akumulasi Penyusutan") {
            asetTetap += deb - cred;
        } else if (name === "Kliring Antar Cabang") {
            kliring += deb - cred;
        }
    });
    
    return kas + bank + qris + piutang + persediaan + asetTetap;
}

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    const userRole = authResult.user.role || "kasir";

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    try {
        let conditions = [];
        if (authResult.storeId !== "all") conditions.push(eq(journalEntries.storeId, authResult.storeId));
        if (from) conditions.push(gte(journalEntries.createdAt, new Date(from)));
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            conditions.push(lte(journalEntries.createdAt, toDate));
        }

        let totalRevenue = 0;
        let cogs = 0;
        let opex = 0;
        let revenueLaptop = 0;
        let revenueServis = 0;
        let opexGaji = 0;
        let opexListrik = 0;
        let opexSewa = 0;
        let opexLainnya = 0;
        let liabilities = 0;
        let equity = 0;
        let prive = 0;
        
        let txConditions = [];
        if (authResult.storeId !== "all") txConditions.push(eq(transactions.storeId, authResult.storeId));
        if (from) txConditions.push(gte(transactions.transactionDate, new Date(from)));
        if (to) {
            const toDate = new Date(to);
            toDate.setHours(23, 59, 59, 999);
            txConditions.push(lte(transactions.transactionDate, toDate));
        }

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        let earliestDate = sixMonthsAgo;
        if (from && new Date(from) < earliestDate) {
            earliestDate = new Date(from);
        }

        const storeCond = authResult.storeId !== "all" ? eq(journalEntries.storeId, authResult.storeId) : undefined;
        const txStoreCond = authResult.storeId !== "all" ? eq(transactions.storeId, authResult.storeId) : undefined;
        // Exclude soft-deleted items — otherwise deleted stock still counts toward
        // "Aset Persediaan" / total inventory value on the dashboard.
        const invStoreCond = authResult.storeId !== "all"
            ? and(eq(inventory.storeId, authResult.storeId), isNull(inventory.deletedAt))
            : isNull(inventory.deletedAt);

        const { prevFrom, prevTo } = getPreviousPeriod(from, to);
        
        let prevJournalsPromise = Promise.resolve([] as any[]);
        let prevAssetsPromise = Promise.resolve(0);
        let currentAssetsPromise = Promise.resolve(0);
        
        if (prevFrom && prevTo) {
            let prevConditions = [
                gte(journalEntries.createdAt, prevFrom),
                lte(journalEntries.createdAt, prevTo)
            ];
            if (authResult.storeId !== "all") {
                prevConditions.push(eq(journalEntries.storeId, authResult.storeId));
            }
            prevJournalsPromise = db.select().from(journalEntries).where(withActiveJournalEntries(and(...prevConditions)));
            
            prevAssetsPromise = getAssetsAtDate(authResult.storeId, prevTo);
            
            const toDate = new Date(to || new Date());
            toDate.setHours(23, 59, 59, 999);
            currentAssetsPromise = getAssetsAtDate(authResult.storeId, toDate);
        }

        const [
            periodJournals,
            sixMonthsJournals,
            journalBalances,
            periodTx,
            allTx,
            recentTransactions,
            allInventory,
            txWithItems,
            prevPeriodJournals,
            prevAssets,
            currentAssetsVal
        ] = await Promise.all([
            db.select().from(journalEntries).where(withActiveJournalEntries(conditions.length > 0 ? and(...conditions) : undefined)),
            db.select().from(journalEntries).where(withActiveJournalEntries(storeCond ? and(gte(journalEntries.createdAt, earliestDate), storeCond) : gte(journalEntries.createdAt, earliestDate))),
            db.select({ accountName: journalEntries.accountName, totalDebit: sum(journalEntries.debit).mapWith(Number), totalCredit: sum(journalEntries.credit).mapWith(Number) }).from(journalEntries).where(withActiveJournalEntries(storeCond)).groupBy(journalEntries.accountName),
            db.query.transactions.findMany({ where: withActiveTransactions(txConditions.length > 0 ? and(...txConditions) : undefined) }),
            db.select({ count: count() }).from(transactions).where(withActiveTransactions(txConditions.length > 0 ? and(...txConditions) : undefined)),
            db.query.transactions.findMany({ where: withActiveTransactions(txStoreCond), orderBy: [desc(transactions.transactionDate)], limit: 5 }),
            db.select().from(inventory).where(invStoreCond),
            db.query.transactions.findMany({ 
                where: withActiveTransactions(txStoreCond ? and(gte(transactions.transactionDate, earliestDate), txStoreCond) : gte(transactions.transactionDate, earliestDate)),
                with: { items: { with: { inventoryItem: true } } } 
            }),
            prevJournalsPromise,
            prevAssetsPromise,
            currentAssetsPromise
        ]);

        const allTxItems = txWithItems.flatMap(tx => tx.items.map(item => ({ ...item, transaction: tx })));

        const expenseCategories = [
            "Gaji Karyawan",
            "Listrik & Internet",
            "Sewa Tempat",
            "ATK & Perlengkapan",
            "Pemasaran / Iklan",
            "Transportasi",
            "Perbaikan & Perawatan",
            "Klaim Garansi",
            "Lain-lain"
        ];

        let opexDetailsMap: Record<string, number> = {};
        expenseCategories.forEach(c => opexDetailsMap[c] = 0);

        periodTx.forEach(tx => {
            if (tx.transactionType === "Operasional") {
                 let matchedCategory = "Lain-lain";
                 const descLower = (tx.description || "").toLowerCase();
                 for (const cat of expenseCategories) {
                     if (descLower.includes(cat.toLowerCase())) {
                         matchedCategory = cat;
                         break;
                     }
                 }
                 opexDetailsMap[matchedCategory] += tx.amount;
            } else if (tx.transactionType === "Beban Garansi") {
                // Klaim garansi: beban ditanggung toko, masuk kategori "Klaim Garansi"
                opexDetailsMap["Klaim Garansi"] = (opexDetailsMap["Klaim Garansi"] || 0) + tx.amount;
            } else if (tx.transactionType?.startsWith("Beban")) {
                // Jenis beban lain di masa depan → masuk Lain-lain
                opexDetailsMap["Lain-lain"] = (opexDetailsMap["Lain-lain"] || 0) + tx.amount;
            }
        });


        periodJournals.forEach(entry => {
            if (entry.accountName.includes("Pendapatan") || entry.accountName.includes("Penjualan")) {
                totalRevenue += entry.credit - entry.debit;
                if (entry.accountName === "Pendapatan Servis") {
                    revenueServis += entry.credit - entry.debit;
                }
            } else if (entry.accountName.startsWith("HPP")) {
                cogs += entry.debit - entry.credit;
            } else if (entry.accountName.includes("Beban")) {
                opex += entry.debit - entry.credit;
            }
        });

        let kas = 0;
        let bank = 0;
        let qris = 0;
        let piutang = 0;
        let kliring = 0;
        let fixedAssets = 0;

        journalBalances.forEach(entry => {
            const deb = entry.totalDebit || 0;
            const cred = entry.totalCredit || 0;
            if (entry.accountName.includes("Hutang") || entry.accountName.includes("Utang")) {
                liabilities += cred - deb;
            } else if (entry.accountName === "Modal Pemilik") {
                equity += cred - deb;
            } else if (entry.accountName === "Prive") {
                prive += deb - cred;
            } else if (entry.accountName === "Kas") {
                kas += deb - cred;
            } else if (entry.accountName === "Bank") {
                bank += deb - cred;
            } else if (entry.accountName === "QRIS") {
                qris += deb - cred;
            } else if (entry.accountName === "Piutang Usaha") {
                piutang += deb - cred;
            } else if (entry.accountName === "Kliring Antar Cabang") {
                kliring += deb - cred;
            } else if (entry.accountName === "Kendaraan" || entry.accountName === "Peralatan" || entry.accountName === "Akumulasi Penyusutan") {
                fixedAssets += deb - cred;
            }
        });

        const kasLiquid = kas + bank + qris;

        const netProfit = totalRevenue - cogs - opex;
        const grossMargin = totalRevenue > 0 ? ((totalRevenue - cogs) / totalRevenue) * 100 : 0;

        // Filter totalTx to only count sales and service transactions in the period
        const salesTransactions = periodTx.filter(t => t.transactionType === "Penjualan" || t.transactionType === "Jasa Servis");
        const totalTx = salesTransactions.length;

        const monthlyDataMap = new Map();
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('en-US', { month: 'short' });
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            monthlyDataMap.set(key, { name: monthName, sales: 0, service: 0, aksesoris: 0, expense: 0, margin: 0, _hpp: 0 });
        }

        const monthlyMarginMap = new Map();
        for (let i = 2; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const monthName = d.toLocaleString('en-US', { month: 'short' });
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            monthlyMarginMap.set(key, { name: monthName, laptop: 0, sparepart: 0, aksesoris: 0, servis: 0 });
        }

        sixMonthsJournals.forEach(entry => {
            const d = new Date(entry.createdAt);
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (monthlyDataMap.has(key)) {
                const data = monthlyDataMap.get(key);
                if (entry.accountName === "Pendapatan") {
                    data.sales += (entry.credit - entry.debit);
                } else if (entry.accountName === "Pendapatan Servis") {
                    data.service += (entry.credit - entry.debit);
                } else if (entry.accountName.includes("Beban")) {
                    data.expense += (entry.debit - entry.credit);
                } else if (entry.accountName.startsWith("HPP")) {
                    data._hpp += (entry.debit - entry.credit);
                }
            }
        });

        const laptops = allInventory.filter(i => i.category === "Laptop Bekas");
        const aksesoris = allInventory.filter(i => i.category === "Aksesoris");
        const spareParts = allInventory.filter(i => i.category !== "Laptop Bekas" && i.category !== "Aksesoris" && i.category !== "Jasa Servis");
        const totalInventoryValue = allInventory.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);
        const totalInventoryQty = allInventory.reduce((sum, i) => sum + i.quantity, 0);

        const actualTotalAssets = kasLiquid + totalInventoryValue + piutang + fixedAssets;

        const brandSalesMap = new Map<string, number>();
        const productSalesMap = new Map<string, { name: string, sold: number, revenue: number }>();
        let revLaptop = 0;
        let revSparepart = 0;
        let revAksesoris = 0;
        let cogsLaptopVal = 0;
        let cogsSparepartVal = 0;
        let cogsAksesorisVal = 0;
        let cogsServisVal = 0;

        allTxItems.forEach(item => {
            const txDate = item.transaction ? new Date(item.transaction.transactionDate) : null;
            let inPeriod = true;
            if (txDate) {
                if (from && txDate < new Date(from)) inPeriod = false;
                if (to) {
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    if (txDate > toDate) inPeriod = false;
                }
                const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;
                if (item.transaction?.transactionType === "Penjualan" && item.inventoryItem?.category === "Aksesoris") {
                    if (monthlyDataMap.has(key)) {
                        const itemTotal = item.quantity * item.unitPrice;
                        monthlyDataMap.get(key).aksesoris += itemTotal;
                    }
                }
            }

            if (item.transaction?.transactionType === "Penjualan" && item.inventoryItem) {
                const itemTotal = item.quantity * item.unitPrice;
                const itemCogs = item.quantity * (item.inventoryItem.costPrice || 0);
                
                if (item.inventoryItem.category === "Laptop Bekas") {
                    if (inPeriod) {
                        revLaptop += itemTotal;
                        cogsLaptopVal += itemCogs;
                    }
                    // Brand mapping (also filter by period for accuracy)
                    if (inPeriod) {
                        const itemName = item.inventoryItem.itemName.trim();
                        const brand = itemName.split(" ")[0].toUpperCase();
                        if (brand) {
                            brandSalesMap.set(brand, (brandSalesMap.get(brand) || 0) + item.quantity);
                        }
                    }
                } else if (item.inventoryItem.category === "Aksesoris") {
                    if (inPeriod) {
                        revAksesoris += itemTotal;
                        cogsAksesorisVal += itemCogs;
                    }
                } else if (item.inventoryItem.category === "Jasa Servis") {
                    if (inPeriod) {
                        revenueServis += itemTotal;
                        cogsServisVal += itemCogs; // Usually 0, but good to be safe
                    }
                } else {
                    if (inPeriod) {
                        revSparepart += itemTotal;
                        cogsSparepartVal += itemCogs;
                    }
                }

                if (item.inventoryItem.category !== "Jasa Servis" && inPeriod) {
                    const name = item.inventoryItem.itemName;
                    if (!productSalesMap.has(name)) {
                        productSalesMap.set(name, { name, sold: 0, revenue: 0 });
                    }
                    const p = productSalesMap.get(name)!;
                    p.sold += item.quantity;
                    p.revenue += itemTotal;
                }

                if (txDate) {
                    const key = `${txDate.getFullYear()}-${txDate.getMonth()}`;
                    if (monthlyMarginMap.has(key)) {
                        const marginData = monthlyMarginMap.get(key);
                        const itemMargin = itemTotal - itemCogs;
                        if (item.inventoryItem.category === "Laptop Bekas") marginData.laptop += itemMargin;
                        else if (item.inventoryItem.category === "Aksesoris") marginData.aksesoris += itemMargin;
                        else if (item.inventoryItem.category === "Jasa Servis") marginData.servis += itemMargin;
                        else marginData.sparepart += itemMargin;
                    }
                }
            }
        });

        const topSellingProducts = Array.from(productSalesMap.values())
            .sort((a, b) => b.sold - a.sold)
            .slice(0, 5);

        const realMonthlyData = Array.from(monthlyDataMap.values()).map(d => {
            const totalRev = d.sales + d.service;
            const grossProfit = totalRev - d._hpp;
            d.margin = totalRev > 0 ? parseFloat(((grossProfit / totalRev) * 100).toFixed(1)) : 0;
            return {
                name: d.name,
                sales: Math.round((d.sales - d.aksesoris) / 1000),
                service: Math.round(d.service / 1000),
                aksesoris: Math.round(d.aksesoris / 1000),
                totalRevenue: Math.round(totalRev / 1000),
                expense: Math.round(d.expense / 1000),
                margin: d.margin,
                marginValue: grossProfit
            };
        });


        const brandSalesData = Array.from(brandSalesMap.entries()).map(([brand, quantity]) => ({
            name: brand,
            value: quantity
        })).sort((a, b) => b.value - a.value);

        let prevRevenue = 0;
        let prevCogs = 0;
        let prevOpex = 0;

        prevPeriodJournals.forEach(entry => {
            if (entry.accountName.includes("Pendapatan")) {
                prevRevenue += entry.credit - entry.debit;
            } else if (entry.accountName.startsWith("HPP")) {
                prevCogs += entry.debit - entry.credit;
            } else if (entry.accountName.includes("Beban")) {
                prevOpex += entry.debit - entry.credit;
            }
        });

        const prevNetProfit = prevRevenue - prevCogs - prevOpex;

        const calcGrowth = (current: number, previous: number) => {
            if (previous === 0) {
                return current !== 0 ? "Baru" : null;
            }
            return parseFloat((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
        };

        const growth = prevFrom && prevTo ? {
            revenue: calcGrowth(totalRevenue, prevRevenue),
            expenses: calcGrowth(opex, prevOpex),
            netProfit: calcGrowth(netProfit, prevNetProfit),
            assets: calcGrowth(currentAssetsVal, prevAssets)
        } : null;

        const isKasir = authResult.storeRole === "kasir";

        return NextResponse.json({
            userRole: authResult.storeRole,
            netProfit: isKasir ? 0 : netProfit,
            revenue: totalRevenue,
            expenses: isKasir ? 0 : opex,
            cogs: isKasir ? 0 : cogs,
            grossMargin: isKasir ? "0" : grossMargin.toFixed(1),
            totalAssets: isKasir ? 0 : actualTotalAssets,
            kas: isKasir ? 0 : kas,
            bank: isKasir ? 0 : bank,
            qris: isKasir ? 0 : qris,
            kasLiquid: isKasir ? 0 : kasLiquid,
            piutang: isKasir ? 0 : piutang,
            inventoryStats: {
                laptopQty: laptops.reduce((s, i) => s + i.quantity, 0),
                laptopValue: isKasir ? 0 : laptops.reduce((s, i) => s + (i.costPrice * i.quantity), 0),
                spareQty: spareParts.reduce((s, i) => s + i.quantity, 0),
                spareValue: isKasir ? 0 : spareParts.reduce((s, i) => s + (i.costPrice * i.quantity), 0),
                aksesorisQty: aksesoris.reduce((s, i) => s + i.quantity, 0),
                aksesorisValue: isKasir ? 0 : aksesoris.reduce((s, i) => s + (i.costPrice * i.quantity), 0),
                totalQty: totalInventoryQty,
                totalValue: isKasir ? 0 : totalInventoryValue
            },
            liabilities: isKasir ? 0 : liabilities,
            equity: isKasir ? 0 : (equity - prive),
            revenueDetails: { laptop: revLaptop, sparepart: revSparepart, aksesoris: revAksesoris, servis: revenueServis },
            grossMarginDetails: { 
                laptop: isKasir ? 0 : (revLaptop - cogsLaptopVal), 
                sparepart: isKasir ? 0 : (revSparepart - cogsSparepartVal), 
                aksesoris: isKasir ? 0 : (revAksesoris - cogsAksesorisVal), 
                servis: isKasir ? 0 : (revenueServis - cogsServisVal) 
            },
            opexDetails: isKasir ? {} : opexDetailsMap,
            totalTransactions: totalTx,
            recentTransactions,
            monthlyData: isKasir 
                ? realMonthlyData.map(d => ({ ...d, margin: 0, marginValue: 0 })) 
                : realMonthlyData,
            monthlyMarginData: isKasir ? [] : Array.from(monthlyMarginMap.values()),
            brandSalesData,
            topSellingProducts,
            growth: isKasir ? null : growth,
            // PRD Alert Widgets
            alerts: isKasir ? null : (() => {
                const now = new Date();
                const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                
                const slowMovingCount = allInventory.filter(i => 
                    i.quantity > 0 && 
                    new Date(i.createdAt) < thirtyDaysAgo &&
                    new Date(i.createdAt) >= sixtyDaysAgo
                ).length;
                
                const deadStockCount = allInventory.filter(i => 
                    i.quantity > 0 && 
                    new Date(i.createdAt) < sixtyDaysAgo
                ).length;
                
                const pendingQcCount = allInventory.filter(i => 
                    i.condition === 'IN_INSPECTION' && i.quantity > 0
                ).length;
                
                return {
                    slowMovingCount,
                    deadStockCount,
                    pendingQcCount,
                    totalAgingCount: slowMovingCount + deadStockCount,
                };
            })()
        });
    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
    }
}
