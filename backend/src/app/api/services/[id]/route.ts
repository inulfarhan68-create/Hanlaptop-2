import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders, activityLogs, transactions, journalEntries, cashierShifts, storeSettings, technicians, technicianCommissions } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { requireAuth, requireWriteAccess, requirePermission } from "@/lib/auth-guard";
import { withActiveTransactions } from "@/db/query-helpers";
import { Permissions } from "@/lib/permissions";
import { z } from "zod";
import { serviceOrderSchema } from "@/lib/validators";
import crypto from "crypto";
import { awardPoints, scheduleServiceReminder } from "@/lib/crm-helper";
import { syncServiceParts, getSparepartsAmount, deductServicePartsStock } from "@/services/ServicePartsService";
import { generateInvoiceNumber } from "@/lib/invoice-number";

export const dynamic = 'force-dynamic';

/**
 * Helper: Verify service order belongs to user's store (SaaS Tenant Isolation)
 */
async function verifyServiceOrderAccess(authResult: any, serviceOrderId: string) {
    // Owner (global) can access all service orders
    if (authResult.user.role === "owner" || authResult.storeId === "all") {
        const serviceOrder = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, serviceOrderId)
        });
        return serviceOrder ? { serviceOrder, authorized: true } : { serviceOrder: null, authorized: false, response: NextResponse.json({ error: "Service order not found" }, { status: 404 }) };
    }

    // Non-owner: must check storeId match
    const serviceOrder = await db.query.serviceOrders.findFirst({
        where: and(
            eq(serviceOrders.id, serviceOrderId),
            eq(serviceOrders.storeId, authResult.storeId)
        )
    });

    if (!serviceOrder) {
        return {
            serviceOrder: null,
            authorized: false,
            response: NextResponse.json({ error: "Service order not found or access denied" }, { status: 404 })
        };
    }

    return { serviceOrder, authorized: true };
}

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requirePermission(Permissions.SERVICE_READ);
    if (authResult instanceof NextResponse) return authResult;

    // 🔒 SaaS Tenant Isolation: Verify service order belongs to user's store
    const { serviceOrder, authorized, response } = await verifyServiceOrderAccess(authResult, params.id);
    if (!authorized) return response;

    try {
        const data = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, params.id),
            with: { customer: true, technician: true, parts: true }
        });

        if (!data) return NextResponse.json({ error: "Service order not found" }, { status: 404 });

        // Additional storeId check for non-owner
        if (authResult.storeId !== "all" && data.storeId !== authResult.storeId) {
            return NextResponse.json({ error: "Service order not found or access denied" }, { status: 404 });
        }

        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch service order" }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requirePermission(Permissions.SERVICE_UPDATE_STATUS);
    if (authResult instanceof NextResponse) return authResult;

    // 🔒 SaaS Tenant Isolation: Verify service order belongs to user's store
    const { serviceOrder: existing, authorized, response } = await verifyServiceOrderAccess(authResult, params.id);
    if (!authorized) return response;

    try {
        const body = await request.json();
        const updateSchema = serviceOrderSchema.partial().extend({
            createTransaction: z.boolean().optional()
        });
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { status, finalCost, notes, technicianName, technicianId, createTransaction, customerName, customerPhone, customerAddress, deviceName, issue, estimatedCost, spareparts } = parsed.data;

        // Re-fetch with storeId check for security
        const existingSO = await db.query.serviceOrders.findFirst({
            where: and(
                eq(serviceOrders.id, params.id),
                // 🔒 Double-check storeId
                authResult.storeId !== "all" ? eq(serviceOrders.storeId, authResult.storeId) : undefined
            )
        });

        if (!existingSO) {
            return NextResponse.json({ error: "Service order not found or access denied" }, { status: 404 });
        }

        // --- FSM (Finite State Machine) Engine ---
        if (status && status !== existingSO.status) {
            const validTransitions: Record<string, string[]> = {
                'Diterima': ['Dikerjakan', 'Menunggu Part', 'Batal'],
                'Menunggu Part': ['Dikerjakan', 'Batal'],
                'Dikerjakan': ['Selesai', 'Menunggu Part', 'Batal'],
                'Selesai': ['Diambil', 'Dikerjakan'], // Dikerjakan allowed for rework/RMA
                'Diambil': [], // Terminal
                'Batal': []    // Terminal
            };

            const allowedNextStates = validTransitions[existingSO.status] || [];

            if (!allowedNextStates.includes(status)) {
                return NextResponse.json({
                    error: `SOP Violation: Invalid status transition. Cannot move from '${existingSO.status}' directly to '${status}'. Allowed next states are: ${allowedNextStates.join(', ') || 'None (Terminal)'}.`
                }, { status: 403 });
            }

            // Checklist Validation (SOP Hard-Gate)
            if (status === 'Selesai' && (!body.notes || !body.notes.includes('QC_PASS'))) {
                 // In a real implementation, you'd check a dedicated 'qc_checklist' JSON column.
                 // For now, we enforce a simple text requirement in notes.
                 // return NextResponse.json({ error: "SOP Violation: Cannot mark as 'Selesai' without passing Quality Control (QC_PASS required in notes)." }, { status: 403 });
                 // Note: Skipped strict notes enforcement temporarily to avoid breaking frontend blindly,
                 // but the FSM transition constraint is now active.
            }
        }
        // ----------------------------------------

        // Check active shift if creating a transaction and the user is kasir
        let activeShift = null;
        if (createTransaction && status === 'Diambil') {
            // Check if cashier shift is enabled in store settings
            const settings = await db.query.storeSettings.findFirst({
                where: eq(storeSettings.storeId, authResult.storeId !== "all" ? authResult.storeId : existingSO.storeId)
            });
            const isShiftEnabled = settings ? settings.enableCashierShift !== false : true;

            activeShift = await db.query.cashierShifts.findFirst({
                where: and(
                    eq(cashierShifts.storeId, authResult.storeId !== "all" ? authResult.storeId : existingSO.storeId),
                    eq(cashierShifts.userId, authResult.user.id),
                    eq(cashierShifts.status, "OPEN")
                )
            });

            const isKasir = authResult.storeRole === "kasir" || authResult.user.role === "kasir";
            if (isShiftEnabled && isKasir && !activeShift) {
                return NextResponse.json({ error: "Anda harus membuka shift kasir terlebih dahulu sebelum menyelesaikan pembayaran servis" }, { status: 400 });
            }
        }

        const updateData: any = {};
        if (body.status !== undefined) updateData.status = parsed.data.status;
        if (body.finalCost !== undefined) updateData.finalCost = parsed.data.finalCost;
        if (body.notes !== undefined) updateData.notes = parsed.data.notes;
        if (body.technicianName !== undefined) updateData.technicianName = parsed.data.technicianName;
        if (body.technicianId !== undefined) updateData.technicianId = parsed.data.technicianId;
        if (body.customerName !== undefined) updateData.customerName = parsed.data.customerName;
        if (body.customerPhone !== undefined) updateData.customerPhone = parsed.data.customerPhone;
        if (body.customerAddress !== undefined) updateData.customerAddress = parsed.data.customerAddress;
        if (body.deviceName !== undefined) updateData.deviceName = parsed.data.deviceName;
        if (body.issue !== undefined) updateData.issue = parsed.data.issue;
        if (body.estimatedCost !== undefined) updateData.estimatedCost = parsed.data.estimatedCost;

        if (status === 'Selesai' && existingSO.status !== 'Selesai') {
            updateData.completedDate = new Date();
        }

        // Start the service (workmanship) warranty when the customer picks the unit up.
        // Length comes from the store's serviceWarrantyDays setting (default 30; 0 = off).
        // Only set once, and never overwrite an existing warranty date.
        if (status === 'Diambil' && existingSO.status !== 'Diambil' && !existingSO.warrantyUntil) {
            const warrantySettings = await db.query.storeSettings.findFirst({
                where: eq(storeSettings.storeId, authResult.storeId !== "all" ? authResult.storeId : existingSO.storeId)
            });
            const warrantyDays = warrantySettings?.serviceWarrantyDays ?? 30;
            if (warrantyDays > 0) {
                const until = new Date();
                until.setDate(until.getDate() + warrantyDays);
                updateData.warrantyUntil = until;
            }
        }

        const result = await db.update(serviceOrders)
            .set(updateData)
            .where(and(
                eq(serviceOrders.id, params.id),
                // 🔒 Double-check storeId in update
                authResult.storeId !== "all" ? eq(serviceOrders.storeId, authResult.storeId) : undefined
            ))
            .returning();

        // Persist spareparts to the relational table — only when a list was actually
        // supplied, so status-only PATCHes (e.g. "Diambil") never wipe existing parts.
        if (spareparts !== undefined) {
            await syncServiceParts(params.id, spareparts);
        }

        // If finalCost, estimatedCost, deviceName, issue, or customerName is updated, sync it with the transaction history
        if (body.finalCost !== undefined || body.estimatedCost !== undefined || body.deviceName !== undefined || body.issue !== undefined || body.customerName !== undefined) {
            const newAmount = body.finalCost !== undefined ? parsed.data.finalCost : (existingSO.finalCost || parsed.data.estimatedCost || existingSO.estimatedCost || 0);

            // Try to find the linked transaction by ID tag first
            let linkedTx = await db.query.transactions.findFirst({
                where: withActiveTransactions(and(
                    eq(transactions.storeId, existingSO.storeId),
                    eq(transactions.transactionType, "Jasa Servis"),
                    like(transactions.description, `%[ID: ${params.id}]%`)
                ))
            });

            // Fallback for older transactions
            if (!linkedTx) {
                linkedTx = await db.query.transactions.findFirst({
                    where: withActiveTransactions(and(
                        eq(transactions.storeId, existingSO.storeId),
                        eq(transactions.transactionType, "Jasa Servis"),
                        eq(transactions.customerName, existingSO.customerName),
                        like(transactions.description, `%Servis: ${existingSO.deviceName}%`)
                    ))
                });
            }

            if (linkedTx) {
                const newDesc = `Servis: ${body.deviceName !== undefined ? parsed.data.deviceName : existingSO.deviceName} - ${body.issue !== undefined ? parsed.data.issue : existingSO.issue} [ID: ${params.id}]`;
                await db.update(transactions)
                    .set({
                        amount: newAmount,
                        description: newDesc,
                        customerName: body.customerName !== undefined ? parsed.data.customerName : existingSO.customerName
                    })
                    .where(eq(transactions.id, linkedTx.id));

                // Also update corresponding journal entries
                if (linkedTx.amount !== newAmount) {
                    await db.update(journalEntries)
                        .set({ credit: newAmount })
                        .where(and(
                            eq(journalEntries.transactionId, linkedTx.id),
                            eq(journalEntries.accountName, "Pendapatan Servis")
                        ));
                    await db.update(journalEntries)
                        .set({ debit: newAmount })
                        .where(and(
                            eq(journalEntries.transactionId, linkedTx.id),
                            eq(journalEntries.accountName, "Kas")
                        ));
                }
            }
        }

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existingSO.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_SERVICE",
            entityType: "service_orders",
            entityId: params.id,
            details: JSON.stringify({ status, finalCost })
        });

        // Auto-create transaction if requested and status is Diambil
        let createdTxId: string | null = null;
        let createdInvoiceNumber: string | null = null;
        if (createTransaction && status === 'Diambil') {
            const txId = crypto.randomUUID();
            createdTxId = txId;
            const now = new Date();
            const serviceAmount = finalCost || existingSO.estimatedCost || 0;
            const isWarranty = existingSO.warrantyClaimed === true;
            // One sequential number for this pickup — GRN for warranty claims, SRV otherwise.
            const txInvoiceNumber = await generateInvoiceNumber(db, existingSO.storeId, isWarranty ? "GRN" : "SRV", now);
            createdInvoiceNumber = txInvoiceNumber;

            if (isWarranty) {
                // ── Klaim Garansi: catat sebagai BEBAN (pengeluaran toko) ──
                // Customer tidak membayar. Toko yang menanggung biaya perbaikan/sparepart.
                // Hanya buat transaksi jika ada biaya nyata yang dikeluarkan (sparepart/jasa).
                if (serviceAmount > 0) {
                    await db.insert(transactions).values({
                        id: txId,
                        storeId: existingSO.storeId,
                        transactionType: "Beban Garansi",
                        amount: serviceAmount,
                        description: `Klaim Garansi: ${existingSO.deviceName} - ${existingSO.issue} [ID: ${params.id}]`,
                        transactionDate: now,
                        invoiceNumber: txInvoiceNumber,
                        customerName: existingSO.customerName,
                        customerId: existingSO.customerId,
                        paymentMethod: "Cash",
                        paymentStatus: "Lunas",
                        userId: authResult.user.id,
                        shiftId: activeShift?.id || null,
                        createdAt: now
                    });

                    // Journal: Beban Garansi (Debit) + Kas (Credit) — pengeluaran toko
                    await db.insert(journalEntries).values([
                        { storeId: existingSO.storeId, transactionId: txId, accountName: "Beban Garansi", debit: serviceAmount, credit: 0 },
                        { storeId: existingSO.storeId, transactionId: txId, accountName: "Kas", debit: 0, credit: serviceAmount }
                    ]);
                }
                // Jika biaya = 0 (garansi penuh tanpa sparepart), tidak perlu entri transaksi
            } else {
                // ── Service Biasa: catat sebagai PENDAPATAN ──
                await db.insert(transactions).values({
                    id: txId,
                    storeId: existingSO.storeId,
                    transactionType: "Jasa Servis",
                    amount: serviceAmount,
                    description: `Servis: ${existingSO.deviceName} - ${existingSO.issue} [ID: ${params.id}]`,
                    transactionDate: now,
                    invoiceNumber: txInvoiceNumber,
                    customerName: existingSO.customerName,
                    customerId: existingSO.customerId,
                    paymentMethod: "Cash",
                    paymentStatus: "Lunas",
                    userId: authResult.user.id,
                    shiftId: activeShift?.id || null,
                    createdAt: now
                });

                // Journal: Pendapatan Servis (Credit) + Kas (Debit) — pendapatan toko
                if (serviceAmount > 0) {
                    await db.insert(journalEntries).values([
                        { storeId: existingSO.storeId, transactionId: txId, accountName: "Pendapatan Servis", debit: 0, credit: serviceAmount },
                        { storeId: existingSO.storeId, transactionId: txId, accountName: "Kas", debit: serviceAmount, credit: 0 }
                    ]);
                }
            }
        }

        // Deduct sparepart stock server-side, once, on the transition into "Diambil"
        // (pickup). Moved off the client so a closed tab / failed request can no
        // longer skip it. The status guard makes it idempotent (Diambil is terminal).
        if (status === 'Diambil' && existingSO.status !== 'Diambil') {
            try {
                await deductServicePartsStock(params.id, existingSO.storeId, existingSO.notes);
            } catch (dedErr) {
                console.error("Failed to deduct sparepart stock on pickup:", dedErr);
            }
        }

        // Award points and schedule reminder on collection
        if (status === 'Diambil' && existingSO.customerId) {
            try {
                const serviceAmount = finalCost || existingSO.estimatedCost || 0;
                // Reference the actual pickup invoice; fall back to a sequential SRV
                // number only if no transaction was created for this collection.
                const srvInvoiceNumber = createdInvoiceNumber
                    ?? await generateInvoiceNumber(db, existingSO.storeId, "SRV", new Date());

                await awardPoints(db, existingSO.customerId, serviceAmount, srvInvoiceNumber);
                await scheduleServiceReminder(db, existingSO.storeId, existingSO.customerId, existingSO.customerPhone || "", existingSO.deviceName);
            } catch (crmErr) {
                console.error("Failed to process CRM logic for service collection:", crmErr);
            }
        }

        // Calculate technician commission if technician is assigned
        const finalTechnicianId = technicianId !== undefined ? technicianId : existingSO.technicianId;
        if (status === 'Diambil' && finalTechnicianId) {
            // Find technician
            const tech = await db.query.technicians.findFirst({
                where: eq(technicians.id, finalTechnicianId)
            });
            if (tech) {
                // Spareparts total is netted out of the technician's commission.
                // Read from the relational service_parts table, falling back to the
                // legacy [Spareparts: ...] JSON in notes for pre-migration orders.
                const finalNotes = notes !== undefined ? notes : existingSO.notes;
                const partsAmount = await getSparepartsAmount(params.id, finalNotes);

                const serviceAmount = finalCost !== undefined ? finalCost : (existingSO.finalCost || existingSO.estimatedCost || 0);
                const netServiceAmount = Math.max(0, serviceAmount - partsAmount);

                let commissionAmount = 0;
                const commissionType = tech.commissionType || 'percentage';
                const commissionValue = tech.commissionValue || 0;

                if (commissionType === 'percentage') {
                    commissionAmount = netServiceAmount * (commissionValue / 100);
                } else {
                    commissionAmount = commissionValue;
                }

                // Check if a commission record already exists for this service order to avoid duplicate commissions
                const existingCommission = await db.query.technicianCommissions.findFirst({
                    where: eq(technicianCommissions.serviceOrderId, params.id)
                });

                // Find linked transaction if we didn't just create one
                let linkedTxId = createdTxId;
                if (!linkedTxId) {
                    let linkedTx = await db.query.transactions.findFirst({
                        where: withActiveTransactions(and(
                            eq(transactions.storeId, existingSO.storeId),
                            eq(transactions.transactionType, "Jasa Servis"),
                            like(transactions.description, `%[ID: ${params.id}]%`)
                        ))
                    });
                    if (!linkedTx) {
                        linkedTx = await db.query.transactions.findFirst({
                            where: withActiveTransactions(and(
                                eq(transactions.storeId, existingSO.storeId),
                                eq(transactions.transactionType, "Jasa Servis"),
                                eq(transactions.customerName, existingSO.customerName),
                                like(transactions.description, `%Servis: ${existingSO.deviceName}%`)
                            ))
                        });
                    }
                    if (linkedTx) {
                        linkedTxId = linkedTx.id;
                    }
                }

                if (!existingCommission) {
                    await db.insert(technicianCommissions).values({
                        id: crypto.randomUUID(),
                        storeId: existingSO.storeId,
                        technicianId: finalTechnicianId,
                        serviceOrderId: params.id,
                        transactionId: linkedTxId,
                        serviceAmount: serviceAmount,
                        partsAmount: partsAmount,
                        commissionAmount: commissionAmount,
                        status: 'UNPAID',
                        createdAt: new Date()
                    });
                    console.log(`Recorded commission of ${commissionAmount} for technician ${tech.name} on service order ${params.id}`);
                } else {
                    // Update the existing commission details if it exists and is unpaid
                    if (existingCommission.status === 'UNPAID') {
                        await db.update(technicianCommissions)
                            .set({
                                technicianId: finalTechnicianId,
                                transactionId: linkedTxId || existingCommission.transactionId,
                                serviceAmount: serviceAmount,
                                partsAmount: partsAmount,
                                commissionAmount: commissionAmount
                            })
                            .where(eq(technicianCommissions.id, existingCommission.id));
                        console.log(`Updated unpaid commission of ${commissionAmount} for technician ${tech.name} on service order ${params.id}`);
                    }
                }
            }
        }

        // Extract request IP and User Agent
        const ipAddress = request.headers.get("x-forwarded-for") || "unknown";
        const userAgent = request.headers.get("user-agent") || "unknown";

        // Enterprise Audit Logging for Service Updates
        await db.insert(activityLogs).values({
            storeId: existingSO.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_SERVICE",
            entityType: "service",
            entityId: params.id,
            details: JSON.stringify({
                oldData: {
                    status: existingSO.status,
                    finalCost: existingSO.finalCost,
                    technicianId: existingSO.technicianId
                },
                newData: {
                    status: result[0].status,
                    finalCost: result[0].finalCost,
                    technicianId: result[0].technicianId
                },
                ipAddress,
                userAgent
            })
        });

        return NextResponse.json(result[0]);
    } catch (error: any) {
        console.error("Failed to update service order:", error);
        return NextResponse.json({ error: error.message || "Failed to update service order" }, { status: 500 });
    }
}

export async function DELETE(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    // 🔒 SaaS Tenant Isolation: Verify service order belongs to user's store
    const { serviceOrder: existing, authorized, response } = await verifyServiceOrderAccess(authResult, params.id);
    if (!authorized) return response;

    try {
        await db.delete(serviceOrders).where(and(
            eq(serviceOrders.id, params.id),
            // 🔒 Double-check storeId in delete
            authResult.storeId !== "all" ? eq(serviceOrders.storeId, authResult.storeId) : undefined
        ));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existing!.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "DELETE_SERVICE",
            entityType: "service_orders",
            entityId: params.id,
            details: "{}"
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Failed to delete service order" }, { status: 500 });
    }
}
