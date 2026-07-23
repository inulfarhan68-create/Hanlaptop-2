import { NextResponse } from "next/server";
import { db } from "@/db";
import { transactions, transactionItems, journalEntries, inventory, activityLogs, customers, suppliers } from "@/db/schema";
import { requireAuth, requireWriteAccess, requireFeature } from "@/lib/auth-guard";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    const featureCheck = await requireFeature("buyback");
    if (featureCheck instanceof NextResponse) return featureCheck;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        const { type, oldUnit, newUnit, customer, paymentMethod, notes, transactionDate } = body;

        if (type !== "Buyback" && type !== "Tukar Tambah") {
            return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
        }

        const date = transactionDate ? new Date(transactionDate) : new Date();

        return await db.transaction(async (tx) => {
            // 1. Create or Find Customer & Supplier (Customer acts as Supplier for the old unit)
            let customerId = customer?.id;
            let supplierId = null;

            if (!customerId && customer?.name) {
                const newCustomer = await tx.insert(customers).values({
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    storeId: authResult.storeId,
                }).returning();
                customerId = newCustomer[0].id;
            }

            if (customer?.name) {
                const newSupplier = await tx.insert(suppliers).values({
                    name: customer.name + " (Customer)",
                    phone: customer.phone,
                    address: customer.address,
                    storeId: authResult.storeId,
                    notes: "Created from Trade-In/Buyback",
                }).returning();
                supplierId = newSupplier[0].id;
            }

            // 2. Generate Transaction Invoice Number
            const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
            const prefix = type === "Buyback" ? "BB" : "TT";
            const invoiceNumber = `INV-${prefix}-${authResult.storeId.substring(0, 3).toUpperCase()}-${dateStr}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

            let totalAmount = 0;
            let sisaUang = 0;

            if (type === "Buyback") {
                totalAmount = oldUnit.estimatedValue;
            } else if (type === "Tukar Tambah") {
                totalAmount = (newUnit.unitPrice * newUnit.quantity) - oldUnit.estimatedValue;
                sisaUang = totalAmount > 0 ? totalAmount : 0; // The customer pays the remaining balance
            }

            // 3. Create Transaction Record
            const [newTx] = await tx.insert(transactions).values({
                storeId: authResult.storeId,
                invoiceNumber,
                transactionType: type,
                amount: type === "Buyback" ? oldUnit.estimatedValue : (newUnit.unitPrice * newUnit.quantity), // Total value of the core transaction
                paymentMethod: paymentMethod || 'Cash',
                paymentStatus: 'Lunas',
                transactionDate: date,
                description: notes || `Transaksi ${type}`,
                customerId: customerId,
                supplierId: supplierId, // Link supplier for buyback tracking
            }).returning();

            // 4. Register Old Unit to Inventory (status IN_INSPECTION - must pass QC before sale)
            const [insertedOldUnit] = await tx.insert(inventory).values({
                storeId: authResult.storeId,
                itemName: oldUnit.itemName,
                category: oldUnit.category || "Laptop Bekas",
                quantity: 1,
                costPrice: oldUnit.estimatedValue,
                sellingPrice: 0, // Needs pricing by manager after QC
                specs: oldUnit.specs,
                condition: 'IN_INSPECTION', // PRD: Must pass QC Module before display/sale
                isPublished: false, // Cannot be published until QC cleared
                supplierId: supplierId,
            }).returning();

            // Insert Transaction Item for Old Unit (Pembelian)
            await tx.insert(transactionItems).values({
                transactionId: newTx.id,
                inventoryId: insertedOldUnit.id,
                quantity: 1,
                unitPrice: oldUnit.estimatedValue,
            });

            const journals = [];

            if (type === "Buyback") {
                // Kasus Buyback:
                // Debit: Persediaan Barang Dagang - Laptop Bekas (Aset)
                // Kredit: Kas / Bank (Aset)
                journals.push(
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Persediaan Barang Dagang - Laptop Bekas', debit: oldUnit.estimatedValue, credit: 0 },
                    { storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Kas/Bank', debit: 0, credit: oldUnit.estimatedValue }
                );
            } else if (type === "Tukar Tambah") {
                // 5. Handle New Unit Deduction for Trade-In
                // Verify new unit stock
                const [targetItem] = await tx.select().from(inventory).where(
                    (eq(inventory.id, newUnit.inventoryId))
                );

                if (!targetItem) {
                    throw new Error("New laptop unit not found in inventory");
                }
                if (targetItem.quantity < newUnit.quantity) {
                    throw new Error(`Stok ${targetItem.itemName} tidak mencukupi`);
                }

                await tx.update(inventory)
                    .set({ quantity: targetItem.quantity - newUnit.quantity })
                    .where(eq(inventory.id, newUnit.inventoryId));

                // Insert Transaction Item for New Unit (Penjualan)
                await tx.insert(transactionItems).values({
                    transactionId: newTx.id,
                    inventoryId: newUnit.inventoryId,
                    quantity: newUnit.quantity,
                    unitPrice: newUnit.unitPrice,
                });

                const totalSales = newUnit.unitPrice * newUnit.quantity;
                const hpp = targetItem.costPrice * newUnit.quantity;
                
                // Kasus Trade-In:
                // Debit: Persediaan Barang Dagang - Laptop Bekas (Nilai Taksiran Unit Bekas)
                // Debit: Kas / Bank (Sisa uang yang dibayar konsumen, if > 0)
                // Kredit: Pendapatan Penjualan Laptop
                // Debit: HPP Laptop Baru
                // Kredit: Persediaan Barang Dagang - Laptop Baru
                
                journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Persediaan Barang Dagang - Laptop Bekas', debit: oldUnit.estimatedValue, credit: 0 });
                
                if (totalAmount > 0) {
                    journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Kas/Bank', debit: totalAmount, credit: 0 });
                } else if (totalAmount < 0) {
                    // Store pays the customer the difference
                    journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Kas/Bank', debit: 0, credit: Math.abs(totalAmount) });
                }

                journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Pendapatan Penjualan Laptop', debit: 0, credit: totalSales });
                journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'HPP Laptop Baru', debit: hpp, credit: 0 });
                journals.push({ storeId: authResult.storeId, transactionId: newTx.id, accountName: 'Persediaan Barang Dagang - Laptop Baru', debit: 0, credit: hpp });
            }

            // Insert Journals
            await tx.insert(journalEntries).values(journals);

            // Log activity
            await tx.insert(activityLogs).values({
                userId: authResult.user.id,
                userName: authResult.user.name || 'Unknown',
                action: 'CREATE_TRANSACTION',
                entityType: 'TRANSACTION',
                entityId: newTx.id,
                details: `Created ${type} transaction ${invoiceNumber}`,
            });

            return NextResponse.json({ success: true, transaction: newTx, oldUnit: insertedOldUnit });
        });

    } catch (error: any) {
        console.error("Trade-In/Buyback API error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
