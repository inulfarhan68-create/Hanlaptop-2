import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.join(__dirname, "../.env") });

import { db } from "./db";
import { inventory, qcInspections } from "./db/schema";
import { desc } from "drizzle-orm";

async function main() {
  try {
    const items = await db.select().from(inventory).orderBy(desc(inventory.createdAt)).limit(10);
    console.log("=== LATEST 10 INVENTORY ITEMS ===");
    items.forEach(item => {
      console.log(`ID: ${item.id}`);
      console.log(`  Name: ${item.itemName}`);
      console.log(`  Category: ${item.category}`);
      console.log(`  isPublished: ${item.isPublished} (${typeof item.isPublished})`);
      console.log(`  isConsignment: ${item.isConsignment} (${typeof item.isConsignment})`);
      console.log(`  supplierId: ${item.supplierId}`);
      console.log(`  condition: ${item.condition}`);
    });

    const inspections = await db.select().from(qcInspections).orderBy(desc(qcInspections.createdAt)).limit(5);
    console.log("=== LATEST 5 QC INSPECTIONS ===");
    console.log(inspections);
  } catch (error) {
    console.error("Error:", error);
  }
}

main().then(() => process.exit(0));
