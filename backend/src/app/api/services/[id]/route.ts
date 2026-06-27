import { NextResponse } from "next/server";
import { db } from "@/db";
import { serviceOrders, activityLogs, transactions, journalEntries, cashierShifts, storeSettings, technicians, technicianCommissions } from "@/db/schema";
import { eq, and, like } from "drizzle-orm";
import { requireAuth, requireWriteAccess } from "@/lib/auth-guard";
import { z } from "zod";
import { serviceOrderSchema } from "@/lib/validators";
import crypto from "crypto";
import { awardPoints, scheduleServiceReminder } from "@/lib/crm-helper";

export const dynamic = 'force-dynamic';

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const data = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, params.id),
            with: { customer: true, technician: true }
        });
        
        if (!data) return NextResponse.json({ error: "Service order not found" }, { status: 404 });
        return NextResponse.json(data);
    } catch (error) {
        return NextResponse.json({ error: "Failed to fetch service order" }, { status: 500 });
    }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
    const params = await props.params;
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const writeAccessError = requireWriteAccess(authResult);
    if (writeAccessError) return writeAccessError;

    try {
        const body = await request.json();
        const updateSchema = serviceOrderSchema.partial().extend({
            createTransaction: z.boolean().optional()
        });
        const parsed = updateSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }
        const { status, finalCost, notes, technicianName, technicianId, createTransaction, customerName, customerPhone, customerAddress, deviceName, issue, estimatedCost } = parsed.data;
        
        const existing = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, params.id)
        });

        if (!existing) {
            return NextResponse.json({ error: "Service order not found" }, { status: 404 });
        }

        // Prevent updating status if already cancelled by customer
        if (existing.status === 'Batal' && status && status !== 'Batal') {
            return NextResponse.json({ error: "Servis ini telah dibatalkan oleh pelanggan. Status Batal tidak dapat diubah kembali." }, { status: 400 });
        }

        // Prevent updating status if already picked up and completed
        if (existing.status === 'Diambil' && status && status !== 'Diambil') {
            return NextResponse.json({ error: "Servis ini telah diambil dan selesai dibayar. Status tidak dapat diubah." }, { status: 400 });
        }

        // Check active shift if creating a transaction and the user is kasir
        let activeShift = null;
        if (createTransaction && status === 'Diambil') {
            // Check if cashier shift is enabled in store settings
            const settings = await db.query.storeSettings.findFirst({
                where: eq(storeSettings.storeId, authResult.storeId)
            });
            const isShiftEnabled = settings ? settings.enableCashierShift !== false : true;

            activeShift = await db.query.cashierShifts.findFirst({
                where: and(
                    eq(cashierShifts.storeId, authResult.storeId),
                    eq(cashierShifts.userId, authResult.user.id),
                    eq(cashierShifts.status, "OPEN")
                )
            });

            const isKasir = authResult.storeRole === "kasir" || (authResult.user as any).role === "kasir";
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

        if (status === 'Selesai' && existing.status !== 'Selesai') {
            updateData.completedDate = new Date();
            // Automatically set warranty if not set? We'll let the user do it via notes or UI.
        }

        const result = await db.update(serviceOrders)
            .set(updateData)
            .where(eq(serviceOrders.id, params.id))
            .returning();

        // If finalCost, estimatedCost, deviceName, issue, or customerName is updated, sync it with the transaction history
        if (body.finalCost !== undefined || body.estimatedCost !== undefined || body.deviceName !== undefined || body.issue !== undefined || body.customerName !== undefined) {
            const newAmount = body.finalCost !== undefined ? parsed.data.finalCost : (existing.finalCost || parsed.data.estimatedCost || existing.estimatedCost || 0);
            
            // Try to find the linked transaction by ID tag first
            let linkedTx = await db.query.transactions.findFirst({
                where: and(
                    eq(transactions.storeId, existing.storeId),
                    eq(transactions.transactionType, "Jasa Servis"),
                    like(transactions.description, `%[ID: ${params.id}]%`)
                )
            });
            
            // Fallback for older transactions
            if (!linkedTx) {
                linkedTx = await db.query.transactions.findFirst({
                    where: and(
                        eq(transactions.storeId, existing.storeId),
                        eq(transactions.transactionType, "Jasa Servis"),
                        eq(transactions.customerName, existing.customerName),
                        like(transactions.description, `%Servis: ${existing.deviceName}%`)
                    )
                });
            }
            
            if (linkedTx) {
                const newDesc = `Servis: ${body.deviceName !== undefined ? parsed.data.deviceName : existing.deviceName} - ${body.issue !== undefined ? parsed.data.issue : existing.issue} [ID: ${params.id}]`;
                await db.update(transactions)
                    .set({
                        amount: newAmount,
                        description: newDesc,
                        customerName: body.customerName !== undefined ? parsed.data.customerName : existing.customerName
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
            storeId: existing.storeId,
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "UPDATE_SERVICE",
            entityType: "service_orders",
            entityId: params.id,
            details: JSON.stringify({ status, finalCost })
        });

        // Auto-create transaction if requested and status is Diambil
        let createdTxId: string | null = null;
        if (createTransaction && status === 'Diambil') {
            const txId = crypto.randomUUID();
            createdTxId = txId;
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const randomCode = Math.floor(100 + Math.random() * 900);
            const serviceAmount = finalCost || existing.estimatedCost || 0;
            const isWarranty = existing.warrantyClaimed === true;

            if (isWarranty) {
                // ── Klaim Garansi: catat sebagai BEBAN (pengeluaran toko) ──
                // Customer tidak membayar. Toko yang menanggung biaya perbaikan/sparepart.
                // Hanya buat transaksi jika ada biaya nyata yang dikeluarkan (sparepart/jasa).
                if (serviceAmount > 0) {
                    await db.insert(transactions).values({
                        id: txId,
                        storeId: existing.storeId,
                        transactionType: "Beban Garansi",
                        amount: serviceAmount,
                        description: `Klaim Garansi: ${existing.deviceName} - ${existing.issue} [ID: ${params.id}]`,
                        transactionDate: now,
                        invoiceNumber: `GRN/${year}/${month}/${randomCode}`,
                        customerName: existing.customerName,
                        customerId: existing.customerId,
                        paymentMethod: "Cash",
                        paymentStatus: "Lunas",
                        userId: authResult.user.id,
                        shiftId: activeShift?.id || null,
                        createdAt: now
                    });

                    // Journal: Beban Garansi (Debit) + Kas (Credit) — pengeluaran toko
                    await db.insert(journalEntries).values([
                        { storeId: existing.storeId, transactionId: txId, accountName: "Beban Garansi", debit: serviceAmount, credit: 0 },
                        { storeId: existing.storeId, transactionId: txId, accountName: "Kas", debit: 0, credit: serviceAmount }
                    ]);
                }
                // Jika biaya = 0 (garansi penuh tanpa sparepart), tidak perlu entri transaksi
            } else {
                // ── Service Biasa: catat sebagai PENDAPATAN ──
                await db.insert(transactions).values({
                    id: txId,
                    storeId: existing.storeId,
                    transactionType: "Jasa Servis",
                    amount: serviceAmount,
                    description: `Servis: ${existing.deviceName} - ${existing.issue} [ID: ${params.id}]`,
                    transactionDate: now,
                    invoiceNumber: `SRV/${year}/${month}/${randomCode}`,
                    customerName: existing.customerName,
                    customerId: existing.customerId,
                    paymentMethod: "Cash",
                    paymentStatus: "Lunas",
                    userId: authResult.user.id,
                    shiftId: activeShift?.id || null,
                    createdAt: now
                });

                // Journal: Pendapatan Servis (Credit) + Kas (Debit) — pendapatan toko
                if (serviceAmount > 0) {
                    await db.insert(journalEntries).values([
                        { storeId: existing.storeId, transactionId: txId, accountName: "Pendapatan Servis", debit: 0, credit: serviceAmount },
                        { storeId: existing.storeId, transactionId: txId, accountName: "Kas", debit: serviceAmount, credit: 0 }
                    ]);
                }
            }
        }

        // Award points and schedule reminder on collection
        if (status === 'Diambil' && existing.customerId) {
            try {
                const now = new Date();
                const srvInvoiceNumber = `SRV/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${Math.floor(100 + Math.random() * 900)}`;
                const serviceAmount = finalCost || existing.estimatedCost || 0;
                
                await awardPoints(db, existing.customerId, serviceAmount, srvInvoiceNumber);
                await scheduleServiceReminder(db, existing.storeId, existing.customerId, existing.customerPhone || "", existing.deviceName);
            } catch (crmErr) {
                console.error("Failed to process CRM logic for service collection:", crmErr);
            }
        }

        // Calculate technician commission if technician is assigned
        const finalTechnicianId = technicianId !== undefined ? technicianId : existing.technicianId;
        if (status === 'Diambil' && finalTechnicianId) {
            // Find technician
            const tech = await db.query.technicians.findFirst({
                where: eq(technicians.id, finalTechnicianId)
            });
            if (tech) {
                // Parse spareparts
                const finalNotes = notes !== undefined ? notes : existing.notes;
                let partsAmount = 0;
                if (finalNotes) {
                    const partsMatch = finalNotes.match(/\[Spareparts:\s*(\[[\s\S]*?\])\]/);
                    if (partsMatch) {
                        try {
                            const partsList = JSON.parse(partsMatch[1]);
                            if (Array.isArray(partsList)) {
                                for (const part of partsList) {
                                    const price = Number(part.price) || 0;
                                    const qty = Number(part.qty) || 1;
                                    partsAmount += price * qty;
                                }
                            }
                        } catch (e) {
                            console.error("Failed to parse spareparts from notes for commission:", e);
                        }
                    }
                }

                const serviceAmount = finalCost !== undefined ? finalCost : (existing.finalCost || existing.estimatedCost || 0);
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
                        where: and(
                            eq(transactions.storeId, existing.storeId),
                            eq(transactions.transactionType, "Jasa Servis"),
                            like(transactions.description, `%[ID: ${params.id}]%`)
                        )
                    });
                    if (!linkedTx) {
                        linkedTx = await db.query.transactions.findFirst({
                            where: and(
                                eq(transactions.storeId, existing.storeId),
                                eq(transactions.transactionType, "Jasa Servis"),
                                eq(transactions.customerName, existing.customerName),
                                like(transactions.description, `%Servis: ${existing.deviceName}%`)
                            )
                        });
                    }
                    if (linkedTx) {
                        linkedTxId = linkedTx.id;
                    }
                }

                if (!existingCommission) {
                    await db.insert(technicianCommissions).values({
                        id: crypto.randomUUID(),
                        storeId: existing.storeId,
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

    try {
        const existing = await db.query.serviceOrders.findFirst({
            where: eq(serviceOrders.id, params.id)
        });
        if (!existing) return NextResponse.json({ error: "Service order not found" }, { status: 404 });

        await db.delete(serviceOrders).where(eq(serviceOrders.id, params.id));

        // Log activity
        await db.insert(activityLogs).values({
            storeId: existing.storeId,
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
