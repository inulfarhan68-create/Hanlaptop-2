// Buyback / trade-in offer pricing.
//
// Ported verbatim from the Vite app's LandingPage.tsx (the public buyback
// estimator), which is still the live implementation until that page migrates.
// Both copies must agree: a customer who gets an online estimate and then walks
// into the store has to be quoted the same number. Keep them in sync, and when
// LandingPage.tsx migrates, delete its copy and import from here.

const RAM_VALUES: Record<string, number> = {
  "4GB": 200000,
  "8GB": 400000,
  "16GB": 800000,
  "32GB": 1600000,
};

const VGA_VALUES: Record<string, number> = {
  "Integrated": 0,
  "NVIDIA GTX Series": 800000,
  "NVIDIA RTX Series": 2200000,
  "AMD Radeon Dedicated": 1000000,
};

const PROC_VALUES: Record<string, number> = {
  "Intel Core i3": 1000000,
  "Intel Core i5": 2000000,
  "Intel Core i7": 3200000,
  "Intel Core i9": 5000000,
  "AMD Ryzen 3": 1000000,
  "AMD Ryzen 5": 2000000,
  "AMD Ryzen 7": 3200000,
  "AMD Ryzen 9": 5000000,
  "Intel Celeron/Pentium": 300000,
  "Apple Silicon M1/M2/M3": 3500000,
};

const getRamKey = (ramStr: string): string => {
  const r = (ramStr || "").toUpperCase();
  if (r.includes("32")) return "32GB";
  if (r.includes("16")) return "16GB";
  if (r.includes("8")) return "8GB";
  if (r.includes("4")) return "4GB";
  return "8GB"; // default fallback
};

export function getProcessorFamily(procStr: string): string {
  const s = (procStr || "").toUpperCase();
  if (s.includes("I9")) return "Intel Core i9";
  if (s.includes("I7")) return "Intel Core i7";
  if (s.includes("I5")) return "Intel Core i5";
  if (s.includes("I3")) return "Intel Core i3";
  if (s.includes("RYZEN 9")) return "AMD Ryzen 9";
  if (s.includes("RYZEN 7")) return "AMD Ryzen 7";
  if (s.includes("RYZEN 5")) return "AMD Ryzen 5";
  if (s.includes("RYZEN 3")) return "AMD Ryzen 3";
  if (s.includes("CELERON") || s.includes("PENTIUM")) return "Intel Celeron/Pentium";
  if (s.includes("M1") || s.includes("M2") || s.includes("M3") || s.includes("APPLE") || s.includes("SILICON")) return "Apple Silicon M1/M2/M3";
  return "Intel Core i5"; // default fallback
}

export function getVgaType(vgaStr: string): string {
  const s = (vgaStr || "").toUpperCase();
  if (s.includes("RTX")) return "NVIDIA RTX Series";
  if (s.includes("GTX")) return "NVIDIA GTX Series";
  if (s.includes("RADEON") || s.includes("AMD")) {
    if (s.includes("INTEGRATED") || s.includes("VEGA") || s.includes("GRAPHICS")) return "Integrated";
    return "AMD Radeon Dedicated";
  }
  if (s.includes("IRIS") || s.includes("INTEL") || s.includes("INTEGRATED") || s.includes("XE")) return "Integrated";
  if (s.includes("M-SERIES") || s.includes("APPLE") || s.includes("M1") || s.includes("M2") || s.includes("M3")) return "Integrated";
  return "Integrated"; // default fallback
}

const getStorageVal = (str: string): number => {
  const s = (str || "").toUpperCase();

  // Handle double storage (SSD + HDD combinations)
  if (s.includes("SSD") && s.includes("HDD")) {
    let ssdVal = 350000; // default for SSD (256GB)
    let hddVal = 200000; // default for HDD (1TB)

    if (s.includes("128GB")) ssdVal = 150000;
    else if (s.includes("512GB")) ssdVal = 600000;
    else if (s.includes("1TB SSD")) ssdVal = 850000;
    else if (s.includes("2TB SSD")) ssdVal = 1100000;

    if (s.includes("500GB")) hddVal = 100000;
    else if (s.includes("2TB HDD") || s.includes("2TB")) hddVal = 300000;
    else if (s.includes("1TB")) hddVal = 200000;

    return ssdVal + hddVal;
  }

  if (s.includes("2TB")) return 1100000;
  if (s.includes("1TB") && s.includes("SSD")) return 850000;
  if (s.includes("1TB")) return 200000;
  if (s.includes("512GB")) return 600000;
  if (s.includes("256GB")) return 350000;
  if (s.includes("128GB")) return 150000;
  return 350000; // default to 256GB
};

// currentYear is hardcoded upstream; ported as-is rather than switched to
// new Date().getFullYear(), because changing it would silently shift every
// quote. It starts mis-pricing on 1 Jan 2027 (a 2026 unit reads as age 0
// forever). Worth fixing — but deliberately, and in both copies at once.
const getAgeMultiplier = (yearStr: string): number => {
  const currentYear = 2026;
  const year = parseInt(yearStr) || 2023;
  const age = currentYear - year;
  if (age <= 1) return 1.0;
  if (age === 2) return 0.90;
  if (age === 3) return 0.80;
  return 0.65; // age >= 4
};

export function estimateRepairCost(detailsStr: string): number {
  const s = (detailsStr || "").toLowerCase();
  let cost = 0;

  // Key parts repair cost lookup
  if (s.includes("layar") || s.includes("lcd") || s.includes("screen") || s.includes("display") || s.includes("gambar")) {
    cost += 1000000; // Screen replacement
  }
  if (s.includes("keyboard") || s.includes("tuts") || s.includes("tombol") || s.includes("pencetan")) {
    cost += 400000; // Keyboard replacement
  }
  if (s.includes("batre") || s.includes("baterai") || s.includes("battery") || s.includes("drop") || s.includes("bocor")) {
    cost += 500000; // Battery replacement
  }
  if (s.includes("mati") || s.includes("motherboard") || s.includes("mesin") || s.includes("mobo") || s.includes("total")) {
    cost += 2000000; // Motherboard/total replacement
  }
  if (s.includes("engsel") || s.includes("hinge") || s.includes("patah")) {
    cost += 350000; // Hinge repair
  }
  if (s.includes("speaker") || s.includes("suara") || s.includes("sember")) {
    cost += 250000; // Speaker repair
  }
  if (s.includes("charger") || s.includes("adaptor") || s.includes("casan")) {
    cost += 250000; // Charger replacement
  }
  if (s.includes("wifi") || s.includes("bluetooth") || s.includes("koneksi") || s.includes("sinyal")) {
    cost += 250000; // Wifi card replacement
  }
  if (s.includes("casing") || s.includes("body") || s.includes("retak") || s.includes("baret parah")) {
    cost += 400000; // Casing replacement
  }

  // If there are other unspecified minus points, set a default fallback repair cost
  if (cost === 0) {
    cost = 500000; // Default service cost for unspecified minor issues
  }

  return cost;
}

export function calculateAdjustedPrice(params: {
  baseMarketPrice: number;
  baseline: {
    processorFamily: string;
    ram: string;
    storage: string;
    vgaType: string;
    purchaseYear: string;
    hasWarranty: boolean;
  };
  current: {
    processorFamily: string;
    ram: string;
    storage: string;
    vgaType: string;
    purchaseYear: string;
    hasWarranty: boolean;
    completeness?: string;
    minusDetails?: string;
  };
  condition: string;
}): number {
  const procBase = PROC_VALUES[getProcessorFamily(params.baseline.processorFamily)] || 2000000;
  const procCurr = PROC_VALUES[getProcessorFamily(params.current.processorFamily)] || 2000000;
  const procAdj = procCurr - procBase;

  const ramBase = RAM_VALUES[getRamKey(params.baseline.ram)] || 400000;
  const ramCurr = RAM_VALUES[getRamKey(params.current.ram)] || 400000;
  const ramAdj = ramCurr - ramBase;

  const storeBase = getStorageVal(params.baseline.storage);
  const storeCurr = getStorageVal(params.current.storage);
  const storeAdj = storeCurr - storeBase;

  const vgaBase = VGA_VALUES[getVgaType(params.baseline.vgaType)] || 0;
  const vgaCurr = VGA_VALUES[getVgaType(params.current.vgaType)] || 0;
  const vgaAdj = vgaCurr - vgaBase;

  let adjustedMarket = params.baseMarketPrice + procAdj + ramAdj + storeAdj + vgaAdj;
  if (adjustedMarket < 1000000) adjustedMarket = 1000000;

  const ageBaseMult = getAgeMultiplier(params.baseline.purchaseYear);
  const ageCurrMult = getAgeMultiplier(params.current.purchaseYear);
  const ageRatio = ageCurrMult / ageBaseMult;
  adjustedMarket = adjustedMarket * ageRatio;

  const warrantyBaseMult = params.baseline.hasWarranty ? 1.10 : 1.0;
  const warrantyCurrMult = params.current.hasWarranty ? 1.10 : 1.0;
  const warrantyRatio = warrantyCurrMult / warrantyBaseMult;
  adjustedMarket = adjustedMarket * warrantyRatio;

  if (params.current.completeness) {
    if (params.current.completeness === "Hanya Charger") {
      adjustedMarket -= 200000;
    } else if (params.current.completeness === "Hanya Batangan") {
      adjustedMarket -= 400000;
    }
  }

  // 30% profit margin for the shop (70% offer price)
  const baseOffer = adjustedMarket * 0.70;

  const condStr = (params.condition || "").toUpperCase();

  if (condStr.includes("USED_A") || condStr.includes("MULUS") || condStr === "A") {
    return Math.max(500000, Math.round((baseOffer * 1.0) / 50000) * 50000);
  }

  if (condStr.includes("USED_C") || condStr.includes("MINUS") || condStr === "C") {
    // Service/Sparepart cost deduction
    const details = params.current.minusDetails || "";
    const repairCost = estimateRepairCost(details);
    const priceWithRepair = (baseOffer * 0.90) - repairCost;
    // Set a safe floor of 40% of base offer
    const finalPrice = Math.max(baseOffer * 0.40, priceWithRepair);
    return Math.max(500000, Math.round(finalPrice / 50000) * 50000);
  }

  if (condStr.includes("BROKEN") || condStr.includes("RUSAK") || condStr === "D") {
    const details = params.current.minusDetails || "";
    const repairCost = estimateRepairCost(details) * 1.5;
    const priceWithRepair = (baseOffer * 0.80) - repairCost;
    // Set a safe floor of 20% of base offer
    const finalPrice = Math.max(baseOffer * 0.20, priceWithRepair);
    return Math.max(500000, Math.round(finalPrice / 50000) * 50000);
  }

  // USED_B / BARET (default)
  return Math.max(500000, Math.round((baseOffer * 0.85) / 50000) * 50000);
}
