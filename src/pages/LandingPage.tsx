import { useState, useEffect } from "react"
import { 
  laptopConditions, 
  laptopDefects,
  laptopProcessors,
  laptopVGAs,
  laptopRAMs,
  laptopStorages
} from "@/lib/laptopSpecsData"
import { LAPTOP_MODELS } from "@/data/laptop-models"
import { Link, useNavigate } from "react-router-dom"
import { 
  Store, 
  Wrench, 
  ShoppingBag, 
  RefreshCw, 
  Search, 
  HelpCircle, 
  ChevronRight, 
  MapPin, 
  Phone, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  Compass, 
  TrendingUp, 
  ArrowRight,
  Activity,
  ShieldCheck,
  Award,
  Zap,
  Info,
  Clock,
  Laptop,
  Sparkles,
  ExternalLink,
  ArrowLeft,
  MessageCircle,
  Menu,
  X
} from "lucide-react"

const Instagram = (props: any) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ModernSelect } from "@/components/ui/modern-select"
import { Autocomplete } from "@/components/ui/autocomplete"
import { toast } from "sonner"

// Price calculation engine constants and helpers for reactive pricing
const RAM_VALUES: Record<string, number> = {
  "4GB": 200000,
  "8GB": 400000,
  "16GB": 800000,
  "32GB": 1600000
};

const getRamKey = (ramStr: string): string => {
  const r = (ramStr || "").toUpperCase();
  if (r.includes("32")) return "32GB";
  if (r.includes("16")) return "16GB";
  if (r.includes("8")) return "8GB";
  if (r.includes("4")) return "4GB";
  return "8GB"; // default fallback
};

// Laptop Model Suggestions per Brand
const getBrandSuggestions = (brand: string) => {
  if (!brand) return [];
  // Filter the complete database for models that match the selected brand
  const suggestions = LAPTOP_MODELS.filter(model => model.toLowerCase().includes(brand.toLowerCase()));
  
  // Also provide a fallback in case the brand isn't well represented in the database yet
  if (suggestions.length === 0) {
    switch (brand) {
      case "Asus": return ["ROG Strix G15", "ROG Strix SCAR", "ROG Zephyrus G14", "TUF Gaming A15", "ZenBook 14", "VivoBook 14", "ExpertBook B9"];
      case "Lenovo": return ["Legion 5 Pro", "ThinkPad X1 Carbon", "IdeaPad Gaming 3", "Yoga 9i", "LOQ 15"];
      case "HP": return ["Omen 16", "Victus 15", "Pavilion Aero 13", "Envy x360", "Spectre x360", "EliteBook 840"];
      case "Acer": return ["Predator Helios 16", "Nitro 5", "Swift Go 14", "Aspire 5"];
      case "Dell": return ["Alienware m15", "XPS 13", "Inspiron 15", "Latitude 5420"];
      case "MacBook": return ["MacBook Air M1 (2020)", "MacBook Air M2 (2022)", "MacBook Pro M2 Pro 14-inch"];
      case "MSI": return ["Katana 15", "Cyborg 15", "Raider GE78", "Modern 14"];
      default: return [];
    }
  }
  return suggestions;
}

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

export function sanitizeStorageString(storageStr: string): string {
  const s = (storageStr || "").toUpperCase();
  if (s.includes("SSD") && s.includes("HDD")) {
    if (s.includes("512GB") && s.includes("1TB")) return "512GB SSD + 1TB HDD";
    if (s.includes("256GB") && s.includes("1TB")) return "256GB SSD + 1TB HDD";
    if (s.includes("128GB") && s.includes("1TB")) return "128GB SSD + 1TB HDD";
    if (s.includes("1TB") && s.includes("1TB")) return "1TB SSD + 1TB HDD";
    return "256GB SSD + 1TB HDD"; // default double storage fallback
  }
  if (s.includes("2TB")) return "2TB SSD";
  if (s.includes("1TB") && s.includes("SSD")) return "1TB SSD";
  if (s.includes("1TB") || s.includes("1 TB")) return "1TB HDD";
  if (s.includes("500GB") || s.includes("500 GB")) return "500GB HDD";
  if (s.includes("512GB") || s.includes("512 GB")) return "512GB SSD";
  if (s.includes("128GB") || s.includes("128 GB")) return "128GB SSD";
  return "256GB SSD"; // default fallback
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

const VGA_VALUES: Record<string, number> = {
  "Integrated": 0,
  "NVIDIA GTX Series": 800000,
  "NVIDIA RTX Series": 2200000,
  "AMD Radeon Dedicated": 1000000
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
  "Apple Silicon M1/M2/M3": 3500000
};

const getAgeMultiplier = (yearStr: string): number => {
  const currentYear = 2026;
  const year = parseInt(yearStr) || 2023;
  const age = currentYear - year;
  if (age <= 1) return 1.0;
  if (age === 2) return 0.90;
  if (age === 3) return 0.80;
  return 0.65; // age >= 4
};

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
}) {
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
  let baseOffer = adjustedMarket * 0.70;

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

const selectStyle = {
  backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3E%3C/svg%3E")`,
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '1.25em 1.25em',
  backgroundRepeat: 'no-repeat',
  paddingRight: '2.5rem'
};

export function LandingPage() {
  const navigate = useNavigate()
  const [activeSection, _setActiveSection] = useState<string>("hero")
  const [activeHeroTab, setActiveHeroTab] = useState<"cari" | "jual" | "tukar" | "servis">("cari")
  const [lightboxImage, setLightboxImage] = useState<string | null>(null)

  const setActiveSection = (section: string) => {
    if (section !== activeSection) {
      if (section !== "hero") {
        window.history.pushState({ section }, "", `#${section}`);
      } else {
        window.history.pushState({ section: "hero" }, "", window.location.pathname);
      }
      _setActiveSection(section);
      window.scrollTo({ top: 0, behavior: "smooth" });

      if (section === "jual" || section === "tukar") {
        setJualResult(null);
        setJualSubmitted(false);
        setJualSpecDetectedByAi(false);
        setJualAiBaseline(null);
        setJualSelectedDefects([]);
        setJualCustomDefect("");
        setJualWarrantyDuration("");
        setJualStep(1);
        setJualPhysicalCondition("Mulus");
        setJualHasFunctionIssue(false);
        setJualHasServiceHistory(false);
        setJualServiceDetails("");
      }
    }
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.section) {
        _setActiveSection(event.state.section);
      } else {
        _setActiveSection("hero");
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  const [storeInfo, setStoreInfo] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  
  const getWhatsAppUrlWithText = (text: string) => {
    let num = storeInfo?.store?.phone || "628123456789";
    num = num.replace(/\D/g, "");
    if (num.startsWith("0")) {
      num = "62" + num.slice(1);
    }
    if (num.length < 9) {
      num = "628123456789";
    }
    return `https://wa.me/${num}?text=${encodeURIComponent(text)}`;
  };
  
  // States for Jual Laptop (Valuasi Instan & Lead Submission)
  const [jualStep, setJualStep] = useState(1)
  const [jualName, setJualName] = useState("")
  const [jualPhone, setJualPhone] = useState("")
  const [jualBrand, setJualBrand] = useState("Asus")
  const [jualModel, setJualModel] = useState("")
  const [jualProcessor, setJualProcessor] = useState("Intel Core i5")
  const [jualRam, setJualRam] = useState("8GB")
  const [jualStorage, setJualStorage] = useState("256GB SSD")
  const [jualVga, setJualVga] = useState("Integrated")
  const [jualCondition, setJualCondition] = useState("Mulus")
  const [jualConditionDetails, setJualConditionDetails] = useState("")
  const [jualCompleteness, setJualCompleteness] = useState("Lengkap")
  const [jualResult, setJualResult] = useState<any>(null)
  const [jualLoading, setJualLoading] = useState(false)
  const [jualSubmitted, setJualSubmitted] = useState(false)
  
  // States for Step 2 - Physical Condition & Function Check
  const [jualPhysicalCondition, setJualPhysicalCondition] = useState("Mulus")
  const [jualHasFunctionIssue, setJualHasFunctionIssue] = useState(false)
  const [jualHasServiceHistory, setJualHasServiceHistory] = useState(false)
  const [jualServiceDetails, setJualServiceDetails] = useState("")
  
  // States for AI estimation features
  const [jualPurchaseYear, setJualPurchaseYear] = useState(new Date().getFullYear().toString())
  const [jualHasWarranty, setJualHasWarranty] = useState("no")
  const [jualWarrantyDuration, setJualWarrantyDuration] = useState("")
  const [jualAiLoading, setJualAiLoading] = useState(false)
  const [jualAiBaseline, setJualAiBaseline] = useState<any>(null)
  const [jualLowestMarketPrice, setJualLowestMarketPrice] = useState<number>(3000000)
  const [jualSpecDetectedByAi, setJualSpecDetectedByAi] = useState<boolean>(false)
  const [jualSelectedDefects, setJualSelectedDefects] = useState<string[]>([])
  const [jualCustomDefect, setJualCustomDefect] = useState("")

  // Sync checklist and custom defect into jualConditionDetails
  useEffect(() => {
    const defects = [...jualSelectedDefects]
    if (jualCustomDefect.trim()) {
      defects.push(jualCustomDefect.trim())
    }
    setJualConditionDetails(defects.join(", "))
  }, [jualSelectedDefects, jualCustomDefect])

  const handleDefectToggle = (defect: string) => {
    setJualSelectedDefects(prev => 
      prev.includes(defect) 
        ? prev.filter(d => d !== defect) 
        : [...prev, defect]
    )
  }

  const handleJualAutocomplete = async () => {
    if (!jualModel.trim()) {
      toast.error("Silakan ketik tipe/model laptop terlebih dahulu (misal: ROG Zephyrus G14).")
      return
    }
    if (!jualPurchaseYear.trim()) {
      toast.error("Silakan isi Tahun Pembelian terlebih dahulu sebelum mendeteksi spesifikasi.")
      return
    }
    
    setJualAiLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/buyback/estimate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${jualBrand} ${jualModel}`,
          purchaseYear: jualPurchaseYear || undefined,
          hasWarranty: jualHasWarranty === "yes"
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Gagal menghubungi AI")

      const ai = data.data
      
      // Auto-fill the form dropdowns/states!
      if (ai.brand) {
        const standardBrand = ["Asus", "Lenovo", "HP", "Acer", "Dell", "MacBook", "MSI", "Gigabyte"].includes(ai.brand) ? ai.brand : "Lainnya";
        setJualBrand(standardBrand)
      }
      if (ai.model) setJualModel(ai.model)
      
      if (ai.processor) {
        setJualProcessor(ai.processor)
      }
      
      if (ai.ram) {
        const standardRam = ["4GB", "8GB", "16GB", "32GB"].includes(ai.ram) ? ai.ram : "8GB";
        setJualRam(standardRam)
      }
      
      if (ai.storage) {
        setJualStorage(sanitizeStorageString(ai.storage))
      }

      if (ai.vga) {
        setJualVga(ai.vga)
      }

      const finalProcFamily = ai.processor || "Intel Core i5";
      const finalRam = ai.ram ? (["4GB", "8GB", "16GB", "32GB"].includes(ai.ram) ? ai.ram : "8GB") : "8GB";
      const finalStorage = ai.storage ? sanitizeStorageString(ai.storage) : "256GB SSD";
      const finalVga = ai.vga || "Integrated";

      const baseline = {
        processorFamily: finalProcFamily,
        ram: finalRam,
        storage: finalStorage,
        vgaType: finalVga,
        purchaseYear: jualPurchaseYear || "2023",
        hasWarranty: jualHasWarranty === "yes"
      };

      setJualAiBaseline(baseline)
      setJualLowestMarketPrice(ai.lowestMarketPrice || 3000000)
      setJualSpecDetectedByAi(true)
      setJualResult(null) // clear price result to force spec review

      toast.success("Spesifikasi berhasil dideteksi AI! Silakan periksa kembali spesifikasi sebelum menaksir harga. ✨")
    } catch (err: any) {
      toast.error(err.message || "Gagal mendeteksi spesifikasi otomatis. Silakan isi manual di bawah.")
      
      const baseline = {
        processorFamily: jualProcessor,
        ram: jualRam,
        storage: jualStorage,
        vgaType: jualVga,
        purchaseYear: jualPurchaseYear || "2023",
        hasWarranty: jualHasWarranty === "yes"
      };
      
      setJualSpecDetectedByAi(true)
      setJualAiBaseline(baseline)
      setJualLowestMarketPrice(3000000)
      setJualResult(null)
    } finally {
      setJualAiLoading(false)
    }
  }

  // States for Servis (Diagnosis Awal & Booking)
  const [servisName, setServisName] = useState("")
  const [servisPhone, setServisPhone] = useState("")
  const [servisAddress, setServisAddress] = useState("")
  const [servisDeviceName, setServisDeviceName] = useState("")
  const [servisIssueCategory, setServisIssueCategory] = useState("Mati Total")
  const [servisDesc, setServisDesc] = useState("")
  const [servisDiagnosisResult, setServisDiagnosisResult] = useState<any>(null)
  const [servisLoading, setServisLoading] = useState(false)
  const [servisSubmitted, setServisSubmitted] = useState(false)

  // States for Lacak Status
  const [trackInvoice, setTrackInvoice] = useState("")
  const [trackResult, setTrackResult] = useState<any>(null)
  const [trackLoading, setTrackLoading] = useState(false)

  const [selectedBranch, setSelectedBranch] = useState<string>(() => localStorage.getItem("selectedBranchSlug") || "default")
  const [newLaptopSearch, setNewLaptopSearch] = useState("")
  const [showDropdown, setShowDropdown] = useState(false)

  const handleBranchChange = (slug: string) => {
    setSelectedBranch(slug)
    localStorage.setItem("selectedBranchSlug", slug)
    // Clear simulator selections when switching branch
    setNewLaptopSearch("")
    setJualResult(null)
  }

  const selectTargetLaptop = (name: string, price: number) => {
    setNewLaptopSearch(name);
    setShowDropdown(false);
    
    const tradeInNewModelInput = document.getElementById("tradeInNewModel") as HTMLInputElement;
    const hargaBaruInput = document.getElementById("hargaBaruInput") as HTMLInputElement;
    if (tradeInNewModelInput) tradeInNewModelInput.value = name;
    if (hargaBaruInput) hargaBaruInput.value = price.toString();

    // Trigger automatic calculation
    const taksiranLama = jualResult?.offerValueRangeMin || 0;
    setJualResult((prev: any) => ({
      ...prev,
      tradeInNew: price,
      tradeInNewName: name,
      tradeInDiff: price - taksiranLama
    }));
  };

  // Fetch Store Info for Landing Page
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/catalog/${selectedBranch}`)
        if (res.ok) {
          const json = await res.json()
          setStoreInfo(json)
        }
      } catch (err) {
        console.error("Failed to load landing page info:", err)
      }
    }
    fetchStoreInfo()
  }, [selectedBranch])

  // Derive jualCondition from physicalCondition + functionIssue for pricing
  useEffect(() => {
    if (jualPhysicalCondition === "Mulus") {
      setJualCondition(jualHasFunctionIssue ? "Minus Fungsi/Rusak" : "Mulus")
    } else if (jualPhysicalCondition === "Baret Ringan") {
      setJualCondition(jualHasFunctionIssue ? "Minus Fungsi/Rusak" : "Baret Ringan")
    } else {
      // Penyok/Dent, Cat Mengelupas, Patah → always "Minus Fungsi/Rusak"
      setJualCondition("Minus Fungsi/Rusak")
    }
  }, [jualPhysicalCondition, jualHasFunctionIssue])

  // Calculate taksiran price (called when moving to Step 3)
  const calculateJualTaksiran = () => {
    const baseMarketPrice = jualLowestMarketPrice || 3000000;
    const baseline = jualAiBaseline || {
      processorFamily: "Intel Core i5",
      ram: "8GB",
      storage: "256GB SSD",
      vgaType: "Integrated",
      purchaseYear: "2023",
      hasWarranty: false
    };

    const current = {
      processorFamily: jualProcessor,
      ram: jualRam,
      storage: jualStorage,
      vgaType: jualVga,
      purchaseYear: jualPurchaseYear,
      hasWarranty: jualHasWarranty === "yes",
      completeness: jualCompleteness,
      minusDetails: jualConditionDetails
    };

    const offerPrice = calculateAdjustedPrice({
      baseMarketPrice,
      baseline,
      current,
      condition: jualCondition
    });

    // Range: ±10% rounded to 50k
    const roundTo50k = (v: number) => Math.max(500000, Math.round(v / 50000) * 50000);
    const rangeMin = roundTo50k(offerPrice * 0.90);
    const rangeMax = roundTo50k(offerPrice * 1.10);

    setJualResult({
      lowestMarketPrice: baseMarketPrice,
      offerValueRangeMin: rangeMin,
      offerValueRangeMax: rangeMax,
      isLocalFallback: !jualAiBaseline,
      aiBaseline: baseline
    });
  }

  // Reactive Effect: Automatically recalculate price when specs or conditions change
  useEffect(() => {
    if (!jualResult || !jualResult.aiBaseline) return;

    const baseMarketPrice = jualResult.lowestMarketPrice || 3000000;
    const baseline = jualResult.aiBaseline;

    const current = {
      processorFamily: jualProcessor,
      ram: jualRam,
      storage: jualStorage,
      vgaType: jualVga,
      purchaseYear: jualPurchaseYear,
      hasWarranty: jualHasWarranty === "yes",
      completeness: jualCompleteness
    };

    const offerPrice = calculateAdjustedPrice({
      baseMarketPrice,
      baseline,
      current,
      condition: jualCondition
    });

    // Only update state if the value has actually changed to avoid render loops
    const roundTo50k = (v: number) => Math.max(500000, Math.round(v / 50000) * 50000);
    const newMin = roundTo50k(offerPrice * 0.90);
    const newMax = roundTo50k(offerPrice * 1.10);
    if (jualResult.offerValueRangeMin !== newMin || jualResult.offerValueRangeMax !== newMax) {
      setJualResult((prev: any) => {
        if (!prev) return prev;
        return {
          ...prev,
          offerValueRangeMin: newMin,
          offerValueRangeMax: newMax
        };
      });
    }
  }, [
    jualProcessor,
    jualRam,
    jualStorage,
    jualVga,
    jualCondition,
    jualCompleteness,
    jualPurchaseYear,
    jualHasWarranty,
    jualResult?.lowestMarketPrice
  ]);

  // Submit Jual Laptop Lead to DB
  const submitJualLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jualName.trim() || !jualPhone.trim()) {
      toast.error("Nama dan Nomor WhatsApp wajib diisi.")
      return
    }

    setJualLoading(true)
    try {
      const physCondText = `Fisik: ${jualPhysicalCondition}` + 
        (jualHasFunctionIssue && jualConditionDetails ? ` | Minus: ${jualConditionDetails}` : '') +
        (jualHasServiceHistory ? ` | Riwayat Service: ${jualServiceDetails || 'Ya'}` : '');
      
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/buyback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeInfo?.store?.id || "default",
          customerName: jualName,
          customerPhone: jualPhone,
          brand: `${jualBrand} ${jualModel}`,
          processor: `${jualProcessor} | Tahun: ${jualPurchaseYear || '-'} | Garansi Resmi: ${jualHasWarranty === 'yes' ? `Aktif (${jualWarrantyDuration || '0'} Bulan)` : 'Habis/Tidak Ada'}`,
          ram: jualRam,
          storage: `${jualStorage} | VGA: ${jualVga}`,
          condition: physCondText,
          completeness: jualCompleteness,
          estimatedMarketPrice: jualResult.lowestMarketPrice,
          estimatedOfferPriceMin: jualResult.offerValueRangeMin,
          estimatedOfferPriceMax: jualResult.offerValueRangeMax,
          type: "JUAL_LAPTOP"
        })
      })

      if (res.ok) {
        setJualSubmitted(true)
        toast.success("Penawaran Anda berhasil disimpan! Dialihkan ke WhatsApp...")

        const messageText = `Halo Han Laptop, saya ingin menjual laptop saya:\n` +
          `- *Nama*: ${jualName}\n` +
          `- *No WA*: ${jualPhone}\n` +
          `- *Model*: ${jualBrand} ${jualModel}\n` +
          `- *Spesifikasi*: ${jualProcessor}, RAM ${jualRam}, ${jualStorage}, VGA ${jualVga}\n` +
          `- *Kondisi Fisik*: ${jualPhysicalCondition}\n` +
          (jualHasFunctionIssue && jualConditionDetails ? `- *Minus Fungsi*: ${jualConditionDetails}\n` : '') +
          (jualHasServiceHistory ? `- *Riwayat Service*: ${jualServiceDetails || 'Ya'}\n` : '') +
          `- *Kelengkapan*: ${jualCompleteness}\n` +
          `- *Tahun Pembelian*: ${jualPurchaseYear || '-'}\n` +
          `- *Garansi*: ${jualHasWarranty === 'yes' ? `Aktif (${jualWarrantyDuration || '0'} Bulan)` : 'Habis/Tidak Ada'}\n` +
          `- *Estimasi Taksiran*: ${formatCurrency(jualResult.offerValueRangeMin)} – ${formatCurrency(jualResult.offerValueRangeMax)}`;

        window.open(getWhatsAppUrlWithText(messageText), "_blank");
      } else {
        const errJson = await res.json()
        throw new Error(errJson.error || "Gagal menyimpan lead.")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setJualLoading(false)
    }
  }

  // Submit Tukar Tambah Lead to DB
  const submitTukarLead = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jualName.trim() || !jualPhone.trim()) {
      toast.error("Nama dan Nomor WhatsApp wajib diisi.")
      return
    }

    setJualLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/buyback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeInfo?.store?.id || "default",
          customerName: jualName,
          customerPhone: jualPhone,
          brand: (document.getElementById("tradeInOldModel") as HTMLInputElement)?.value || `${jualBrand} ${jualModel}` || "Lama",
          processor: jualResult?.aiBaseline ? `${jualProcessor} | Tahun: ${jualPurchaseYear || '-'} | Garansi Resmi: ${jualHasWarranty === 'yes' ? 'Aktif' : 'Habis/Tidak Ada'}` : "Lama",
          ram: jualResult?.aiBaseline ? jualRam : "Lama",
          storage: jualResult?.aiBaseline ? `${jualStorage} | VGA: ${jualVga}` : "Lama",
          condition: jualResult?.aiBaseline 
            ? (jualCondition === "Minus Fungsi/Rusak" && jualConditionDetails ? `Minus (${jualConditionDetails})` : jualCondition)
            : "Lama",
          completeness: jualResult?.aiBaseline ? jualCompleteness : "Lama",
          estimatedMarketPrice: 0,
          estimatedOfferPriceMin: jualResult.offerValueRangeMin,
          estimatedOfferPriceMax: jualResult.offerValueRangeMax,
          type: "TUKAR_TAMBAH",
          targetLaptopName: jualResult.tradeInNewName || "Laptop Pilihan Baru",
          targetLaptopPrice: jualResult.tradeInNew
        })
      })

      if (res.ok) {
        setJualSubmitted(true)
        toast.success("Booking Tukar Tambah berhasil disimpan! Dialihkan ke WhatsApp...")

        const condVal = jualResult?.aiBaseline
          ? (jualCondition === "Minus Fungsi/Rusak" && jualConditionDetails ? `Minus (${jualConditionDetails})` : jualCondition)
          : "Lama";
        const specsText = jualResult?.aiBaseline
          ? `${jualProcessor}, RAM ${jualRam}, ${jualStorage}, VGA ${jualVga}`
          : "Lama";
        const targetModel = (document.getElementById("tradeInOldModel") as HTMLInputElement)?.value || `${jualBrand} ${jualModel}` || "Lama";
        
        const messageText = `Halo Han Laptop, saya ingin Tukar Tambah laptop:\n` +
          `- *Nama*: ${jualName}\n` +
          `- *No WA*: ${jualPhone}\n` +
          `- *Laptop Lama*: ${targetModel}\n` +
          `- *Spesifikasi*: ${specsText}\n` +
          `- *Kondisi*: ${condVal}\n` +
          `- *Kelengkapan*: ${jualResult?.aiBaseline ? jualCompleteness : "Lama"}\n` +
          `- *Tahun Pembelian*: ${jualPurchaseYear || '-'}\n` +
          `- *Garansi*: ${jualHasWarranty === 'yes' ? 'Aktif' : 'Habis/Tidak Ada'}\n` +
          `- *Nilai Taksiran Lama*: ${formatCurrency(jualResult.offerValueRangeMin)}\n\n` +
          `- *Laptop Baru Pilihan*: ${jualResult.tradeInNewName || "Laptop Pilihan Baru"} (${formatCurrency(jualResult.tradeInNew)})\n` +
          `- *Estimasi Tambah Biaya*: ${formatCurrency(jualResult.tradeInDiff)}`;

        window.open(getWhatsAppUrlWithText(messageText), "_blank");
      } else {
        const errJson = await res.json()
        throw new Error(errJson.error || "Gagal menyimpan data tukar tambah.")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setJualLoading(false)
    }
  }

  // Action for Servis Diagnosis Awal
  const handleServisDiagnosis = (e: React.FormEvent) => {
    e.preventDefault()
    if (!servisDesc.trim()) {
      toast.error("Silakan deskripsikan gejala kerusakan terlebih dahulu.")
      return
    }

    let diagnosis = ""
    let estJasa = 150000
    let estSparepart = 0
    let confidence = 85

    const text = servisDesc.toLowerCase()
    if (servisIssueCategory === "Mati Total" || text.includes("mati") || text.includes("power")) {
      diagnosis = "Kemungkinan besar terjadi kerusakan pada sirkuit Power/IC Charger atau Power Supply internal. Diperlukan pengecekan jalur kelistrikan motherboard."
      estSparepart = 350000
      estJasa = 250000
      confidence = 90
    } else if (servisIssueCategory === "Layar Pecah/Garis" || text.includes("layar") || text.includes("lcd") || text.includes("garis")) {
      diagnosis = "Kerusakan fisik pada LCD panel. Solusi utama adalah penggantian LCD Panel sesuai dengan tipe & ukuran laptop Anda."
      estSparepart = 850000
      estJasa = 150000
      confidence = 95
    } else if (servisIssueCategory === "Laptop Lemot" || text.includes("lemot") || text.includes("lambat") || text.includes("upgrade")) {
      diagnosis = "Performa melambat dikarenakan penyimpanan masih menggunakan HDD atau kapasitas RAM yang kurang. Rekomendasi: Upgrade ke SSD dan tambah RAM ke 8GB/16GB."
      estSparepart = 450000
      estJasa = 100000
      confidence = 80
    } else {
      diagnosis = "Gejala menunjukkan adanya masalah sistem operasi atau kerusakan komponen input (Keyboard/Touchpad). Perlu pembersihan internal dan pengecekan konektor flexibel."
      estSparepart = 150000
      estJasa = 100000
      confidence = 75
    }

    setServisDiagnosisResult({
      diagnosis,
      estJasa,
      estSparepart,
      confidence,
      issue: servisIssueCategory
    })
    toast.success("Diagnosis selesai! Silakan lengkapi form di bawah untuk booking servis.")
  }

  // Submit Booking Servis to DB
  const submitServisBooking = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!servisName.trim() || !servisPhone.trim() || !servisDeviceName.trim()) {
      toast.error("Nama, Phone, dan Merek Laptop wajib diisi.")
      return
    }

    setServisLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/booking`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: storeInfo?.store?.id || "default",
          customerName: servisName,
          customerPhone: servisPhone,
          customerAddress: servisAddress,
          deviceName: servisDeviceName,
          issue: `[Kategori: ${servisIssueCategory}] ${servisDesc}`,
          estimatedCost: (servisDiagnosisResult?.estJasa || 150000) + (servisDiagnosisResult?.estSparepart || 0),
          notes: "Booking diajukan via Landing Page publik."
        })
      })

      if (res.ok) {
        setServisSubmitted(true)
        toast.success("Booking jadwal servis berhasil diajukan!")
      } else {
        const errJson = await res.json()
        throw new Error(errJson.error || "Gagal melakukan booking.")
      }
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setServisLoading(false)
    }
  }

  // Action for Lacak Status Servis
  const handleTrackStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!trackInvoice.trim()) {
      toast.error("Silakan masukkan Nomor Invoice / ID Servis.")
      return
    }
    setTrackLoading(true)
    setTrackResult(null)

    try {
      // First try fetching public service receipt
      const resService = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/service/${trackInvoice}`)
      if (resService.ok) {
        const json = await resService.json()
        if (json && json.service) {
          setTrackResult({
            type: "service",
            id: json.service.id,
            invoiceNumber: json.service.invoiceNumber || json.service.id,
            customerName: json.customer?.name || "Pelanggan",
            status: json.service.status,
            itemName: json.service.itemName,
            totalCost: json.service.totalCost,
            notes: json.service.notes || json.service.diagnosis || "Dalam pengecekan teknisi."
          })
          setTrackLoading(false)
          return
        }
      }

      // Then try public transaction invoice
      const resInvoice = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/public/invoice/${trackInvoice}`)
      if (resInvoice.ok) {
        const json = await resInvoice.json()
        setTrackResult({
          type: "transaction",
          id: json.transaction.id,
          invoiceNumber: json.transaction.invoiceNumber,
          customerName: json.customer?.name || "Pelanggan",
          status: json.transaction.status === "COMPLETED" ? "Lunas / Selesai" : "Pending / Proses",
          itemName: json.items?.map((i: any) => i.itemName).join(", ") || "Produk Laptop",
          totalCost: json.transaction.totalAmount,
          notes: "Transaksi penjualan tercatat resmi di sistem Han Laptop."
        })
        setTrackLoading(false)
        return
      }

      toast.error("Data transaksi atau servis tidak ditemukan. Periksa kembali nomor nota Anda.")
    } catch (err) {
      toast.error("Gagal melakukan pelacakan status saat ini.")
    } finally {
      setTrackLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-slate-900 selection:text-white overflow-x-hidden">
      
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100 px-4 lg:px-8 py-4 transition-all duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveSection("hero")}>
            <div className="h-10 w-10 bg-slate-900 rounded-xl flex items-center justify-center p-2 shadow-sm">
              <Laptop className="h-5 w-5 text-white" strokeWidth={1.5} />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-900">
              {storeInfo?.store?.name || "Han Laptop"}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1 text-xs font-semibold bg-slate-100/60 border border-slate-200/50 p-1 rounded-xl">
            <button 
              onClick={() => {
                setActiveSection("hero")
                document.getElementById("layanan")?.scrollIntoView({ behavior: "smooth" })
              }}
              className={`transition-all duration-200 cursor-pointer px-4 py-1.5 rounded-lg ${activeSection === "hero" ? "bg-white border border-slate-200/80 text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
            >
              Layanan
            </button>
            <button 
              onClick={() => {
                setActiveSection("jual")
                setJualSubmitted(false)
                setJualResult(null)
              }}
              className={`transition-all duration-200 cursor-pointer px-4 py-1.5 rounded-lg ${activeSection === "jual" ? "bg-white border border-slate-200/80 text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
            >
              Jual Laptop
            </button>
            <button 
              onClick={() => {
                setActiveSection("servis")
                setServisSubmitted(false)
                setServisDiagnosisResult(null)
              }}
              className={`transition-all duration-200 cursor-pointer px-4 py-1.5 rounded-lg ${activeSection === "servis" ? "bg-white border border-slate-200/80 text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
            >
              Lab Servis
            </button>
            <button 
              onClick={() => {
                setActiveSection("tukar")
                setJualSubmitted(false)
                setJualResult(null)
              }}
              className={`transition-all duration-200 cursor-pointer px-4 py-1.5 rounded-lg ${activeSection === "tukar" ? "bg-white border border-slate-200/80 text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
            >
              Tukar Tambah
            </button>
            <button 
              onClick={() => {
                setActiveSection("lacak")
                setTrackResult(null)
              }}
              className={`transition-all duration-200 cursor-pointer px-4 py-1.5 rounded-lg ${activeSection === "lacak" ? "bg-white border border-slate-200/80 text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-850"}`}
            >
              Lacak Status
            </button>
          </div>

          {/* Action Area (Desktop) */}
          <div className="hidden md:flex items-center gap-3">
            {storeInfo?.branches && storeInfo.branches.length > 0 && (
              <div className="w-48">
                <ModernSelect
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  options={storeInfo.branches.map((br: any) => ({
                    value: br.slug,
                    label: <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-500 shrink-0" /> <span className="truncate">{br.name}</span></div>
                  }))}
                  className="bg-white border-slate-200 text-xs font-semibold text-slate-800 rounded-lg h-9 shadow-xs"
                />
              </div>
            )}
            <Link to={`/catalog/${selectedBranch}`}>
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg cursor-pointer h-9 px-4 text-xs transition-colors shadow-xs">
                Katalog Stok
              </Button>
            </Link>
            <Link to="/login">
              <Button size="sm" variant="ghost" className="text-slate-500 hover:text-slate-900 font-bold rounded-lg cursor-pointer h-9 text-xs transition-colors">
                Login Staff
              </Button>
            </Link>
          </div>

          {/* Mobile Right Controls */}
          <div className="flex md:hidden items-center gap-2">
            {storeInfo?.branches && storeInfo.branches.length > 0 && (
              <div className="w-36">
                <ModernSelect
                  value={selectedBranch}
                  onChange={handleBranchChange}
                  options={storeInfo.branches.map((br: any) => ({
                    value: br.slug,
                    label: <div className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-500 shrink-0" /> <span className="truncate">{br.name.replace("Cabang ", "")}</span></div>
                  }))}
                  className="bg-white border-slate-200 text-[10px] text-slate-700 rounded-lg h-8 px-2"
                />
              </div>
            )}
            
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3 font-semibold text-slate-500 text-sm animate-in slide-in-from-top duration-200">
            <button 
              onClick={() => {
                setActiveSection("hero")
                setMobileMenuOpen(false)
                setTimeout(() => {
                  document.getElementById("layanan")?.scrollIntoView({ behavior: "smooth" })
                }, 100)
              }}
              className="text-left py-2 border-b border-slate-100 hover:text-slate-900 transition-colors"
            >
              Layanan
            </button>
            <button 
              onClick={() => {
                setActiveSection("jual")
                setJualSubmitted(false)
                setJualResult(null)
                setMobileMenuOpen(false)
              }}
              className={`text-left py-2 border-b border-slate-100 hover:text-slate-900 transition-colors ${activeSection === "jual" ? "text-slate-900 font-bold" : ""}`}
            >
              Jual Laptop
            </button>
            <button 
              onClick={() => {
                setActiveSection("servis")
                setServisSubmitted(false)
                setServisDiagnosisResult(null)
                setMobileMenuOpen(false)
              }}
              className={`text-left py-2 border-b border-slate-100 hover:text-slate-900 transition-colors ${activeSection === "servis" ? "text-slate-900 font-bold" : ""}`}
            >
              Lab Servis
            </button>
            <button 
              onClick={() => {
                setActiveSection("tukar")
                setJualSubmitted(false)
                setJualResult(null)
                setMobileMenuOpen(false)
              }}
              className={`text-left py-2 border-b border-slate-100 hover:text-slate-900 transition-colors ${activeSection === "tukar" ? "text-slate-900 font-bold" : ""}`}
            >
              Tukar Tambah
            </button>
            <button 
              onClick={() => {
                setActiveSection("lacak")
                setTrackResult(null)
                setMobileMenuOpen(false)
              }}
              className={`text-left py-2 border-b border-slate-100 hover:text-slate-900 transition-colors ${activeSection === "lacak" ? "text-slate-900 font-bold" : ""}`}
            >
              Lacak Status
            </button>

            <div className="flex flex-col gap-2 pt-2">
              <Link to={`/catalog/${selectedBranch}`} onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer">
                  Katalog Stok 📦
                </Button>
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full h-11 text-slate-700 hover:bg-slate-50 border-slate-200 font-bold rounded-lg flex items-center justify-center cursor-pointer">
                  Login Staff 🔑
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      {activeSection === "hero" && (
        <main className="relative z-10 max-w-6xl mx-auto px-4 pt-4 pb-8 space-y-4 sm:space-y-5">
          
          {/* MOBILE HERO SECTION (Card with background image and shadow overlay) */}
          <div className="block sm:hidden relative overflow-hidden rounded-[24px] p-5 min-h-[260px] flex flex-col justify-end bg-white">
            {/* Background Image */}
            <img 
              src="/hero-bg.png" 
              alt="Han Laptop Store" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark gradient shadow overlay (from bottom to top) */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>

            {/* Text Content */}
            <div className="relative z-10 space-y-3 text-left">
              {/* Tag (Light glassmorphism style) */}
              <div className="inline-flex items-center bg-white/15 border border-white/20 text-white text-[12px] font-bold px-2.5 py-0.5 rounded-md backdrop-blur-xs shadow-xs">
                Satu Tempat untuk Semua Kebutuhan Laptop.
              </div>
              
              {/* Heading */}
              <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
                Laptop Berkualitas, Transaksi Lebih Tenang.
              </h1>
              
              {/* Description */}
              <p className="text-slate-200 text-[12px] leading-relaxed font-bold">
                Nikmati pengalaman membeli, menjual, servis, dan upgrade laptop dengan proses yang mudah, penawaran harga terbaik, serta pelayanan yang mengutamakan rasa tenang di setiap transaksi.
              </p>
            </div>
          </div>

          {/* DESKTOP HERO CARD */}
          <div className="hidden sm:block relative overflow-hidden rounded-[32px] p-8 border border-slate-200/80 min-h-[360px] flex flex-col justify-center bg-white">
            {/* Background Image (Covering the entire card) */}
            <img 
              src="/hero-bg.png" 
              alt="Han Laptop Store" 
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Darker shadow overlay that fades out on the right */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/35 to-transparent"></div>
            
            <div className="relative z-10 max-w-2xl space-y-4 text-left">
              {/* Tag (Light glassmorphism style) */}
              <div className="inline-flex items-center bg-white/10 border border-white/20 text-white text-sm font-semibold px-3.5 py-1 rounded-md shadow-xs backdrop-blur-xs">
                Satu Tempat untuk Semua Kebutuhan Laptop.
              </div>
              
              {/* Heading (White, very bold) */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-[1.15]">
                Laptop Berkualitas, Transaksi Lebih Tenang.
              </h1>
              
              {/* Description (Light gray, bold, highly readable over dark shadow) */}
              <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-bold max-w-xl">
                Nikmati pengalaman membeli, menjual, servis, dan upgrade laptop dengan proses yang mudah, penawaran harga terbaik, serta pelayanan yang mengutamakan rasa tenang di setiap transaksi.
              </p>
            </div>
          </div>

          {/* 4 PILAR NAVIGATION */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center lg:text-left">Pilih Layanan Utama Kami</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              {/* Card Beli */}
              <Link to={`/catalog/${selectedBranch}`} className="relative h-40 sm:h-52 rounded-[28px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-end p-4 sm:p-5 cursor-pointer group border border-slate-200/50">
                {/* Background Image */}
                <img 
                  src="/beli-pilar.jpg" 
                  alt="Beli Laptop" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 group-hover:from-slate-950/95 transition-all duration-300"></div>
                
                {/* Icon Container (Top Left) */}
                <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md text-white p-2 rounded-xl group-hover:bg-blue-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-white/10 shadow-sm">
                  <Search className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </div>
                
                {/* Arrow (Top Right) */}
                <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md text-white/80 p-1.5 rounded-full group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 border border-white/5 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                {/* Text Content */}
                <div className="relative z-20 text-left">
                  <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-0.5 group-hover:text-blue-200 transition-colors">Beli Laptop</h3>
                  <p className="text-[10px] text-slate-200/80 leading-normal font-medium">Garansi 100% aman & terpercaya.</p>
                </div>
              </Link>
              
              {/* Card Jual */}
              <div 
               onClick={() => {
                 setActiveSection("jual")
                 setJualSubmitted(false)
                 setJualResult(null)
               }}
               className="relative h-40 sm:h-52 rounded-[28px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-end p-4 sm:p-5 cursor-pointer group border border-slate-200/50"
              >
                {/* Background Image */}
                <img 
                  src="/jual-pilar.jpg" 
                  alt="Jual Laptop" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 group-hover:from-slate-950/95 transition-all duration-300"></div>
                
                {/* Icon Container */}
                <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md text-white p-2 rounded-xl group-hover:bg-emerald-600 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-white/10 shadow-sm">
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </div>
                
                {/* Arrow */}
                <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md text-white/80 p-1.5 rounded-full group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 border border-white/5 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                {/* Text Content */}
                <div className="relative z-20 text-left">
                  <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-0.5 group-hover:text-emerald-200 transition-colors">Jual Laptop</h3>
                  <p className="text-[10px] text-slate-200/80 leading-normal font-medium">Taksir instan via AI & dapatkan harga terbaik.</p>
                </div>
              </div>

              {/* Card Tukar */}
              <div 
               onClick={() => setActiveSection("tukar")} 
               className="relative h-40 sm:h-52 rounded-[28px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-end p-4 sm:p-5 cursor-pointer group border border-slate-200/50"
              >
                {/* Background Image */}
                <img 
                  src="/tukar-pilar.jpg" 
                  alt="Tukar Tambah" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 group-hover:from-slate-950/95 transition-all duration-300"></div>
                
                {/* Icon Container */}
                <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md text-white p-2 rounded-xl group-hover:bg-amber-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 border border-white/10 shadow-sm">
                  <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </div>
                
                {/* Arrow */}
                <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md text-white/80 p-1.5 rounded-full group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 border border-white/5 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                {/* Text Content */}
                <div className="relative z-20 text-left">
                  <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-0.5 group-hover:text-amber-200 transition-colors">Tukar Tambah</h3>
                  <p className="text-[10px] text-slate-200/80 leading-normal font-medium">Upgrade laptop lama jadi baru dengan hemat.</p>
                </div>
              </div>

              {/* Card Servis */}
              <div 
               onClick={() => {
                 setActiveSection("servis")
                 setServisSubmitted(false)
                 setServisDiagnosisResult(null)
               }}
               className="relative h-40 sm:h-52 rounded-[28px] overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-end p-4 sm:p-5 cursor-pointer group border border-slate-200/50"
              >
                {/* Background Image */}
                <img 
                  src="/servis-pilar.jpg" 
                  alt="Servis Laptop" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {/* Dark Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/20 group-hover:from-slate-950/95 transition-all duration-300"></div>
                
                {/* Icon Container */}
                <div className="absolute top-4 left-4 z-20 bg-white/20 backdrop-blur-md text-white p-2 rounded-xl group-hover:bg-purple-600 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 border border-white/10 shadow-sm">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </div>
                
                {/* Arrow */}
                <div className="absolute top-4 right-4 z-20 bg-white/10 backdrop-blur-md text-white/80 p-1.5 rounded-full group-hover:bg-white group-hover:text-slate-900 transition-all duration-300 border border-white/5 shadow-xs">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>

                {/* Text Content */}
                <div className="relative z-20 text-left">
                  <h3 className="text-white font-extrabold text-sm sm:text-base tracking-tight mb-0.5 group-hover:text-purple-200 transition-colors">Servis Laptop</h3>
                  <p className="text-[10px] text-slate-200/80 leading-normal font-medium">Booking perbaikan & lacak status real-time.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4 PILARS VALUE PROPOSITIONS SECTION */}
          <div className="space-y-2.5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 text-center lg:text-left">Mengapa Memilih Han Laptop?</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Pilar 1 */}
              <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xs border border-white/30 shadow-none hover:from-white/90 hover:to-white/40 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/30 flex-shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-slate-900 font-extrabold text-[12px] sm:text-xs md:text-sm leading-snug">
                    Beli Laptop Second Tanpa Rasa Khawatir
                  </h4>
                </div>
                <p className="text-slate-700 text-[11px] sm:text-xs leading-relaxed font-semibold text-justify">
                  Setiap laptop telah melalui pengecekan, pengujian, dan perawatan sebelum dijual. Pilih laptop yang sesuai kebutuhan dengan garansi (resmi atau toko) untuk memberikan rasa tenang saat membeli.
                </p>
              </div>
              
              {/* Pilar 2 */}
              <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xs border border-white/30 shadow-none hover:from-white/90 hover:to-white/40 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/30 flex-shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-slate-900 font-extrabold text-[12px] sm:text-xs md:text-sm leading-snug">
                    Jual Laptop dengan Harga Terbaik
                  </h4>
                </div>
                <p className="text-slate-700 text-[11px] sm:text-xs leading-relaxed font-semibold text-justify">
                  Tidak perlu bingung menentukan harga atau repot mencari pembeli. Kami membantu memberikan penawaran yang kompetitif sesuai kondisi laptop dengan proses yang cepat and transparan.
                </p>
              </div>

              {/* Pilar 3 */}
              <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xs border border-white/30 shadow-none hover:from-white/90 hover:to-white/40 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/30 flex-shrink-0">
                    <Wrench className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-slate-900 font-extrabold text-[12px] sm:text-xs md:text-sm leading-snug">
                    Servis dengan Proses yang Jelas
                  </h4>
                </div>
                <p className="text-slate-700 text-[11px] sm:text-xs leading-relaxed font-semibold text-justify">
                  Laptop bermasalah? Teknisi kami akan memeriksa, menjelaskan kerusakan, dan memberikan estimasi biaya serta waktu pengerjaan sebelum proses dimulai.
                </p>
              </div>

              {/* Pilar 4 */}
              <div className="flex flex-col gap-2 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-white/80 to-white/30 backdrop-blur-xs border border-white/30 shadow-none hover:from-white/90 hover:to-white/40 transition-all duration-300">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-100/90 text-slate-700 border border-slate-200/30 flex-shrink-0">
                    <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <h4 className="text-slate-900 font-extrabold text-[12px] sm:text-xs md:text-sm leading-snug">
                    Upgrade Tanpa Ribet
                  </h4>
                </div>
                <p className="text-slate-700 text-[11px] sm:text-xs leading-relaxed font-semibold text-justify">
                  Ingin ganti laptop? Tukar tambah di Han Laptop membantu Anda menghemat waktu dan tenaga tanpa harus repot mencari pembeli sendiri.
                </p>
              </div>
            </div>
          </div>

          {/* KATALOG PREVIEW & QUICK TAGS */}
          <section id="katalog-preview" className="mt-10 sm:mt-12 space-y-5 sm:space-y-6">
            <div className="text-center space-y-2.5 max-w-3xl mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight" >
                Pilihan Terbaik Minggu Ini
              </h2>
              <div className="relative max-w-xl mx-auto">
                <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Cari spesifik, e.g. MacBook M1, RTX 3060..."
                  className="w-full h-12 pl-12 pr-4 bg-white border border-slate-250 shadow-sm rounded-full text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                />
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Tren Pencarian:</span>
                {["ThinkPad X1", "MacBook M1", "Gaming Budget", "Desain Grafis"].map(tag => (
                  <button key={tag} className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold rounded-full transition-colors cursor-pointer">
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex overflow-x-auto snap-x snap-mandatory pb-8 -mx-4 px-4 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 sm:overflow-visible" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style>{`.flex::-webkit-scrollbar { display: none; }`}</style>
              {/* Dummy Card 1 */}
              <Card className="min-w-[85vw] sm:min-w-0 shrink-0 snap-center bg-white border border-slate-200 overflow-hidden group hover:border-slate-400 hover:shadow-md transition-all">
                <div className="aspect-[4/3] bg-slate-50 relative">
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Grade A+
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Laptop className="w-12 h-12 stroke-[1.5]" />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">MacBook Air M1 (2020)</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Apple M1 • 8GB RAM • 256GB SSD</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Rp 10.500.000</span>
                    <Button size="sm" className="h-7 text-[10px] px-3 bg-slate-900 hover:bg-slate-800 rounded-md">Lihat</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dummy Card 2 */}
              <Card className="min-w-[85vw] sm:min-w-0 shrink-0 snap-center bg-white border border-slate-200 overflow-hidden group hover:border-slate-400 hover:shadow-md transition-all">
                <div className="aspect-[4/3] bg-slate-50 relative">
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Ready Stock
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Laptop className="w-12 h-12 stroke-[1.5]" />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">Lenovo ThinkPad X1 Carbon</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Core i7 Gen 10 • 16GB RAM • 512GB SSD</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Rp 8.200.000</span>
                    <Button size="sm" className="h-7 text-[10px] px-3 bg-slate-900 hover:bg-slate-800 rounded-md">Lihat</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dummy Card 3 */}
              <Card className="min-w-[85vw] sm:min-w-0 shrink-0 snap-center bg-white border border-slate-200 overflow-hidden group hover:border-slate-400 hover:shadow-md transition-all">
                <div className="aspect-[4/3] bg-slate-50 relative">
                  <div className="absolute top-2 right-2 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Like New
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Laptop className="w-12 h-12 stroke-[1.5]" />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">ROG Zephyrus G14</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Ryzen 9 • RTX 3060 • 16GB RAM</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Rp 16.500.000</span>
                    <Button size="sm" className="h-7 text-[10px] px-3 bg-slate-900 hover:bg-slate-800 rounded-md">Lihat</Button>
                  </div>
                </CardContent>
              </Card>

              {/* Dummy Card 4 */}
              <Card className="min-w-[85vw] sm:min-w-0 shrink-0 snap-center bg-white border border-slate-200 overflow-hidden group hover:border-slate-400 hover:shadow-md transition-all">
                <div className="aspect-[4/3] bg-slate-50 relative">
                  <div className="absolute top-2 right-2 bg-blue-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Best Value
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-slate-300">
                    <Laptop className="w-12 h-12 stroke-[1.5]" />
                  </div>
                </div>
                <CardContent className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 leading-snug group-hover:text-slate-700 transition-colors">ASUS VivoBook 14</h3>
                    <p className="text-[10px] text-slate-500 mt-1">Core i5 Gen 11 • 8GB RAM • 512GB SSD</p>
                  </div>
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-sm font-black text-slate-900">Rp 6.800.000</span>
                    <Button size="sm" className="h-7 text-[10px] px-3 bg-slate-900 hover:bg-slate-800 rounded-md">Lihat</Button>
                  </div>
                </CardContent>
              </Card>

            </div>
            
            <div className="text-center mt-4">
              <Link to={`/catalog/${selectedBranch}`}>
                <Button variant="outline" className="border-slate-300 text-slate-700 hover:bg-slate-50 rounded-full font-bold px-8 cursor-pointer shadow-xs">
                  Lihat Semua Koleksi Katalog
                </Button>
              </Link>
            </div>
          </section>

          {/* HIGH-TRUST BLOCK: STATS & KEUNGGULAN */}
          <section className="mt-10 sm:mt-12 bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Kolom Kiri: Statistik (Dark) */}
              <div className="p-8 md:p-12 flex flex-col justify-center space-y-6 sm:space-y-8">
                <div>
                  <h2 className="text-2xl md:text-3xl font-bold tracking-tighter" >
                    Dipercaya Ratusan Pelanggan.
                  </h2>
                  <p className="mt-4 text-slate-400 text-sm md:text-base leading-relaxed">
                    Kami tidak sekadar menjual laptop, kami membangun ekosistem komputasi yang aman, transparan, dan bergaransi penuh untuk Anda.
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <div className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-1">1,500+</div>
                    <div className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Laptop Terjual</div>
                  </div>
                  <div>
                    <div className="text-3xl md:text-4xl font-black tracking-tighter text-white mb-1">4.9★</div>
                    <div className="text-[10px] uppercase tracking-widest text-amber-400 font-bold">Rating Pelanggan</div>
                  </div>
                </div>
              </div>

              {/* Kolom Kanan: 3 Keuntungan Spesifik (Light) */}
              <div className="bg-white text-slate-900 p-8 md:p-12 flex flex-col justify-center">
                <div className="space-y-5 sm:space-y-6">
                  
                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-full shrink-0">
                      <ShieldCheck className="w-6 h-6 text-slate-900 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Cek Fisik 40+ Poin Ketat</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Setiap laptop wajib lolos standarisasi ketat Han Laptop sebelum dijual. <a href="#" className="text-slate-900 font-semibold hover:underline">Lihat daftar inspeksi</a>.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-full shrink-0">
                      <Award className="w-6 h-6 text-slate-900 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Garansi Transparan 30 Hari</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Nikmati jaminan garansi perangkat keras (hardware) dan lunak (software) penuh tanpa syarat berbelit.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-slate-100 p-3 rounded-full shrink-0">
                      <Activity className="w-6 h-6 text-slate-900 stroke-[1.5]" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Lacak Servis Real-Time</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">Pantau status perbaikan laptop Anda kapan saja secara langsung melalui sistem pelacakan cerdas kami.</p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </section>

          {/* VISUAL BUKTI: BEFORE-AFTER GALLERY */}
          <section className="mt-12 sm:mt-16 space-y-6 sm:space-y-8">
            <div className="text-center space-y-2">
              <span className="bg-slate-100 text-slate-800 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                Hasil Nyata Servis Kami
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Galeri Hasil Kerja Teknisi Han Laptop
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm font-normal">
                Lihat bukti nyata pengerjaan perbaikan berbagai tingkat kerusakan oleh teknisi profesional kami. Klik foto untuk melihat lebih dekat.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
              {[
                {
                  title: "Servis Layar LCD Pecah",
                  img: "/before-after-lcd.jpg",
                  badge: "LCD Replacement",
                  desc: "Layar pecah bergaris parah di Asus Zenbook diganti baru dengan layar berkualitas original, warna cerah presisi."
                },
                {
                  title: "Servis Engsel Patah (Asus)",
                  img: "/before-after-engsel-1.jpg",
                  badge: "Hinge Repair",
                  desc: "Konstruksi dudukan engsel casing yang hancur disolder dan diperbaiki kembali agar kokoh dibuka-tutup."
                },
                {
                  title: "Perawatan & Cleaning Laptop",
                  img: "/before-after-cleaning.jpg",
                  badge: "Cleaning & Repasta",
                  desc: "Suhu panas dan lemot diatasi dengan cleaning fan total dari debu serta penggantian thermal paste premium baru."
                }
              ].map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col group"
                >
                  <div 
                    className="relative overflow-hidden cursor-zoom-in bg-slate-50 border-b border-slate-100" 
                    onClick={() => setLightboxImage(item.img)}
                  >
                    <img 
                      src={item.img} 
                      alt={item.title} 
                      className="w-full h-auto object-contain group-hover:scale-101 transition-transform duration-500"
                    />
                  </div>
                  <div className="p-3 flex-1 flex flex-col justify-between space-y-2.5">
                    <div className="space-y-1.5">
                      <span className="inline-block text-[8px] font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md uppercase tracking-wider">
                        {item.badge}
                      </span>
                      <h3 className="font-bold text-slate-900 text-xs mt-0.5">{item.title}</h3>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveHeroTab("servis");
                        const target = document.getElementById("servis-form-section") || document.querySelector("form[onSubmit*=handleServisDiagnosis]");
                        if (target) {
                          target.scrollIntoView({ behavior: "smooth" });
                        } else {
                          window.scrollTo({ top: 500, behavior: "smooth" });
                        }
                      }}
                      className="w-full h-8 border border-slate-200 hover:border-slate-800 text-slate-800 hover:text-white hover:bg-slate-900 transition-colors rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Konsultasi Servis Ini →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* TESTIMONI EDITORIAL */}
          <section className="mt-10 sm:mt-12 space-y-5 sm:space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight" >
                Kata Mereka Tentang Kami.
              </h2>
              <p className="text-slate-600 max-w-xl mx-auto text-sm font-normal">
                Ulasan nyata dari pelanggan setia yang telah membuktikan kualitas layanan dan ekosistem Han Laptop.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              {[
                {
                  name: "Budi Santoso", role: "Desainer Grafis",
                  review: "Beli MacBook M1 bekas di sini, kondisinya beneran Grade A+ seperti baru. Harganya masuk akal banget. Proses COD juga cepat dan transparan.",
                  stars: 5
                },
                {
                  name: "Andi Saputra", role: "Mahasiswa IT",
                  review: "Sempat panik karena laptop mati total saat mau skripsi. Ketemu Han Laptop dari IG, langsung cek pakai Taksir AI Servis, harganya sesuai. Sekarang normal lagi!",
                  stars: 5
                },
                {
                  name: "Siti Rahma", role: "Karyawan Swasta",
                  review: "Jual laptop ThinkPad lama saya di sini pakai fitur AI-nya. Admin fast respon dan beneran berani ambil harga tinggi sesuai kondisi. Rekomended buat tukar tambah.",
                  stars: 5
                }
              ].map((testimonial, idx) => (
                <div key={idx} className="bg-white border border-slate-200 p-8 rounded-2xl flex flex-col space-y-4 hover:shadow-lg hover:border-slate-300 transition-all">
                  <div className="flex text-amber-400">
                    {[...Array(testimonial.stars)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed font-normal flex-1">
                    "{testimonial.review}"
                  </p>
                  <div className="pt-4 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-900">{testimonial.name}</p>
                    <p className="text-[10px] text-slate-500">{testimonial.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ ACCORDION */}
          <section className="mt-10 sm:mt-12 mb-10 max-w-3xl mx-auto space-y-5 sm:space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight" >
                Pertanyaan yang Sering Diajukan
              </h2>
            </div>

            <div className="space-y-4">
              {[
                {
                  q: "Apakah Han Laptop menerima jual beli laptop mati total?",
                  a: "Ya, kami menerima laptop dalam segala kondisi termasuk mati total. Gunakan fitur Taksir AI Jual kami, lalu pilih kondisi 'Minus Fungsi/Rusak' untuk mengetahui estimasi penawaran kasarnya."
                },
                {
                  q: "Apakah laptop bekas yang dijual di sini memiliki garansi?",
                  a: "Tentu. Seluruh unit laptop bekas yang kami jual telah melalui 40+ poin inspeksi ketat dan dilengkapi garansi toko (hardware & software) yang transparan sesuai nota kesepakatan."
                },
                {
                  q: "Bagaimana cara kerja layanan Tukar Tambah?",
                  a: "Sangat mudah! Bawa laptop lama Anda ke cabang kami atau cek estimasi harganya di form Jual AI. Nilai dari laptop lama Anda akan langsung dipotong dari harga laptop baru yang ingin Anda beli."
                },
                {
                  q: "Apakah bisa klaim garansi servis secara online?",
                  a: "Bisa. Anda bisa menghubungi layanan pelanggan kami via WhatsApp dengan menyertakan Nomor Nota Servis Anda, dan tim kami akan memandu proses klaimnya dengan cepat."
                }
              ].map((faq, idx) => (
                <details key={idx} className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <summary className="flex items-center justify-between p-5 cursor-pointer font-bold text-sm text-slate-900 hover:bg-slate-50 transition-colors">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-45 transition-transform duration-300">
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                    </span>
                  </summary>
                  <div className="p-5 pt-0 text-sm text-slate-600 leading-relaxed bg-white border-t border-slate-100">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </section>

        </main>
      )}

      {/* JUAL LAPTOP SECTION - 3 STEP WIZARD */}
      {activeSection === "jual" && (
        <div className="relative z-10 max-w-3xl mx-auto px-4 py-12">
          <button 
            type="button"
            onClick={() => setActiveSection("hero")}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Beranda
          </button>

          <div className="space-y-2 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Jual Laptop Bekas</h1>
            <p className="text-slate-600 text-sm leading-relaxed font-normal">
              Ikuti 3 langkah mudah untuk mendapatkan taksiran harga jual terbaik dari Han Laptop.
            </p>
          </div>

          {/* STEPPER BAR */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {[
                { step: 1, label: "Identifikasi", icon: Cpu },
                { step: 2, label: "Kondisi & Kelengkapan", icon: ShieldCheck },
                { step: 3, label: "Hasil Taksiran", icon: TrendingUp }
              ].map((s, idx) => (
                <div key={s.step} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 border-2 ${
                      jualStep > s.step 
                        ? "bg-emerald-600 border-emerald-600 text-white shadow-md" 
                        : jualStep === s.step 
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-110" 
                          : "bg-white border-slate-250 text-slate-400"
                    }`}>
                      {jualStep > s.step ? (
                        <CheckCircle2 className="w-5 h-5" />
                      ) : (
                        <s.icon className="w-4 h-4" strokeWidth={2} />
                      )}
                    </div>
                    <span className={`mt-2 text-[10px] sm:text-xs font-bold transition-colors duration-300 text-center leading-tight ${
                      jualStep >= s.step ? "text-slate-800" : "text-slate-400"
                    }`}>{s.label}</span>
                  </div>
                  {idx < 2 && (
                    <div className="flex-1 mx-2 sm:mx-3 mb-5">
                      <div className="h-1 rounded-full bg-slate-200 overflow-hidden">
                        <div className={`h-full rounded-full transition-all duration-500 ease-out ${
                          jualStep > s.step ? "w-full bg-emerald-500" : "w-0 bg-slate-300"
                        }`} />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ============================================================ */}
          {/* STEP 1: IDENTIFIKASI LAPTOP */}
          {/* ============================================================ */}
          {jualStep === 1 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs animate-fade-in relative z-20">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <Cpu className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Langkah 1: Identifikasi Laptop</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Pilih merek, ketik model, dan sesuaikan spesifikasinya (bisa dibantu AI).</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Brand & Model */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5 sm:col-span-1">
                    <label className="text-xs font-bold text-slate-700">Merek Laptop</label>
                    <ModernSelect 
                      value={jualBrand}
                      onChange={setJualBrand}
                      options={[
                        {value: "Asus", label: "Asus"},
                        {value: "Lenovo", label: "Lenovo"},
                        {value: "HP", label: "HP"},
                        {value: "Acer", label: "Acer"},
                        {value: "Dell", label: "Dell"},
                        {value: "MacBook", label: "MacBook"},
                        {value: "MSI", label: "MSI"},
                        {value: "Gigabyte", label: "Gigabyte"},
                        {value: "Lainnya", label: "Merek Lain"}
                      ]}
                      className="w-full h-11 bg-white border-slate-250 rounded-lg text-xs text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-slate-700">Tipe / Model Laptop</label>
                    <div className="relative flex items-center">
                      <input 
                        type="text"
                        required
                        list="laptop-model-suggestions"
                        placeholder="Contoh: ROG Zephyrus G14"
                        value={jualModel}
                        onChange={(e) => setJualModel(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-250 rounded-lg pl-3 pr-[110px] text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                      />
                      <datalist id="laptop-model-suggestions">
                        {getBrandSuggestions(jualBrand).map(s => <option key={s} value={s} />)}
                      </datalist>
                      <button
                        type="button"
                        onClick={handleJualAutocomplete}
                        disabled={jualAiLoading || !jualModel}
                        className="absolute right-0 top-0 bottom-0 h-11 bg-slate-900 hover:bg-slate-800 text-white px-4 rounded-r-lg text-[10px] sm:text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-md"
                      >
                        <Sparkles className="w-3.5 h-3.5" strokeWidth={1.5} />
                        {jualAiLoading ? "Mencari..." : "Cari Specs AI"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Specs Section - ALWAYS VISIBLE */}
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                      Spesifikasi Detail Laptop
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">Silakan isi manual / sesuaikan</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Prosesor (Model & Seri)</label>
                    <Autocomplete 
                      options={laptopProcessors}
                      value={jualProcessor}
                      onChange={setJualProcessor}
                      placeholder="Ketik/Pilih Processor (contoh: Intel Core i5-11400H)"
                      inputClassName="w-full h-11 bg-slate-50 border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Kartu Grafis (VGA)</label>
                    <Autocomplete 
                      options={laptopVGAs}
                      value={jualVga}
                      onChange={setJualVga}
                      placeholder="Ketik/Pilih VGA (contoh: NVIDIA GeForce RTX 3050 Ti)"
                      inputClassName="w-full h-11 bg-slate-50 border-slate-200 rounded-lg text-xs text-slate-800"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Kapasitas RAM</label>
                      <Autocomplete 
                        options={laptopRAMs}
                        value={jualRam}
                        onChange={setJualRam}
                        placeholder="Pilih/Ketik RAM (contoh: 8GB DDR4)"
                        inputClassName="w-full h-11 bg-slate-50 border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Penyimpanan</label>
                      <Autocomplete 
                        options={laptopStorages}
                        value={jualStorage}
                        onChange={setJualStorage}
                        placeholder="Pilih/Ketik Penyimpanan (contoh: 512GB SSD)"
                        inputClassName="w-full h-11 bg-slate-50 border-slate-200 rounded-lg text-xs text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Button */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (!jualModel.trim()) {
                        toast.error("Silakan ketik tipe/model laptop terlebih dahulu.")
                        return
                      }
                      if (!jualSpecDetectedByAi) {
                        handleJualAutocomplete()
                        return
                      }
                      setJualStep(2)
                      window.scrollTo({ top: 0, behavior: "smooth" })
                    }}
                    disabled={jualAiLoading}
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:text-slate-400 text-white font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs text-sm disabled:cursor-not-allowed"
                  >
                    {jualAiLoading ? (
                      <>Menganalisis... <Sparkles className="h-4 w-4 animate-spin" /></>
                    ) : !jualSpecDetectedByAi ? (
                      <>Cari Spesifikasi via AI <Sparkles className="h-4 w-4" /></>
                    ) : (
                      <>Lanjut ke Pengecekan Kondisi <ChevronRight className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 2: PENGECEKAN KONDISI & KELENGKAPAN */}
          {/* ============================================================ */}
          {jualStep === 2 && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs animate-fade-in relative z-20">
              <div className="bg-slate-50 border-b border-slate-200 px-5 py-4 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Langkah 2: Pengecekan Kondisi & Kelengkapan</h2>
                    <p className="text-[11px] text-slate-500 font-medium">Pilih kondisi fisik, cek fungsi, dan informasi kelengkapan laptop Anda.</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-6">
                {/* SUB-SECTION A: Kondisi Fisik */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    Kondisi Fisik Casing
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { value: "Mulus", emoji: "✨", desc: "Tidak ada cacat" },
                      { value: "Baret Ringan", emoji: "〰️", desc: "Baret halus di body" },
                      { value: "Penyok/Dent", emoji: "📦", desc: "Ada penyok di casing" },
                      { value: "Cat Mengelupas", emoji: "🎨", desc: "Cat luntur/mengelupas" },
                      { value: "Patah/Retak", emoji: "💔", desc: "Ada retakan/patah" }
                    ].map((cond) => (
                      <button
                        key={cond.value}
                        type="button"
                        onClick={() => setJualPhysicalCondition(cond.value)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          jualPhysicalCondition === cond.value 
                            ? "bg-slate-900 border-slate-900 text-white shadow-md" 
                            : "bg-white border-slate-200 text-slate-700 hover:border-slate-350 hover:bg-slate-50"
                        }`}
                      >
                        <div className="text-base mb-1">{cond.emoji}</div>
                        <div className="text-xs font-bold">{cond.value}</div>
                        <div className={`text-[10px] font-medium mt-0.5 ${
                          jualPhysicalCondition === cond.value ? "text-slate-300" : "text-slate-400"
                        }`}>{cond.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* SUB-SECTION B: Cek Fungsi */}
                <div className="space-y-3 border-t border-slate-150 pt-5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" strokeWidth={2} />
                    Cek Fungsi
                  </label>

                  {/* Toggle: Ada Minus Fungsi? */}
                  <div 
                    onClick={() => setJualHasFunctionIssue(!jualHasFunctionIssue)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      jualHasFunctionIssue 
                        ? "bg-amber-50 border-amber-300 shadow-xs" 
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">Ada minus fungsi / kerusakan?</div>
                      <div className="text-[10px] text-slate-500 font-medium">Layar bermasalah, baterai drop, speaker sember, dll.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center ${
                      jualHasFunctionIssue ? "bg-amber-500 justify-end" : "bg-slate-300 justify-start"
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-1 transition-all" />
                    </div>
                  </div>

                  {/* Checklist Defects */}
                  {jualHasFunctionIssue && (
                    <div className="space-y-3 animate-fade-in pl-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {laptopDefects.map((defect) => {
                          const isChecked = jualSelectedDefects.includes(defect);
                          return (
                            <label 
                              key={defect} 
                              className={`flex items-start gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                                isChecked 
                                  ? "bg-amber-50/50 border-amber-300 text-slate-900 shadow-xs" 
                                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                              }`}
                            >
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleDefectToggle(defect)}
                                className="mt-0.5 h-3.5 w-3.5 rounded border-slate-350 text-slate-900 focus:ring-slate-900 cursor-pointer"
                              />
                              <span>{defect}</span>
                            </label>
                          );
                        })}
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Minus Lainnya (Opsional)</label>
                        <input 
                          type="text"
                          placeholder="Misal: port audio mati, keyboard berdebu parah"
                          value={jualCustomDefect}
                          onChange={(e) => setJualCustomDefect(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                    </div>
                  )}

                  {/* Toggle: Pernah Di-Service? */}
                  <div 
                    onClick={() => setJualHasServiceHistory(!jualHasServiceHistory)}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      jualHasServiceHistory 
                        ? "bg-blue-50 border-blue-300 shadow-xs" 
                        : "bg-white border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800">Pernah di-service / ganti part?</div>
                      <div className="text-[10px] text-slate-500 font-medium">Ganti LCD, baterai, keyboard, motherboard, dll.</div>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-all duration-300 flex items-center ${
                      jualHasServiceHistory ? "bg-blue-500 justify-end" : "bg-slate-300 justify-start"
                    }`}>
                      <div className="w-4 h-4 bg-white rounded-full shadow-sm mx-1 transition-all" />
                    </div>
                  </div>

                  {jualHasServiceHistory && (
                    <div className="space-y-1.5 animate-fade-in pl-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Detail Service / Part yang Diganti</label>
                      <input 
                        type="text"
                        placeholder="Misal: Ganti baterai baru, ganti LCD 2024"
                        value={jualServiceDetails}
                        onChange={(e) => setJualServiceDetails(e.target.value)}
                        className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                      />
                    </div>
                  )}
                </div>

                {/* Garansi, Kelengkapan, Tahun Pembelian */}
                <div className="space-y-4 border-t border-slate-150 pt-5">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                    Garansi, Kelengkapan & Tahun Pembelian
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Tahun Pembelian</label>
                      <select 
                        value={jualPurchaseYear}
                        onChange={(e) => setJualPurchaseYear(e.target.value)}
                        style={selectStyle}
                        className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors appearance-none cursor-pointer"
                      >
                        {Array.from({ length: new Date().getFullYear() - 2018 + 1 }, (_, i) => {
                          const yr = (new Date().getFullYear() - i).toString();
                          return <option key={yr} value={yr}>{yr}</option>;
                        })}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700">Garansi Resmi Aktif</label>
                      <select 
                        value={jualHasWarranty}
                        onChange={(e) => {
                          const val = e.target.value;
                          setJualHasWarranty(val);
                          if (val === "no") setJualWarrantyDuration("");
                        }}
                        style={selectStyle}
                        className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors appearance-none cursor-pointer"
                      >
                        <option value="no">Habis / Tidak Ada</option>
                        <option value="yes">Masih Aktif</option>
                      </select>
                      {jualHasWarranty === "yes" && (
                        <div className="mt-2 space-y-1 animate-fade-in">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Sisa Masa Garansi (Bulan)</label>
                          <input 
                            type="number" 
                            min="1"
                            max="60"
                            placeholder="Misal: 12" 
                            value={jualWarrantyDuration}
                            onChange={(e) => setJualWarrantyDuration(e.target.value)}
                            className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Kelengkapan Perangkat</label>
                    <ModernSelect 
                      value={jualCompleteness}
                      onChange={setJualCompleteness}
                      options={[
                        {value: "Lengkap", label: "Lengkap (Dusbox, Charger, Unit)"},
                        {value: "Hanya Charger", label: "Batangan + Charger"},
                        {value: "Hanya Batangan", label: "Hanya Unit (Batangan)"}
                      ]}
                      className="w-full h-11 bg-white border-slate-250 rounded-lg text-xs text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                    />
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="pt-2 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => { setJualStep(1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    className="h-12 px-6 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all text-sm"
                  >
                    <ArrowLeft className="h-4 w-4" /> Kembali
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      calculateJualTaksiran();
                      setJualStep(3);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      toast.success("Taksiran harga berhasil dihitung! 💰");
                    }}
                    className="h-12 px-8 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs text-sm"
                  >
                    Lihat Hasil Taksiran <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* STEP 3: HASIL TAKSIRAN */}
          {/* ============================================================ */}
          {jualStep === 3 && (
            <div className="space-y-5 animate-fade-in">
              {/* Result Card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
                <div className="bg-slate-50 border-b border-slate-200 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                      <TrendingUp className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-slate-900">Langkah 3: Hasil Estimasi Taksiran</h2>
                      <p className="text-[11px] text-slate-500 font-medium">Range harga penawaran berdasarkan spesifikasi & kondisi laptop Anda.</p>
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-5">
                  {/* Price Range Display */}
                  {jualResult && (
                    <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200 rounded-xl text-center space-y-3">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Estimasi Penawaran Han Laptop</div>
                      <div className="text-2xl sm:text-3xl font-bold text-slate-900">
                        {formatCurrency(jualResult.offerValueRangeMin)} <span className="text-slate-400 font-normal text-lg">–</span> {formatCurrency(jualResult.offerValueRangeMax)}
                      </div>
                      <div className="text-[9px] text-slate-500 font-normal leading-relaxed max-w-md mx-auto">
                        *Harga final ditentukan setelah pengecekan fisik langsung. Range di atas merupakan perkiraan berdasarkan data AI dan kondisi yang Anda sampaikan.
                      </div>
                    </div>
                  )}

                  {/* Specs & Condition Summary */}
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ringkasan Data Laptop</div>
                    <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px]">
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Model</span><span className="text-slate-900 font-bold">{jualBrand} {jualModel}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Prosesor</span><span className="text-slate-900 font-bold truncate block">{jualProcessor}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">RAM</span><span className="text-slate-900 font-bold">{jualRam}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Penyimpanan</span><span className="text-slate-900 font-bold truncate block">{jualStorage}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">VGA</span><span className="text-slate-900 font-bold truncate block">{jualVga}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Tahun Beli</span><span className="text-slate-900 font-bold">{jualPurchaseYear}</span></div>
                    </div>
                    <div className="border-t border-slate-200 pt-2.5 grid grid-cols-2 gap-y-2.5 gap-x-4 text-[11px]">
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Kondisi Fisik</span><span className="text-slate-900 font-bold">{jualPhysicalCondition}</span></div>
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Kelengkapan</span><span className="text-slate-900 font-bold">{jualCompleteness}</span></div>
                      {jualHasFunctionIssue && jualConditionDetails && (
                        <div className="col-span-2"><span className="text-slate-400 font-semibold uppercase text-[9px] block">Minus Fungsi</span><span className="text-amber-700 font-bold text-[10px]">{jualConditionDetails}</span></div>
                      )}
                      {jualHasServiceHistory && jualServiceDetails && (
                        <div className="col-span-2"><span className="text-slate-400 font-semibold uppercase text-[9px] block">Riwayat Service</span><span className="text-blue-700 font-bold text-[10px]">{jualServiceDetails}</span></div>
                      )}
                      <div><span className="text-slate-400 font-semibold uppercase text-[9px] block">Garansi</span><span className="text-slate-900 font-bold">{jualHasWarranty === "yes" ? `Aktif (${jualWarrantyDuration || '0'} bln)` : "Habis/Tidak Ada"}</span></div>
                    </div>
                  </div>

                  {/* Important Notice */}
                  <div className="p-3.5 bg-amber-50/50 border border-amber-200/60 rounded-xl text-[10px] text-amber-800 leading-relaxed font-medium space-y-1">
                    <p><strong>⚠️ PENTING:</strong> Harga di atas adalah <strong>estimasi sementara</strong> berdasarkan data yang Anda berikan. Harga final bisa lebih tinggi atau lebih rendah setelah pengecekan fisik langsung di toko.</p>
                    <p>Untuk info lebih lanjut, silakan <a href={getWhatsAppUrlWithText("Halo Han Laptop, saya ingin tanya taksiran harga laptop saya secara langsung.")} target="_blank" rel="noopener noreferrer" className="text-slate-900 hover:underline font-semibold">chat langsung ke WhatsApp</a>.</p>
                  </div>

                  {/* Lead Submission Form */}
                  {!jualSubmitted ? (
                    <form onSubmit={submitJualLead} className="border-t border-slate-200 pt-5 space-y-3">
                      <div className="text-xs font-bold text-slate-800 text-center">Simpan Penawaran & Hubungi Staf</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input 
                          type="text" 
                          required
                          placeholder="Nama Anda"
                          value={jualName}
                          onChange={(e) => setJualName(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                        <input 
                          type="tel" 
                          required
                          placeholder="Nomor WhatsApp (08xxx)"
                          value={jualPhone}
                          onChange={(e) => setJualPhone(e.target.value)}
                          className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        disabled={jualLoading}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {jualLoading ? "Menyimpan..." : "Kirim & Hubungi WhatsApp"}
                      </Button>
                    </form>
                  ) : (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800 space-y-1">
                      <CheckCircle2 className="w-6 h-6 mx-auto text-emerald-600 mb-2" />
                      <p>Taksiran Penawaran Anda Berhasil Disimpan!</p>
                      <p className="font-normal text-emerald-700">Tim CRM kami akan segera menghubungi Anda.</p>
                    </div>
                  )}

                  {/* Navigation */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => { setJualStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className="h-11 px-5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all text-xs"
                    >
                      <ArrowLeft className="h-4 w-4" /> Ubah Kondisi
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSection("tukar")
                        setJualSubmitted(false)
                      }}
                      className="h-11 px-5 bg-white hover:bg-slate-50 border border-slate-250 text-slate-700 font-semibold rounded-xl cursor-pointer flex items-center justify-center gap-2 transition-all text-xs"
                    >
                      <RefreshCw className="h-4 w-4" /> Tukar Tambah?
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* LAB SERVIS SECTION */}
      {activeSection === "servis" && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          <button 
            type="button"
            onClick={() => setActiveSection("hero")}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Beranda
          </button>

          <div className="space-y-4 mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Lab Servis & Diagnosis AI Awal</h1>
            <p className="text-slate-650 text-sm leading-relaxed font-normal">
              Dapatkan diagnosis awal masalah laptop Anda beserta kisaran estimasi biaya perbaikan dan sparepart secara instan sebelum membawanya ke toko kami.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* DIAGNOSIS FORM */}
            <form onSubmit={handleServisDiagnosis} className="lg:col-span-7 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Kerusakan / Keluhan Utama</label>
                <ModernSelect 
                  value={servisIssueCategory}
                  onChange={setServisIssueCategory}
                  options={[
                    {value: "Mati Total", label: "Mati Total / Tidak Bisa Charge"},
                    {value: "Layar Pecah/Garis", label: "Layar LCD Pecah / Bergaris / Berkedip"},
                    {value: "Laptop Lemot", label: "Laptop Lemot / Ingin Upgrade SSD atau RAM"},
                    {value: "Keyboard/Touchpad", label: "Keyboard Rusak / Sebagian Tombol Macet"},
                    {value: "Overheat/Kipas Bising", label: "Laptop Panas (Overheat) & Kipas Berisik"},
                    {value: "Lainnya", label: "Lainnya (Engsel Patah, Kamera Mati, dll.)"}
                  ]}
                  className="w-full h-11 bg-white border-slate-250 rounded-lg text-xs text-slate-800 focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Deskripsikan Gejala Lebih Detail</label>
                <textarea 
                  value={servisDesc}
                  onChange={(e) => setServisDesc(e.target.value)}
                  rows={4}
                  placeholder="Contoh: Laptop mati setelah terkena tumpahan air, atau laptop tiba-tiba layar biru (blue screen) saat dinyalakan..."
                  className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 placeholder-slate-400 resize-none transition-colors"
                />
              </div>

              <Button type="submit" className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-all shadow-xs">
                Analisis Masalah Laptop <Wrench className="ml-2 h-4 w-4 text-white" strokeWidth={1.5} />
              </Button>
            </form>

            {/* DIAGNOSIS OUTPUT */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-550 mb-4">Hasil Analisis Kerusakan</h3>
                
                {servisDiagnosisResult ? (
                  <div className="space-y-6">
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Akurasi Analisis</span>
                        <span className="text-slate-900 font-bold">{servisDiagnosisResult.confidence}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-slate-900 rounded-full" style={{ width: `${servisDiagnosisResult.confidence}%` }}></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Potensi Kerusakan:</div>
                      <p className="text-xs text-slate-700 leading-relaxed p-3 bg-slate-50 border border-slate-200 rounded-lg font-medium">
                        {servisDiagnosisResult.diagnosis}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-150 pt-4">
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimasi Jasa</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(servisDiagnosisResult.estJasa)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estimasi Sparepart</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">
                          {servisDiagnosisResult.estSparepart > 0 ? formatCurrency(servisDiagnosisResult.estSparepart) : "Tergantung Tipe"}
                        </div>
                      </div>
                    </div>

                    {/* BOOKING DETAILS FORM */}
                    {!servisSubmitted ? (
                      <form onSubmit={submitServisBooking} className="border-t border-slate-150 pt-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-800 text-center mb-1">Form Jadwal Booking Servis</div>
                        
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            required
                            placeholder="Merek & Model Laptop (Contoh: Asus Vivobook A412)"
                            value={servisDeviceName}
                            onChange={(e) => setServisDeviceName(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            required
                            placeholder="Nama Anda"
                            value={servisName}
                            onChange={(e) => setServisName(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="tel" 
                            required
                            placeholder="Nomor WhatsApp"
                            value={servisPhone}
                            onChange={(e) => setServisPhone(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            placeholder="Alamat Lengkap (Opsional untuk Penjemputan)"
                            value={servisAddress}
                            onChange={(e) => setServisAddress(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-850 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          disabled={servisLoading}
                          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          {servisLoading ? "Mengirim..." : "Kirim Jadwal Booking Servis"}
                        </Button>
                      </form>
                    ) : (
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-800">
                        ✓ Booking Berhasil Dikirim! Kode Tiket Booking Anda sudah terdaftar di sistem Lab Servis Han Laptop.
                      </div>
                    )}

                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2.5">
                    <Info className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    <p className="text-xs max-w-[200px] leading-relaxed font-normal text-slate-500">Tulis keluhan laptop Anda di samping untuk memulai diagnosis kerusakan.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TUKAR TAMBAH SECTION */}
      {activeSection === "tukar" && (
        <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
          <button 
            type="button"
            onClick={() => setActiveSection("hero")}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Beranda
          </button>

          <div className="space-y-4 mb-8">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Simulator Tukar Tambah</h1>
            <p className="text-slate-650 text-sm leading-relaxed font-normal">
              Taksir nilai laptop lama Anda dan simulasikan selisih sisa biaya yang perlu Anda bayar untuk memiliki laptop baru pilihan Anda dari katalog Han Laptop.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* INPUTS FOR SIMULATOR */}
            <div className="lg:col-span-7 bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Langkah 1: Taksiran Nilai Laptop Lama</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Tipe Laptop Lama</label>
                    <input 
                      type="text" 
                      id="tradeInOldModel"
                      placeholder="Contoh: Asus ROG GL553"
                      className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700">Taksiran Nilai Penawaran (IDR)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 2500000"
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0
                        setJualResult((prev: any) => ({
                          ...prev,
                          offerValueRangeMin: val,
                          offerValueRangeMax: val
                        }))
                      }}
                      className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-500">
                  *Anda bisa mendapatkan taksiran nilai ini di tab **Jual Laptop** terlebih dahulu.
                </p>
              </div>

              <div className="space-y-2 border-t border-slate-150 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-700">Langkah 2: Pilih Target Laptop Baru</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative">
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-bold text-slate-700">Merek / Model Pilihan</label>
                    <input 
                      type="text" 
                      id="tradeInNewModel"
                      placeholder="Cari dari katalog unit..."
                      value={newLaptopSearch}
                      onChange={(e) => {
                        setNewLaptopSearch(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                    />
                    
                    {showDropdown && (storeInfo?.items || []).length > 0 && (
                      <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-lg max-h-48 overflow-y-auto z-50 shadow-md">
                        {((storeInfo?.items || []).filter((item: any) =>
                          item.itemName.toLowerCase().includes(newLaptopSearch.toLowerCase())
                        )).length === 0 ? (
                          <div className="p-3 text-xs text-slate-500 text-center">Unit tidak ditemukan</div>
                        ) : (
                          (storeInfo?.items || []).filter((item: any) =>
                            item.itemName.toLowerCase().includes(newLaptopSearch.toLowerCase())
                          ).map((item: any) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => selectTargetLaptop(item.itemName, item.sellingPrice)}
                              className="w-full p-3 text-left text-xs border-b border-slate-100 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-2 group cursor-pointer"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-slate-800 group-hover:text-slate-950 transition-colors truncate">{item.itemName}</div>
                                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.specs}</div>
                              </div>
                              <span className="font-bold text-slate-900 shrink-0 mt-1 sm:mt-0">
                                Rp {item.sellingPrice.toLocaleString("id-ID")}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700">Harga Laptop Baru (IDR)</label>
                    <input 
                      type="number" 
                      placeholder="Contoh: 7500000"
                      id="hargaBaruInput"
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setJualResult((prev: any) => ({
                          ...prev,
                          tradeInNew: val,
                          tradeInDiff: prev?.offerValueRangeMin ? (val - prev.offerValueRangeMin) : undefined
                        }));
                      }}
                      className="w-full h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                    />
                  </div>
                </div>
                {showDropdown && (
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowDropdown(false)}
                  />
                )}
              </div>

              <Button 
                onClick={() => {
                  const hargaBaru = parseInt((document.getElementById("hargaBaruInput") as HTMLInputElement)?.value) || 0
                  const modelBaru = (document.getElementById("tradeInNewModel") as HTMLInputElement)?.value || "Laptop Baru"
                  const taksiranLama = jualResult?.offerValueRangeMin || 0
                  if (!hargaBaru || !taksiranLama) {
                    toast.error("Silakan isi taksiran nilai laptop lama dan harga laptop baru terlebih dahulu.")
                    return
                  }
                  if (taksiranLama >= hargaBaru) {
                    toast.error("Taksiran laptop lama tidak boleh lebih besar dari harga laptop baru.")
                    return
                  }
                  setJualResult((prev: any) => ({
                    ...prev,
                    tradeInNew: hargaBaru,
                    tradeInNewName: modelBaru,
                    tradeInDiff: hargaBaru - taksiranLama
                  }))
                  toast.success("Kalkulasi berhasil disimulasikan!")
                }}
                className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
              >
                Hitung Selisih Biaya Tukar Tambah
              </Button>
            </div>

            {/* SIMULATOR RESULT */}
            <div className="lg:col-span-5">
              <div className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs space-y-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kalkulator Selisih</h3>
                
                {jualResult?.tradeInNew ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-normal">Harga Laptop Baru:</span>
                        <span className="font-semibold text-slate-900">{formatCurrency(jualResult.tradeInNew)}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-normal">Nilai Tukar Laptop Lama:</span>
                        <span className="font-semibold text-red-600">-{formatCurrency(jualResult.offerValueRangeMin)}</span>
                      </div>
                      <div className="h-[1px] bg-slate-150 w-full" />
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-slate-900 font-bold">Sisa Biaya Dibayar:</span>
                        <span className="text-lg font-bold text-slate-900">{formatCurrency(jualResult.tradeInDiff)}</span>
                      </div>
                    </div>

                    {/* BOOKING TRADE-IN FORM */}
                    {!jualSubmitted ? (
                      <form onSubmit={submitTukarLead} className="border-t border-slate-150 pt-4 space-y-3">
                        <div className="text-xs font-semibold text-slate-800 text-center mb-1">Booking Tiket Tukar Tambah</div>
                        
                        <div className="space-y-1.5">
                          <input 
                            type="text" 
                            required
                            placeholder="Nama Lengkap Anda"
                            value={jualName}
                            onChange={(e) => setJualName(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-855 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <input 
                            type="tel" 
                            required
                            placeholder="Nomor WhatsApp"
                            value={jualPhone}
                            onChange={(e) => setJualPhone(e.target.value)}
                            className="w-full h-10 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-855 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10"
                          />
                        </div>

                        <Button 
                          type="submit" 
                          disabled={jualLoading}
                          className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          {jualLoading ? "Mengirim..." : "Kirim Booking Tukar Tambah"}
                        </Button>
                      </form>
                    ) : (
                      <div className="p-3 bg-slate-100 border border-slate-200 rounded-lg text-center text-xs font-bold text-slate-800">
                        ✓ Booking Tukar Tambah Berhasil Disimpan! Silakan tunjukkan nama/nomor Anda ke staf cabang terdekat.
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="py-12 text-center text-slate-500 flex flex-col items-center justify-center gap-2.5">
                    <Info className="h-8 w-8 text-slate-400" strokeWidth={1.5} />
                    <p className="text-xs max-w-[200px] leading-relaxed font-normal text-slate-500">
                      Masukkan nilai estimasi harga pada form di samping untuk mulai membandingkan selisih tukar tambah.
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* LACAK STATUS SECTION */}
      {activeSection === "lacak" && (
        <div className="relative z-10 max-w-xl mx-auto px-4 py-12">
          <button 
            type="button"
            onClick={() => setActiveSection("hero")}
            className="mb-8 inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-250 hover:bg-slate-50 hover:border-slate-300 text-slate-700 text-xs font-bold rounded-full transition-all shadow-sm cursor-pointer group"
          >
            <ArrowLeft className="w-4 h-4 text-slate-400 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Beranda
          </button>

          <div className="space-y-4 mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight text-center">Lacak Status Live Perbaikan</h1>
            <p className="text-slate-600 text-sm leading-relaxed font-normal text-center">
              Cukup masukkan Nomor Nota / ID Transaksi / ID Servis Anda di bawah untuk melacak kemajuan proses pengerjaan unit Anda secara langsung.
            </p>
          </div>

          <div className="space-y-6">
            <form onSubmit={handleTrackStatus} className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Nomor Nota / ID Servis</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={trackInvoice}
                    onChange={(e) => setTrackInvoice(e.target.value)}
                    placeholder="Contoh: SERV-XXXX atau INV-XXXX"
                    className="flex-1 h-11 bg-white border border-slate-250 rounded-lg px-3 text-xs text-slate-800 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900/10 uppercase transition-colors"
                  />
                  <Button type="submit" disabled={trackLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 h-11 rounded-lg cursor-pointer transition-colors shadow-xs">
                    {trackLoading ? "Mencari..." : <Search className="h-4 w-4 text-white" strokeWidth={1.5} />}
                  </Button>
                </div>
              </div>
            </form>

            <AnimatePresence>
              {trackResult && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="bg-white border border-slate-200 p-4 sm:p-6 rounded-2xl shadow-xs space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-slate-150 pb-3">
                    <div>
                      <h4 className="text-xs text-slate-500">Nomor Transaksi/Servis</h4>
                      <p className="text-sm font-semibold text-slate-900 uppercase mt-0.5">{trackResult.invoiceNumber}</p>
                    </div>
                    <div className="text-right">
                      <h4 className="text-xs text-slate-500">Nama Pelanggan</h4>
                      <p className="text-sm font-semibold text-slate-900 mt-0.5">{trackResult.customerName}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Perangkat / Unit:</div>
                    <p className="text-sm font-semibold text-slate-900">{trackResult.itemName}</p>
                  </div>

                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Status Pengerjaan:</div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-slate-100 border border-slate-250 text-slate-800 text-xs font-bold">
                      {trackResult.status}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-150 pt-4">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Keterangan / Diagnosa Teknis:</div>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      {trackResult.notes}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-slate-200/80 bg-slate-50 py-12 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
          
          <div className="space-y-3">
            <span className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Laptop className="h-5 w-5 text-slate-700" strokeWidth={1.5} /> {storeInfo?.store?.name || "Han Laptop"}
            </span>
            <p className="text-xs text-slate-550 leading-relaxed">
              Ekosistem marketplace & lab servis laptop terpadu untuk kualitas terjamin dengan transparansi penuh.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Layanan Utama</h4>
            <ul className="space-y-1.5 text-xs text-slate-550">
              <li><Link to={`/catalog/${selectedBranch}`} className="hover:text-slate-900 cursor-pointer transition-colors">Katalog Laptop</Link></li>
              <li><button onClick={() => {
                setActiveSection("jual")
                setJualSubmitted(false)
                setJualResult(null)
              }} className="hover:text-slate-900 cursor-pointer transition-colors text-left">Jual Laptop Instan</button></li>
              <li><button onClick={() => {
                setActiveSection("servis")
                setServisSubmitted(false)
                setServisDiagnosisResult(null)
              }} className="hover:text-slate-900 cursor-pointer transition-colors text-left">Diagnosis Lab Servis</button></li>
              <li><button onClick={() => {
                setActiveSection("tukar")
                setJualSubmitted(false)
                setJualResult(null)
              }} className="hover:text-slate-900 cursor-pointer transition-colors text-left">Simulasi Tukar Tambah</button></li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Hubungi Kami</h4>
            <ul className="space-y-1.5 text-xs text-slate-550">
              <li className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-slate-700 shrink-0" strokeWidth={1.5} />
                <span>{storeInfo?.store?.phone || "085161870922"}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-700 shrink-0" strokeWidth={1.5} />
                <span className="truncate max-w-[200px]">{storeInfo?.store?.address || "Alamat Toko"}</span>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Ikuti Sosial Media</h4>
            <div className="flex gap-3">
              <a 
                href={`https://instagram.com/${storeInfo?.store?.slug || "hanlaptop"}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="h-9 w-9 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-500 hover:text-slate-900 hover:border-slate-350 transition-all cursor-pointer shadow-xs"
              >
                <Instagram className="h-4 w-4" strokeWidth={1.5} />
              </a>
            </div>
          </div>

        </div>
        
        <div className="max-w-6xl mx-auto mt-8 pt-8 border-t border-slate-200/80 text-center text-[10px] text-slate-400">
          © {new Date().getFullYear()} {storeInfo?.store?.name || "Han Laptop"}. All rights reserved.
        </div>
      </footer>

      {/* FLOATING WHATSAPP BUTTON */}
      <a 
        href={getWhatsAppUrlWithText("Halo Han Laptop, saya butuh konsultasi bantuan.")}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center cursor-pointer group"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute right-full mr-4 bg-slate-900 text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Konsultasi Gratis
        </span>
      </a>

    </div>
  )
}
