import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

async function testReset() {
    console.log("Testing reset database in a rollback transaction (with dotenv configured before import)...");
    console.log("DATABASE_URL is:", process.env.DATABASE_URL);

    // Dynamically import db and schema to avoid hoisting issues
    const { db } = await import("./src/db");
    const schema = await import("./src/db/schema");

    try {
        await db.transaction(async (tx) => {
            // Delete child tables in FK order
            console.log("Deleting warranty claim parts...");
            await tx.delete(schema.warrantyClaimParts);
            console.log("Deleting warranty claims...");
            await tx.delete(schema.warrantyClaims);

            console.log("Deleting stock opname items...");
            await tx.delete(schema.stockOpnameItems);
            console.log("Deleting stock opnames...");
            await tx.delete(schema.stockOpnames);
            console.log("Deleting stock transfer items...");
            await tx.delete(schema.stockTransferItems);
            console.log("Deleting stock transfers...");
            await tx.delete(schema.stockTransfers);

            console.log("Deleting qc inspections...");
            await tx.delete(schema.qcInspections);
            console.log("Deleting consignment payables...");
            await tx.delete(schema.consignmentPayables);

            console.log("Deleting purchase requisitions...");
            await tx.delete(schema.purchaseRequisitions);

            console.log("Deleting bank mutations...");
            await tx.delete(schema.bankMutations);
            console.log("Deleting journal entries...");
            await tx.delete(schema.journalEntries);

            console.log("Deleting transaction items...");
            await tx.delete(schema.transactionItems);
            console.log("Deleting transactions...");
            await tx.delete(schema.transactions);

            console.log("Deleting service orders...");
            await tx.delete(schema.serviceOrders);

            console.log("Deleting inventory...");
            await tx.delete(schema.inventory);

            console.log("Deleting attendances...");
            await tx.delete(schema.attendances);
            console.log("Deleting payrolls...");
            await tx.delete(schema.payrolls);
            console.log("Deleting employee loans...");
            await tx.delete(schema.employeeLoans);
            console.log("Deleting employees...");
            await tx.delete(schema.employees);

            console.log("Deleting technician commissions...");
            await tx.delete(schema.technicianCommissions);
            console.log("Deleting cashier shifts...");
            await tx.delete(schema.cashierShifts);

            console.log("Deleting membership points...");
            await tx.delete(schema.membershipPoints);
            console.log("Deleting crm reminders...");
            await tx.delete(schema.crmReminders);

            console.log("Deleting activity logs...");
            await tx.delete(schema.activityLogs);

            console.log("Deleting customers...");
            await tx.delete(schema.customers);
            console.log("Deleting suppliers...");
            await tx.delete(schema.suppliers);
            console.log("Deleting technicians...");
            await tx.delete(schema.technicians);

            console.log("Deleting store settings...");
            await tx.delete(schema.storeSettings);

            console.log("All deletes passed! Throwing error to rollback...");
            throw new Error("ROLLBACK_SUCCESS");
        });
    } catch (e: any) {
        if (e.message === "ROLLBACK_SUCCESS") {
            console.log("SUCCESS: Database reset query order is correct and would succeed!");
        } else {
            console.error("FAILED to reset database:", e);
        }
    }
    process.exit(0);
}

testReset();
