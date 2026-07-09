import * as dotenv from "dotenv";
import path from "path";
import crypto from "crypto";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function runTests() {
    console.log("Starting Business Logic Verification Tests...");
    console.log("DATABASE_URL:", process.env.DATABASE_URL);

    const { db } = await import("./src/db");
    const schema = await import("./src/db/schema");
    const { withActiveTransactions, withActiveJournalEntries } = await import("./src/db/query-helpers");
    const { and, eq, sum } = await import("drizzle-orm");

    try {
        await db.transaction(async (tx) => {
            // Seed a mock organization, store, and user
            const orgId = crypto.randomUUID();
            await tx.insert(schema.organizations).values({
                id: orgId,
                name: "Verification Org"
            });

            const storeId = crypto.randomUUID();
            await tx.insert(schema.stores).values({
                id: storeId,
                name: "Verification Store",
                organizationId: orgId,
                slug: storeId
            });

            const userId = crypto.randomUUID();
            await tx.insert(schema.user).values({
                id: userId,
                name: "Verifier Admin",
                email: `${userId}@verify.com`,
                emailVerified: true,
                role: "owner",
                createdAt: new Date(),
                updatedAt: new Date()
            });

            const shiftId = crypto.randomUUID();
            await tx.insert(schema.cashierShifts).values({
                id: shiftId,
                storeId,
                userId,
                userName: "Verifier Admin",
                openingBalance: 100000,
                status: "OPEN",
                openedAt: new Date()
            });

            console.log("\n==================================================");
            console.log("SEEDED Test Context (Store, User, Open Shift)");
            console.log("==================================================");

            // Helpers for querying stats inside this transaction
            const getDashboardRevenue = async () => {
                const results = await tx.select({
                    total: sum(schema.journalEntries.credit).mapWith(Number)
                })
                .from(schema.journalEntries)
                .where(withActiveJournalEntries(
                    and(
                        eq(schema.journalEntries.storeId, storeId),
                        eq(schema.journalEntries.accountName, "Pendapatan")
                    )
                ));
                return results[0]?.total || 0;
            };

            const getKasBalance = async () => {
                const results = await tx.select({
                    debit: sum(schema.journalEntries.debit).mapWith(Number),
                    credit: sum(schema.journalEntries.credit).mapWith(Number)
                })
                .from(schema.journalEntries)
                .where(withActiveJournalEntries(
                    and(
                        eq(schema.journalEntries.storeId, storeId),
                        eq(schema.journalEntries.accountName, "Kas")
                    )
                ));
                const deb = results[0]?.debit || 0;
                const cred = results[0]?.credit || 0;
                return deb - cred;
            };

            const getShiftExpectedBalance = async () => {
                const active = await tx.query.cashierShifts.findFirst({
                    where: eq(schema.cashierShifts.id, shiftId)
                });
                if (!active) throw new Error("Shift not found");

                const cashEntries = await tx.select({
                    debit: schema.journalEntries.debit,
                    credit: schema.journalEntries.credit
                })
                .from(schema.journalEntries)
                .innerJoin(schema.transactions, eq(schema.journalEntries.transactionId, schema.transactions.id))
                .where(withActiveJournalEntries(
                    and(
                        eq(schema.transactions.shiftId, active.id),
                        eq(schema.journalEntries.accountName, "Kas")
                    )
                ));
                let netCash = 0;
                cashEntries.forEach(entry => {
                    netCash += (entry.debit || 0) - (entry.credit || 0);
                });
                return active.openingBalance + netCash;
            };

            const getTransactionsCount = async () => {
                const activeTx = await tx.query.transactions.findMany({
                    where: withActiveTransactions(eq(schema.transactions.storeId, storeId))
                });
                return activeTx.length;
            };

            // Initial verification
            let initialRev = await getDashboardRevenue();
            let initialKas = await getKasBalance();
            let initialShiftExp = await getShiftExpectedBalance();
            let initialTxCount = await getTransactionsCount();
            
            console.log("Initial Dashboard Revenue:", initialRev);
            console.log("Initial Kas Balance:", initialKas);
            console.log("Initial Shift Expected Balance:", initialShiftExp);
            console.log("Initial Active Transactions Count:", initialTxCount);

            if (initialRev !== 0 || initialKas !== 0 || initialShiftExp !== 100000 || initialTxCount !== 0) {
                throw new Error("Initial metrics state is incorrect");
            }
            console.log("✅ Initial verification PASSED");

            // Create Transaction
            console.log("\nCreating Sale for 1,000,000...");
            const txId = crypto.randomUUID();
            await tx.insert(schema.transactions).values({
                id: txId,
                storeId,
                transactionType: "Penjualan",
                amount: 1000000,
                invoiceNumber: "INV/TEST/001",
                customerName: "Test Customer",
                paymentStatus: "Lunas",
                userId,
                shiftId,
                isVoided: false
            });

            // Insert Journal entries (Debit Kas 1M, Credit Pendapatan 1M)
            await tx.insert(schema.journalEntries).values([
                {
                    id: crypto.randomUUID(),
                    storeId,
                    transactionId: txId,
                    accountName: "Kas",
                    debit: 1000000,
                    credit: 0,
                    isVoided: false
                },
                {
                    id: crypto.randomUUID(),
                    storeId,
                    transactionId: txId,
                    accountName: "Pendapatan",
                    debit: 0,
                    credit: 1000000,
                    isVoided: false
                }
            ]);

            // Verification after Sale
            let activeRev = await getDashboardRevenue();
            let activeKas = await getKasBalance();
            let activeShiftExp = await getShiftExpectedBalance();
            let activeTxCount = await getTransactionsCount();

            console.log("Active Dashboard Revenue:", activeRev);
            console.log("Active Kas Balance:", activeKas);
            console.log("Active Shift Expected Balance:", activeShiftExp);
            console.log("Active Transactions Count:", activeTxCount);

            if (activeRev !== 1000000) throw new Error("Dashboard Revenue didn't increase to 1M");
            if (activeKas !== 1000000) throw new Error("Kas balance didn't increase to 1M");
            if (activeShiftExp !== 1100000) throw new Error("Shift Expected balance isn't 1.1M");
            if (activeTxCount !== 1) throw new Error("Transactions count isn't 1");
            console.log("✅ Sale Creation verification PASSED");

            // Void the transaction
            console.log("\nVoiding transaction...");
            await tx.update(schema.transactions)
                .set({ isVoided: true })
                .where(eq(schema.transactions.id, txId));

            await tx.update(schema.journalEntries)
                .set({ isVoided: true })
                .where(eq(schema.journalEntries.transactionId, txId));

            // Verification after Void
            let voidedRev = await getDashboardRevenue();
            let voidedKas = await getKasBalance();
            let voidedShiftExp = await getShiftExpectedBalance();
            let voidedTxCount = await getTransactionsCount();

            console.log("Voided Dashboard Revenue:", voidedRev);
            console.log("Voided Kas Balance:", voidedKas);
            console.log("Voided Shift Expected Balance:", voidedShiftExp);
            console.log("Voided Transactions Count:", voidedTxCount);

            // Check expectations
            if (voidedRev !== 0) throw new Error("Dashboard Revenue didn't return to 0");
            if (voidedKas !== 0) throw new Error("Kas balance didn't return to 0");
            if (voidedShiftExp !== 100000) throw new Error("Shift Expected balance didn't return to 100k");
            if (voidedTxCount !== 0) throw new Error("Voided transaction still showing in history");
            console.log("✅ Void synchronization verification PASSED (Tests 1, 2, 3, 4, 5)");

            // Verification for Test 6: Reset Tables Order
            console.log("\nVerifying Factory Reset table order deletes...");
            const { OPERATIONAL_TABLES } = await import("./src/db/reset-tables");
            for (const table of OPERATIONAL_TABLES) {
                await tx.delete(table);
            }
            console.log("✅ Factory Reset table order execution PASSED (Test 6)");

            throw new Error("ROLLBACK_SUCCESS");
        });
    } catch (e: any) {
        if (e.message === "ROLLBACK_SUCCESS") {
            console.log("\n==================================================");
            console.log("SUCCESS: All business logic test cases verified successfully!");
            console.log("==================================================");
        } else {
            console.error("Test execution failed:", e);
            process.exit(1);
        }
    }
    process.exit(0);
}

runTests();
