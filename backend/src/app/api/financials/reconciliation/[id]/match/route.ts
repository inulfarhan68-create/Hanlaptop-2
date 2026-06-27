import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankMutations, transactions, journalEntries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { requireOwnerOrManager } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const { id } = await context.params;
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { transactionId } = body;

        if (!transactionId) {
            return NextResponse.json({ error: "transactionId wajib disertakan." }, { status: 400 });
        }

        const mutation = await db.query.bankMutations.findFirst({
            where: and(
                eq(bankMutations.id, id),
                eq(bankMutations.storeId, authResult.storeId)
            )
        });

        if (!mutation) {
            return NextResponse.json({ error: "Mutasi bank tidak ditemukan." }, { status: 404 });
        }

        if (mutation.reconciled === 1) {
            return NextResponse.json({ error: "Mutasi bank ini sudah direkonsiliasi sebelumnya." }, { status: 400 });
        }

        const transaction = await db.query.transactions.findFirst({
            where: and(
                eq(transactions.id, transactionId),
                eq(transactions.storeId, authResult.storeId)
            )
        });

        if (!transaction) {
            return NextResponse.json({ error: "Transaksi tidak ditemukan." }, { status: 404 });
        }

        if (transaction.paymentStatus === "Lunas") {
            return NextResponse.json({ error: "Transaksi ini sudah lunas." }, { status: 400 });
        }

        // Process reconciliation inside database transaction
        const result = await db.transaction(async (tx) => {
            // 1. Mark mutation as reconciled
            await tx.update(bankMutations)
                .set({
                    reconciled: 1,
                    reconciledTransactionId: transactionId
                })
                .where(eq(bankMutations.id, id));

            // 2. Mark transaction as Lunas
            await tx.update(transactions)
                .set({
                    paymentStatus: "Lunas"
                })
                .where(eq(transactions.id, transactionId));

            // 3. Create journal entries: Debit Bank (mutation.amount), Credit Piutang Usaha (mutation.amount)
            await tx.insert(journalEntries).values([
                {
                    storeId: authResult.storeId,
                    transactionId,
                    accountName: "Bank",
                    debit: mutation.amount,
                    credit: 0
                },
                {
                    storeId: authResult.storeId,
                    transactionId,
                    accountName: "Piutang Usaha",
                    debit: 0,
                    credit: mutation.amount
                }
            ]);

            return { success: true };
        });

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Failed to reconcile transaction:", error);
        return NextResponse.json({ error: error.message || "Gagal mencocokkan transaksi." }, { status: 500 });
    }
}
