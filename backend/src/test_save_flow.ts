import "dotenv/config";
import { db } from "./db";
import { inventory, qcInspections, suppliers, technicians } from "./db/schema";
import { eq, desc } from "drizzle-orm";

async function main() {
  console.log("=== RUNNING API SIMULATION TEST ===");
  try {
    // 1. Get an item
    const items = await db.select().from(inventory).limit(1);
    if (items.length === 0) {
      console.log("No inventory items found!");
      return;
    }
    const item = items[0];
    console.log(`Testing with item: ${item.itemName} (ID: ${item.id})`);
    console.log(`Original state: isPublished=${item.isPublished}, isConsignment=${item.isConsignment}, supplierId=${item.supplierId}, condition=${item.condition}`);

    // 2. Get a supplier and technician
    const supplierList = await db.select().from(suppliers).limit(1);
    const techList = await db.select().from(technicians).limit(1);
    const supplierId = supplierList[0]?.id || null;
    const techId = techList[0]?.id || null;
    console.log(`Using supplier ID: ${supplierId}, technician ID: ${techId}`);

    if (!techId) {
      console.log("Warning: No technician found, QC test might be skipped or fail if technician is required.");
    }

    // 3. Simulate PUT /api/inventory/[id]
    // Let's toggle isPublished and isConsignment
    const targetPublished = !item.isPublished;
    const targetConsignment = !!supplierId; // if we have a supplier, make it consignment
    const targetSupplierId = supplierId;

    console.log(`\nSimulating PUT update: isPublished=${targetPublished}, isConsignment=${targetConsignment}, supplierId=${targetSupplierId}`);

    // Simulate validator parsing
    // In validators.ts:
    // export const inventorySchema = z.object({ ... })
    // isPublished: z.boolean().optional().default(false),
    // isConsignment: z.boolean().optional().default(false),
    // supplierId: z.string().nullable().optional(),
    
    // In the route.ts:
    const body = {
      isPublished: targetPublished,
      isConsignment: targetConsignment,
      supplierId: targetSupplierId
    };

    const updateData: any = {};
    const allowedFields = ['isPublished', 'isConsignment', 'supplierId'];
    for (const field of allowedFields) {
      if (body[field as keyof typeof body] !== undefined) {
        updateData[field] = body[field as keyof typeof body];
      }
    }

    console.log("updateData object:", updateData);

    const [updated] = await db.update(inventory)
      .set(updateData)
      .where(eq(inventory.id, item.id))
      .returning();

    console.log(`Database returned updated: isPublished=${updated?.isPublished}, isConsignment=${updated?.isConsignment}, supplierId=${updated?.supplierId}`);

    // Check if actually written to DB
    const [fetched] = await db.select().from(inventory).where(eq(inventory.id, item.id));
    console.log(`Re-fetched from DB: isPublished=${fetched?.isPublished}, isConsignment=${fetched?.isConsignment}, supplierId=${fetched?.supplierId}`);

    // 4. Simulate POST /api/inventory/[id]/qc
    if (techId) {
      console.log(`\nSimulating QC update: grade=A, notes="Test QC notes from script", technicianId=${techId}`);
      
      // We simulate the transaction and query in the QC route:
      const qcBody = {
        grade: "A",
        notes: "Test QC notes from script",
        technicianId: techId,
        inventoryId: item.id
      };

      // Auto-calculated fields default to 100 in schema
      const scores = {
        screenScore: 100,
        batteryHealth: 100,
        keyboardScore: 100,
        usbPortsScore: 100,
        hingeScore: 100,
        wifiScore: 100,
        bodyScore: 100,
      };

      await db.transaction(async (tx) => {
        // Insert inspection
        const [qcRecord] = await tx.insert(qcInspections).values({
          inventoryId: item.id,
          technicianId: techId,
          grade: "A",
          screenScore: 100,
          batteryHealth: 100,
          keyboardScore: 100,
          usbPortsScore: 100,
          hingeScore: 100,
          wifiScore: 100,
          bodyScore: 100,
          maxSellingPrice: fetched.costPrice * 1.4,
          warrantyDays: 90,
          notes: qcBody.notes,
        }).returning();

        console.log("QC Record created in DB:", qcRecord.id);

        let newCondition = 'USED_A'; // finalGrade = 'A'

        // Update inventory
        await tx.update(inventory)
          .set({ condition: newCondition })
          .where(eq(inventory.id, item.id));
      });

      const [afterQC] = await db.select().from(inventory).where(eq(inventory.id, item.id));
      console.log(`After QC - condition in DB: ${afterQC?.condition}`);
      
      // Re-fetch latest QC
      const qcInDb = await db.select({
        qcGrade: qcInspections.grade,
        qcNotes: qcInspections.notes,
        qcTechnicianId: qcInspections.technicianId
      })
      .from(qcInspections)
      .where(eq(qcInspections.inventoryId, item.id))
      .orderBy(desc(qcInspections.createdAt))
      .limit(1);

      console.log("Fetched QC from DB (subquery simulation):", qcInDb[0]);
    }

    // 5. Restore original state
    console.log("\nRestoring original state...");
    await db.update(inventory)
      .set({
        isPublished: item.isPublished,
        isConsignment: item.isConsignment,
        supplierId: item.supplierId,
        condition: item.condition
      })
      .where(eq(inventory.id, item.id));
    console.log("Original state restored.");

  } catch (error) {
    console.error("Error during simulation:", error);
  }
}

main().then(() => process.exit(0));
