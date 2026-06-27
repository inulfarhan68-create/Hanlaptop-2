import { NextResponse } from "next/server";
import { db } from "@/db";
import { consignmentPayables, journalEntries, activityLogs, suppliers, inventory, transactions } from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "@/lib/auth-guard";
import { consignmentPaymentSchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get("status") || "UNPAID";

        const data = await db.query.consignmentPayables.findMany({
            where: authResult.storeId === "all" 
                ? eq(consignmentPayables.status, status)
                : and(
                    eq(consignmentPayables.storeId, authResult.storeId),
                    eq(consignmentPayables.status, status)
                ),
            orderBy: [desc(consignmentPayables.createdAt)],
            with: {
                supplier: true,
                inventory: true,
                transaction: true,
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Fetch Consignment Payables error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        const parsed = consignmentPaymentSchema.parse(body);

        return await db.transaction(async (tx) => {
            const payables = await tx.select().from(consignmentPayables).where(inArray(consignmentPayables.id, parsed.payableIds));

            if (payables.length === 0) {
                return NextResponse.json({ error: "No payables found" }, { status: 404 });
            }

            let totalPaid = 0;

            for (const payable of payables) {
                if (payable.status === 'PAID') continue;
                if (authResult.storeId !== "all" && payable.storeId !== authResult.storeId) continue;

                totalPaid += payable.amountDue;

                await tx.update(consignmentPayables)
                    .set({ status: 'PAID', paidAt: new Date() })
                    .where(eq(consignmentPayables.id, payable.id));
            }

            if (totalPaid > 0) {
                // Determine a transaction to hook these journal entries to, or create a 'Pembayaran Konsinyasi' dummy transaction
                const [dummyTx] = await tx.insert(transactions).values({
                    storeId: authResult.storeId,
                    invoiceNumber: `PAY-CONS-${Date.now()}`,
                    transactionType: 'Pembayaran Konsinyasi',
                    amount: totalPaid,
                    paymentMethod: 'Bank Transfer', // Bisa dibuat dinamis
                    paymentStatus: 'Lunas',
                    transactionDate: new Date(),
                    description: 'Pembayaran tagihan konsinyasi ke supplier',
                }).returning();

                await tx.insert(journalEntries).values([
                    {
                        transactionId: dummyTx.id,
                        accountName: 'Utang Konsinyasi',
                        debit: totalPaid,
                        credit: 0
                    },
                    {
                        transactionId: dummyTx.id,
                        accountName: 'Kas/Bank',
                        debit: 0,
                        credit: totalPaid
                    }
                ]);

                await tx.insert(activityLogs).values({
                    userId: authResult.user.id,
                    userName: authResult.user.name || 'Unknown',
                    action: 'PAY_CONSIGNMENT',
                    entityType: 'TRANSACTION',
                    entityId: dummyTx.id,
                    details: `Paid ${payables.length} consignment bills totaling ${totalPaid}`,
                });
            }

            return NextResponse.json({ success: true, totalPaid });
        });
    } catch (error: any) {
        console.error("Pay Consignment error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
