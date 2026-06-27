import { config } from "dotenv";
config({ path: ".env" });

async function run() {
  const { db } = await import("./index.js");
  const { storeSettings } = await import("./schema.js");

  const existing = await db.query.storeSettings.findFirst();
  const defaultBanks: { bank: string; account: string; name: string }[] = [];
  const defaultFooter = "Terima kasih atas kunjungan Anda.\nBarang yang sudah dibeli\ntidak dapat ditukar/dikembalikan.";

  if (existing && !existing.storeBanks) {
      const { eq } = await import("drizzle-orm");
      await db.update(storeSettings).set({ 
          storeBanks: JSON.stringify(defaultBanks),
          storeFooter: existing.storeFooter || defaultFooter
      }).where(eq(storeSettings.storeId, "default"));
      console.log("Settings updated successfully.");
  } else if (!existing) {
      await db.insert(storeSettings).values({
        storeId: "default",
        storeName: "HanLaptop",
          storeAddress: "Jl. Komputer Raya No.123",
          storePhone: "0812-3456-7890",
          storeFooter: defaultFooter,
          storeBanks: JSON.stringify(defaultBanks)
      });
      console.log("Inserted default settings");
  } else {
      console.log("Banks already exist", existing.storeBanks);
  }
  process.exit(0);
}

run();
