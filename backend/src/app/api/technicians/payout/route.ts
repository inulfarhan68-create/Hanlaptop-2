import { NextResponse } from 'next/server';
import { db } from '@/db';
import { technicians, technicianCommissions, transactions, journalEntries, cashierShifts, storeSettings } from '@/db/schema';
import { requireAuth, requireWriteAccess } from '@/lib/auth-guard';
import { eq, and, inArray } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Pilih cabang terlebih dahulu untuk melakukan pencairan komisi" }, { status: 400 });
    }

    try {
        const body = await request.json();
        const { technicianId, commissionIds, paymentMethod } = body;

        if (!technicianId || !Array.isArray(commissionIds) || commissionIds.length === 0 || !paymentMethod) {
            return NextResponse.json({ error: "Parameter tidak lengkap" }, { status: 400 });
        }

        // Fetch technician
        const tech = await db.query.technicians.findFirst({
            where: and(
                eq(technicians.id, technicianId),
                eq(technicians.storeId, authResult.storeId)
            )
        });

        if (!tech) {
            return NextResponse.json({ error: "Teknisi tidak ditemukan" }, { status: 404 });
        }

        // Fetch commissions to process
        const commissions = await db.query.technicianCommissions.findMany({
            where: and(
                eq(technicianCommissions.storeId, authResult.storeId),
                eq(technicianCommissions.technicianId, technicianId),
                eq(technicianCommissions.status, 'UNPAID'),
                inArray(technicianCommissions.id, commissionIds)
            )
        });

        if (commissions.length === 0) {
            return NextResponse.json({ error: "Tidak ada komisi belum dibayar yang valid untuk dicairkan" }, { status: 400 });
        }

        const totalAmount = commissions.reduce((sum, c) => sum + (c.commissionAmount || 0), 0);
        if (totalAmount <= 0) {
            return NextResponse.json({ error: "Total pencairan komisi harus lebih dari 0" }, { status: 400 });
        }

        // Check active cashier shift if shift is enabled and user is kasir
        const settings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, authResult.storeId)
        });
        const isShiftEnabled = settings ? settings.enableCashierShift !== false : true;

        const activeShift = await db.query.cashierShifts.findFirst({
            where: and(
                eq(cashierShifts.storeId, authResult.storeId),
                eq(cashierShifts.userId, authResult.user.id),
                eq(cashierShifts.status, "OPEN")
            )
        });

        const isKasir = authResult.storeRole === "kasir" || (authResult.user as any).role === "kasir";
        if (isShiftEnabled && isKasir && !activeShift) {
            return NextResponse.json({ error: "Anda harus membuka shift kasir terlebih dahulu sebelum memproses pencairan komisi" }, { status: 400 });
        }

        // Map payment method to the correct liquid account
        const paymentAccountMap: Record<string, string> = {
            'Cash': 'Kas',
            'Transfer': 'Bank',
            'Transfer Bank': 'Bank',
            'Qris': 'QRIS',
        };
        const liquidAccount = paymentAccountMap[paymentMethod] || "Kas";

        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const randomCode = Math.floor(100 + Math.random() * 900);
        const invoiceNumber = `PAY/${year}/${month}/${randomCode}`;

        // Wrap operations in transaction to ensure consistency
        const payoutResult = await db.transaction(async (tx) => {
            // 1. Create Transaction
            const txId = crypto.randomUUID();
            const [newTx] = await tx.insert(transactions).values({
                id: txId,
                storeId: authResult.storeId,
                transactionType: "Operasional",
                amount: totalAmount,
                description: `Beban Gaji Karyawan - Pembayaran Komisi Teknisi: ${tech.name} (x${commissions.length} Servis)`,
                invoiceNumber: invoiceNumber,
                paymentMethod: paymentMethod,
                paymentStatus: "Lunas",
                userId: authResult.user.id,
                shiftId: activeShift?.id || null,
                transactionDate: now,
                createdAt: now
            }).returning();

            // 2. Insert Journal Entries
            await tx.insert(journalEntries).values([
                { storeId: authResult.storeId, transactionId: txId, accountName: "Beban Gaji Karyawan", debit: totalAmount, credit: 0 },
                { storeId: authResult.storeId, transactionId: txId, accountName: liquidAccount, debit: 0, credit: totalAmount }
            ]);

            // 3. Update commissions status
            await tx.update(technicianCommissions)
                .set({
                    status: 'PAID',
                    paidAt: now,
                    payoutTransactionId: txId
                })
                .where(inArray(technicianCommissions.id, commissionIds));

            return newTx;
        });

        return NextResponse.json({
            success: true,
            transaction: payoutResult,
            payoutCount: commissions.length,
            totalAmount: totalAmount
        });

    } catch (error: any) {
        console.error("Failed to process payout:", error);
        return NextResponse.json({ error: error.message || "Gagal memproses pencairan komisi" }, { status: 500 });
    }
}
