import { NextResponse } from "next/server";
import { db } from "@/db";
import { journalEntries, inventory } from "@/db/schema";
import { and, gte, lte, sum, eq } from "drizzle-orm";
import { requireReportAccess } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireReportAccess();
    if (authResult instanceof NextResponse) return authResult;

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

        const storeCond = authResult.storeId !== "all" ? eq(journalEntries.storeId, authResult.storeId) : undefined;
        const invStoreCond = authResult.storeId !== "all" ? eq(inventory.storeId, authResult.storeId) : undefined;

        const [journalBalances, periodJournals, allInventory] = await Promise.all([
            db.select({ accountName: journalEntries.accountName, totalDebit: sum(journalEntries.debit).mapWith(Number), totalCredit: sum(journalEntries.credit).mapWith(Number) }).from(journalEntries).where(storeCond).groupBy(journalEntries.accountName),
            db.select().from(journalEntries).where(conditions.length > 0 ? and(...conditions) : undefined),
            db.select().from(inventory).where(invStoreCond)
        ]);

        let revenueLaptop = 0;
        let revenueServis = 0;
        let cogs = 0;
        let opexGaji = 0;
        let opexListrik = 0;
        let opexSewa = 0;
        let opexLainnya = 0;
        let kas = 0;
        let persediaan = 0;
        let liabilities = 0;
        let equity = 0;
        let prive = 0;
        let piutang = 0;
        let hutangUsaha = 0;
        let hutangBank = 0;

        periodJournals.forEach(entry => {
            if (entry.accountName === "Pendapatan") {
                revenueLaptop += entry.credit - entry.debit;
            } else if (entry.accountName === "Pendapatan Servis") {
                revenueServis += entry.credit - entry.debit;
            } else if (entry.accountName === "HPP") {
                cogs += entry.debit - entry.credit;
            } else if (entry.accountName === "Beban Gaji Karyawan") {
                opexGaji += entry.debit - entry.credit;
            } else if (entry.accountName === "Beban Listrik & Internet") {
                opexListrik += entry.debit - entry.credit;
            } else if (entry.accountName === "Beban Sewa Tempat") {
                opexSewa += entry.debit - entry.credit;
            } else if (entry.accountName.includes("Beban")) {
                opexLainnya += entry.debit - entry.credit;
            }
        });

        let cumulativeRevenue = 0;
        let cumulativeCogs = 0;
        let cumulativeOpex = 0;

        let kliring = 0;

        journalBalances.forEach(entry => {
            const deb = entry.totalDebit || 0;
            const cred = entry.totalCredit || 0;
            if (entry.accountName === "Kas" || entry.accountName === "Bank" || entry.accountName === "QRIS") {
                kas += deb - cred;
            } else if (entry.accountName === "Modal Pemilik") {
                equity += cred - deb;
            } else if (entry.accountName === "Prive") {
                prive += deb - cred;
            } else if (entry.accountName === "Piutang Usaha") {
                piutang += deb - cred;
            } else if (entry.accountName === "Hutang Usaha") {
                hutangUsaha += cred - deb;
            } else if (entry.accountName === "Hutang Bank") {
                hutangBank += cred - deb;
            } else if (entry.accountName === "Kliring Antar Cabang") {
                kliring += deb - cred;
            } else if (entry.accountName === "Pendapatan" || entry.accountName === "Pendapatan Servis") {
                cumulativeRevenue += cred - deb;
            } else if (entry.accountName === "HPP") {
                cumulativeCogs += deb - cred;
            } else if (entry.accountName.includes("Beban")) {
                cumulativeOpex += deb - cred;
            }
        });

        const totalRevenue = revenueLaptop + revenueServis;
        const totalOpex = opexGaji + opexListrik + opexSewa + opexLainnya;
        const netProfit = totalRevenue - cogs - totalOpex;
        const totalEquity = equity - prive;
        const cumulativeNetProfit = cumulativeRevenue - cumulativeCogs - cumulativeOpex;

        persediaan = allInventory.reduce((sum, i) => sum + (i.costPrice * i.quantity), 0);

        return NextResponse.json({
            period: from && to ? `${from} to ${to}` : "all",
            revenue: {
                laptop: revenueLaptop,
                servis: revenueServis
            },
            cogs,
            opex: {
                gaji: opexGaji,
                listrik: opexListrik,
                sewa: opexSewa,
                lainnya: opexLainnya
            },
            assets: {
                kas: kas,
                piutang: piutang,
                inventory: persediaan,
                kliring: kliring > 0 ? kliring : 0
            },
            liabilities: hutangUsaha + hutangBank + (kliring < 0 ? -kliring : 0),
            liabilitiesDetail: {
                hutangUsaha,
                hutangBank,
                kliring: kliring < 0 ? -kliring : 0
            },
            equity: totalEquity,
            cumulativeNetProfit
        });
    } catch (error) {
        console.error("Failed to generate report:", error);
        return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
    }
}
