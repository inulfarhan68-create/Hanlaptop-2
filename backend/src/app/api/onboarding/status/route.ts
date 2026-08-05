import { NextResponse } from "next/server";
import { db } from "@/db";
import { inventory, transactions, storeSettings } from "@/db/schema";
import { requireAuth, storeScope } from "@/lib/auth-guard";
import { and, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * How far a new shop has got towards its first printed nota.
 *
 * A tenant that has just registered lands on /home and sees a wall of zeros:
 * every KPI empty, no indication of what to do first. Working that out is the
 * moment most trials are lost, and it is not obvious — this app can do POS,
 * service, accounting, HR and payroll, so "where do I start" is a real question.
 *
 * The three steps below are not a tour; they are the shortest path to the thing
 * a shop actually recognises as the product working: an item in stock, a sale
 * recorded, and a receipt with their own name on it rather than a blank header.
 */
export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const scope = (col: Parameters<typeof storeScope>[1]) => storeScope(authResult, col);

        const [identityRow, inventoryRow, transactionRow] = await Promise.all([
            // Identity counts as done only when all three print-critical fields are
            // filled. Empty strings are the norm here, not nulls: the settings
            // writer stores "" for anything the shop left blank, and the nota drops
            // blank lines rather than inventing an address (CLAUDE.md rule 16).
            db.select({ n: sql<number>`count(*)` })
                .from(storeSettings)
                // and() rather than one sql template: storeScope returns undefined
                // for platform_admin, which would splice a hole into raw SQL.
                .where(and(
                    scope(storeSettings.storeId),
                    sql`coalesce(${storeSettings.storeName}, '') <> ''`,
                    sql`coalesce(${storeSettings.storeAddress}, '') <> ''`,
                    sql`coalesce(${storeSettings.storePhone}, '') <> ''`
                )),
            db.select({ n: sql<number>`count(*)` }).from(inventory).where(scope(inventory.storeId)),
            db.select({ n: sql<number>`count(*)` }).from(transactions).where(scope(transactions.storeId)),
        ]);

        const steps = [
            {
                key: "identity",
                label: "Lengkapi identitas toko",
                hint: "Nama, alamat, dan telepon yang tercetak di nota pelanggan.",
                href: "/settings",
                done: Number(identityRow[0]?.n ?? 0) > 0,
            },
            {
                key: "inventory",
                label: "Tambah barang pertama",
                hint: "Satu unit saja cukup untuk mulai berjualan.",
                href: "/inventory",
                done: Number(inventoryRow[0]?.n ?? 0) > 0,
            },
            {
                key: "transaction",
                label: "Catat transaksi pertama",
                hint: "Nota otomatis dibuat dan siap dibagikan ke pelanggan.",
                href: "/transactions",
                done: Number(transactionRow[0]?.n ?? 0) > 0,
            },
        ];

        return NextResponse.json({
            steps,
            complete: steps.every((s) => s.done),
        });
    } catch (error) {
        console.error("Failed to compute onboarding status:", error);
        return NextResponse.json({ error: "Failed to compute onboarding status" }, { status: 500 });
    }
}
