import { db } from "@/db";
import { approvalRequests, transactions, journalEntries, cashierShifts, userStoreAccess } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";
import { requireAuth, storeScope } from "@/lib/auth-guard";

export const dynamic = 'force-dynamic';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    // Only managers or owners can approve/reject
    if (authResult.storeRole !== "owner" && authResult.storeRole !== "manager" && authResult.user.role !== "owner" && authResult.user.role !== "platform_admin") {
        return NextResponse.json({ error: "Akses ditolak. Anda bukan Manager/Owner." }, { status: 403 });
    }

    try {
        const { id } = await context.params;
        const body = await request.json();
        const action = body.action; // 'APPROVE' or 'REJECT'
        const notes = body.notes || null;

        if (action !== 'APPROVE' && action !== 'REJECT') {
            return NextResponse.json({ error: "Invalid action" }, { status: 400 });
        }

        // 🔒 SaaS Tenant Isolation: storeScope handles platform_admin vs tenant
        const approvalReq = await db.query.approvalRequests.findFirst({
            where: and(
                eq(approvalRequests.id, id),
                storeScope(authResult, approvalRequests.storeId)
            )
        });

        if (!approvalReq) {
            return NextResponse.json({ error: "Approval request not found or access denied" }, { status: 404 });
        }

        if (approvalReq.status !== "PENDING") {
            return NextResponse.json({ error: "Request ini sudah diproses sebelumnya." }, { status: 400 });
        }

        // Use the actual storeId from the approval request (not the user's selected storeId)
        const actualStoreId = approvalReq.storeId;

        // --- REJECT LOGIC ---
        if (action === 'REJECT') {
            await db.update(approvalRequests)
                .set({
                    status: 'REJECTED',
                    approverId: authResult.user.id,
                    approvalNotes: notes,
                    updatedAt: new Date()
                })
                .where(eq(approvalRequests.id, id));
                
            return NextResponse.json({ success: true, message: "Request ditolak" });
        }

        // --- APPROVE & EXECUTE LOGIC ---
        if (action === 'APPROVE') {
            if (approvalReq.actionType === 'VOID_TRANSACTION') {
                const transactionId = approvalReq.referenceId;
                if (!transactionId) {
                    throw new Error("Missing transaction reference ID");
                }

                // Check if transaction exists
                const existing = await db.query.transactions.findFirst({
                    where: eq(transactions.id, transactionId),
                    with: {
                        items: true
                    }
                });

                if (!existing) {
                    throw new Error("Transaksi tidak ditemukan saat eksekusi Void");
                }

                if (existing.isVoided) {
                    throw new Error("Transaksi sudah berstatus Void");
                }

                // Execute the Void process within a transaction
                await db.transaction(async (tx) => {
                    // 1. Mark transaction as voided
                    await tx.update(transactions)
                        .set({ isVoided: true })
                        .where(eq(transactions.id, transactionId));

                    // 2. Reverse Journals
                    const journals = await tx.select().from(journalEntries).where(eq(journalEntries.transactionId, transactionId));
                    for (const journal of journals) {
                        await tx.update(journalEntries)
                            .set({ isVoided: true })
                            .where(eq(journalEntries.id, journal.id));
                    }
                    
                    // 3. Revert Digital Passports
                    const items = existing.items;
                    for (const item of items) {
                        if (item.serialNumbers) {
                            let sns: string[] = [];
                            try { sns = JSON.parse(item.serialNumbers); } catch (e) {}
                            
                            const { transitionDeviceStatus } = await import('@/lib/digital-passport');
                            for (const sn of sns) {
                                try {
                                    await transitionDeviceStatus(
                                        actualStoreId,
                                        sn,
                                        'READY_FOR_SALE',
                                        authResult.user.id,
                                        transactionId,
                                        `Void Transaction ${transactionId}`,
                                        tx
                                    );
                                } catch(e) {
                                    console.error(`Void: failed to revert passport for SN ${sn}`);
                                }
                            }
                        }
                    }

                    // 4. Mark approval as approved
                    await tx.update(approvalRequests)
                        .set({
                            status: 'APPROVED',
                            approverId: authResult.user.id,
                            approvalNotes: notes,
                            updatedAt: new Date()
                        })
                        .where(eq(approvalRequests.id, id));
                });
            }

            return NextResponse.json({ success: true, message: "Request disetujui dan dieksekusi" });
        }

    } catch (error: any) {
        console.error("Approval execution error:", error);
        return NextResponse.json({ error: "Gagal memproses persetujuan", details: error.message }, { status: 500 });
    }
}
