import { transactions } from "@/db/schema";
import { and, gte, eq, like, desc } from "drizzle-orm";

/**
 * Generate the next sequential invoice/document number for a store in the given
 * month, e.g. "SRV/2026/07/004". Scans the latest existing number with the same
 * `DOCTYPE/YYYY/MM/` prefix and increments it (3-digit, zero-padded — which also
 * makes the string ordering correct).
 *
 * Shared by sales (INV), service (SRV) and warranty (GRN) transactions so every
 * document type is sequential and auditable. Service/warranty numbers used to be
 * a random 3-digit code (Math.random), which risked duplicate invoice numbers.
 *
 * Pass a transaction client to run inside a db.transaction(); defaults to reading
 * via the same client the caller provides.
 */
export async function generateInvoiceNumber(
    client: any,
    storeId: string,
    docType: "INV" | "SRV" | "GRN",
    when: Date = new Date()
): Promise<string> {
    const year = when.getFullYear();
    const month = String(when.getMonth() + 1).padStart(2, "0");
    const startOfMonth = new Date(year, when.getMonth(), 1);
    const prefix = `${docType}/${year}/${month}/`;

    const conditions = [
        gte(transactions.transactionDate, startOfMonth),
        like(transactions.invoiceNumber, `${prefix}%`),
    ];
    if (storeId !== "all") conditions.push(eq(transactions.storeId, storeId));

    const latest = await client
        .select({ invoiceNumber: transactions.invoiceNumber })
        .from(transactions)
        .where(and(...conditions))
        .orderBy(desc(transactions.invoiceNumber))
        .limit(1);

    let seq = 1;
    if (latest.length > 0 && latest[0].invoiceNumber) {
        const parts = latest[0].invoiceNumber.split("/");
        const lastNum = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastNum)) seq = lastNum + 1;
    }

    return `${prefix}${String(seq).padStart(3, "0")}`;
}
