import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, stores, storeSettings } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireOwner, requireOwnerOrManager, requireWriteAccess, requirePermission } from "@/lib/auth-guard";
import { Permissions, hasPermission } from "@/lib/permissions";
import { transactionSchema } from "@/lib/validators";
import { getAccountCodeFromName } from "@/services/JournalMappingService";
import { AuditService } from "@/services/AuditService";

/**
 * Helper to create journal entry with account_code auto-mapped
 */
function createJournalEntry(storeId: string, transactionId: string, accountName: string, debit: number, credit: number) {
    return {
        storeId,
        transactionId,
        accountName,
        accountCode: getAccountCodeFromName(accountName),
        debit,
        credit
    };
}

/**
 * Helper: Verify transaction belongs to user's store (SaaS Tenant Isolation)
 * Returns the transaction if authorized, or a NextResponse if forbidden.
 */
async function verifyTransactionAccess(authResult: any, transactionId: string) {
    // Owner (global) can access all transactions
    if (authResult.user.role === "owner" || authResult.storeId === "all") {
        const tx = await db.query.transactions.findFirst({
            where: eq(transactions.id, transactionId)
        });
        return tx ? { tx, authorized: true } : { tx: null, authorized: false, response: NextResponse.json({ error: "Transaction not found" }, { status: 404 }) };
    }

    // Non-owner: must check storeId match
    const tx = await db.query.transactions.findFirst({
        where: and(
            eq(transactions.id, transactionId),
            eq(transactions.storeId, authResult.storeId)
        )
    });

    if (!tx) {
        return {
            tx: null,
            authorized: false,
            response: NextResponse.json({ error: "Transaction not found or access denied" }, { status: 404 })
        };
    }

    return { tx, authorized: true };
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requirePermission(Permissions.TRANSACTION_READ);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify transaction belongs to user's store
    const { tx, authorized, response } = await verifyTransactionAccess(authResult, id);
    if (!authorized) return response;

    try {
        // Fetch with items and journals (already verified storeId)
        const txWithDetails = await db.query.transactions.findFirst({
            where: eq(transactions.id, id),
            with: {
                items: {
                    with: {
                        inventoryItem: true
                    }
                },
                journals: true
            }
        });

        const log = await db.query.activityLogs.findFirst({
            where: and(
                eq(activityLogs.action, "CREATE_TRANSACTION"),
                eq(activityLogs.entityId, tx!.id)
            )
        });

        const txStore = await db.query.stores.findFirst({
            where: eq(stores.id, tx!.storeId)
        });

        const txSettings = await db.query.storeSettings.findFirst({
            where: eq(storeSettings.storeId, tx!.storeId)
        });

        let parsedBanks = [];
        if (txSettings?.storeBanks) {
            try {
                parsedBanks = JSON.parse(txSettings.storeBanks);
            } catch (e) {
                console.error("Failed to parse storeBanks", e);
            }
        }

        const sanitizedItems = (txWithDetails?.items || []).map(item => {
            if (authResult.storeRole === "kasir" && item.inventoryItem) {
                return {
                    ...item,
                    inventoryItem: {
                        ...item.inventoryItem,
                        costPrice: 0
                    }
                };
            }
            return item;
        });

        return NextResponse.json({
            ...txWithDetails,
            items: sanitizedItems,
            creatorName: log?.userName || "Kasir",
            store: {
                name: txSettings?.storeName || txStore?.name || "HanLaptop",
                address: txSettings?.storeAddress || txStore?.address || "Jl. Cibiru Tonggoh, Kp. Babakan Biru 002/008, Cibiru Wetan, Cileunyi, Kab. Bandung",
                phone: txSettings?.storePhone || txStore?.phone || "085161870922",
                logo: txSettings?.storeLogo || null,
                signature: txSettings?.storeSignature || null,
                footer: txSettings?.storeFooter || "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.",
                waTemplateNota: txSettings?.waTemplateNota || null,
                banks: parsedBanks
            }
        });
    } catch (error) {
        console.error("Failed to fetch transaction:", error);
        return NextResponse.json({ error: "Failed to fetch transaction" }, { status: 500 });
    }
}

// EDIT Transaksi Penuh (Rollback + Reapply)
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requirePermission(Permissions.TRANSACTION_EDIT_METADATA);
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify transaction belongs to user's store
    const { tx: existingTx, authorized, response } = await verifyTransactionAccess(authResult, id);
    if (!authorized) return response;

    try {
        const body = await request.json();
        const parsed = transactionSchema.partial().safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { transactionType, amount, items, customerName, description, paymentMethod, paymentStatus, dueDate } = parsed.data;

        // Strict ERP Immutability Rule: Cannot edit items or financial amounts.
        if (items || amount !== undefined || transactionType) {
            return NextResponse.json({ error: "ERP Immutability Rule: Modifying financial amount or transaction items is strictly prohibited. Please VOID this transaction and create a new one." }, { status: 403 });
        }

        // Fetch old state for Enterprise Audit Logging (SOC 2 Type II)
        const oldState = existingTx;

        const [updated] = await db.update(transactions)
            .set({
                customerName,
                description,
                paymentMethod,
                paymentStatus,
                dueDate: dueDate !== undefined ? dueDate : undefined
            })
            .where(and(
                eq(transactions.id, id),
                // 🔒 Double-check storeId in update query for extra security
                authResult.storeId !== "all" ? eq(transactions.storeId, authResult.storeId) : undefined
            ))
            .returning();

        // Extract request IP and User Agent if possible (simulated via headers in production)
        const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        // Log activity with Enterprise Audit structure
        await db.insert(activityLogs).values({
            storeId: authResult.storeId !== "all" ? authResult.storeId : existingTx!.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_TRANSACTION_METADATA",
            entityType: "transaction",
            entityId: id,
            details: JSON.stringify({
                oldData: {
                    customerName: oldState?.customerName,
                    description: oldState?.description,
                    paymentStatus: oldState?.paymentStatus
                },
                newData: {
                    customerName: updated?.customerName,
                    description: updated?.description,
                    paymentStatus: updated?.paymentStatus
                },
                ipAddress,
                userAgent
            })
        });

        return NextResponse.json(updated);
    } catch (error: any) {
        console.error("Failed to update transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to update transaction" }, { status: 500 });
    }
}

// VOID Transaksi (Rollback Stok & Tandai Void, TIDAK HAPUS FISIK)
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify transaction belongs to user's store
    const { tx: existingTx, authorized, response } = await verifyTransactionAccess(authResult, id);
    if (!authorized) return response;

    try {
        // 1. Check if user has direct void permission
        const canVoid = hasPermission(authResult.storeRole, Permissions.TRANSACTION_VOID);

        if (!canVoid) {
            // 2. Workflow Engine Interception
            // If they don't have permission (e.g. Kasir), create an approval request
            const { createApprovalRequest } = await import("@/lib/workflow");
            await createApprovalRequest({
                storeId: authResult.storeId !== "all" ? authResult.storeId : existingTx!.storeId,
                requesterId: authResult.user.id,
                actionType: "VOID_TRANSACTION",
                referenceId: id,
                payload: { reason: "Requested void by Cashier" }
            });
            return NextResponse.json({
                success: false,
                approvalRequired: true,
                message: "Aksi ini memerlukan persetujuan Manajer. Permintaan telah dikirim."
            });
        }

        // 3. User has permission, proceed with Void
        await db.transaction(async (tx) => {
            // Re-fetch inside transaction to ensure consistency
            const trx = await tx.query.transactions.findFirst({
                where: and(
                    eq(transactions.id, id),
                    // 🔒 Double-check storeId in transaction
                    authResult.storeId !== "all" ? eq(transactions.storeId, authResult.storeId) : undefined
                ),
                with: { items: true }
            });

            if (!trx) throw new Error("Transaction not found");
            if (trx.isVoided) throw new Error("Transaction is already voided");

            // Rollback Stok Atomically
            if (trx.transactionType === "Penjualan") {
                for (const item of trx.items) {
                    if (item.inventoryId) {
                        const { sql } = require("drizzle-orm");
                        await tx.update(inventory)
                            .set({ quantity: sql`${inventory.quantity} + ${item.quantity}` })
                            .where(and(
                                eq(inventory.id, item.inventoryId),
                                // 🔒 Ensure inventory belongs to same store
                                authResult.storeId !== "all" ? eq(inventory.storeId, trx.storeId) : undefined
                            ));
                    }
                }
            } else if (trx.transactionType === "Pembelian Stok") {
                for (const item of trx.items) {
                    if (item.inventoryId) {
                        const { sql, and: andOp, gte } = require("drizzle-orm");
                        const updated = await tx.update(inventory)
                            .set({ quantity: sql`${inventory.quantity} - ${item.quantity}` })
                            .where(andOp(
                                eq(inventory.id, item.inventoryId),
                                gte(inventory.quantity, item.quantity),
                                // 🔒 Ensure inventory belongs to same store
                                authResult.storeId !== "all" ? eq(inventory.storeId, trx.storeId) : undefined
                            ))
                            .returning();

                        if (updated.length === 0) {
                            throw new Error(`Cannot void restock: insufficient current stock for item ${item.inventoryId}`);
                        }
                    }
                }
            }

            // Tandai Transaksi dan Jurnal sebagai Void (TIDAK DIHAPUS FISIK)
            await tx.update(transactions).set({ isVoided: true }).where(eq(transactions.id, id));
            await tx.update(journalEntries).set({ isVoided: true }).where(and(
                eq(journalEntries.transactionId, id),
                // 🔒 Only void journals belonging to this store
                authResult.storeId !== "all" ? eq(journalEntries.storeId, trx.storeId) : undefined
            ));

            // Log activity
            await tx.insert(activityLogs).values({
                storeId: trx.storeId,
                userId: authResult.user.id,
                userName: authResult.user.name,
                action: "VOID_TRANSACTION",
                entityType: "transaction",
                entityId: id,
                details: "{}"
            });

            // ── SaaS Audit Trail ──
            const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
            const userAgent = request.headers.get("user-agent") || "unknown";

            AuditService.log({
                storeId: trx.storeId,
                userId: authResult.user.id,
                action: 'DELETE',
                entity: 'TRANSACTION',
                entityId: id,
                oldValue: trx,
                newValue: { ...trx, isVoided: true },
                req: request as any
            });
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Failed to void transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to void transaction" }, { status: 500 });
    }
}

// LUNASI Piutang / Hutang
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const { id } = await context.params;

    // 🔒 SaaS Tenant Isolation: Verify transaction belongs to user's store
    const { tx: existingTx, authorized, response } = await verifyTransactionAccess(authResult, id);
    if (!authorized) return response;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        // Re-fetch with storeId check for security
        const trx = await db.query.transactions.findFirst({
            where: and(
                eq(transactions.id, id),
                // 🔒 Double-check storeId
                authResult.storeId !== "all" ? eq(transactions.storeId, authResult.storeId) : undefined
            )
        });

        if (!trx) throw new Error("Transaction not found");
        if (trx.isVoided) throw new Error("Transaksi telah dibatalkan (voided) dan tidak dapat dilunasi");
        if (trx.paymentStatus === "Lunas") throw new Error("Transaction is already paid off");

        // Calculate remaining amount
        const sisaTagihan = trx.amount - (trx.dpAmount || 0);

        if (sisaTagihan <= 0) throw new Error("No remaining amount to be paid");

        // Update Transaction
        const [updated] = await db.update(transactions)
            .set({
                paymentStatus: "Lunas"
            })
            .where(and(
                eq(transactions.id, id),
                // 🔒 Double-check storeId in update
                authResult.storeId !== "all" ? eq(transactions.storeId, authResult.storeId) : undefined
            ))
            .returning();

        // Tambah Jurnal Pelunasan
        if (trx.transactionType === "Penjualan" || trx.transactionType === "Jasa Servis") {
            // Pelunasan Piutang: Kas bertambah (debit), Piutang berkurang (credit)
            await db.insert(journalEntries).values([
                createJournalEntry(trx.storeId, id, "Kas", sisaTagihan, 0),
                createJournalEntry(trx.storeId, id, "Piutang Usaha", 0, sisaTagihan)
            ]);
        } else if (trx.transactionType === "Pembelian Stok") {
            // Pelunasan Hutang: Hutang berkurang (debit), Kas berkurang (credit)
            await db.insert(journalEntries).values([
                createJournalEntry(trx.storeId, id, "Utang Usaha", sisaTagihan, 0),
                createJournalEntry(trx.storeId, id, "Kas", 0, sisaTagihan)
            ]);
        }

        const result = updated;

        // Log activity
        await db.insert(activityLogs).values({
            storeId: trx.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "PAYOFF_TRANSACTION",
            entityType: "transaction",
            entityId: id,
            details: JSON.stringify({ paidAmount: sisaTagihan })
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Failed to patch transaction:", error);
        return NextResponse.json({ error: error.message || "Failed to process payment" }, { status: 500 });
    }
}
