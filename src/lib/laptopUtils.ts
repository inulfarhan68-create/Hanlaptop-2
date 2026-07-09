import { formatCurrency } from "./utils";

export interface LaptopSpecs {
    processor?: string; 
    vga?: string; 
    ram?: string; 
    storage?: string; 
    screen?: string; 
    keyboard?: string; 
    os?: string; 
    condition?: string; 
    defect?: string; 
}

export function parseItemSpecs(specs: string): LaptopSpecs {
    const result: LaptopSpecs = {};
    if (!specs) return result;
    
    const parts = specs.split(" | ");
    parts.forEach(part => {
        if (part.startsWith("Processor: ")) result.processor = part.replace("Processor: ", "");
        else if (part.startsWith("VGA: ")) result.vga = part.replace("VGA: ", "");
        else if (part.startsWith("RAM: ")) result.ram = part.replace("RAM: ", "");
        else if (part.startsWith("Storage: ")) result.storage = part.replace("Storage: ", "");
        else if (part.startsWith("Layar: ")) result.screen = part.replace("Layar: ", "");
        else if (part.startsWith("Keyboard: ")) result.keyboard = part.replace("Keyboard: ", "");
        else if (part.startsWith("OS: ")) result.os = part.replace("OS: ", "");
        else if (part.startsWith("Kondisi: ")) {
            const condStr = part.replace("Kondisi: ", "");
            if (condStr.startsWith("Minus (") && condStr.endsWith(")")) {
                result.condition = "Minus";
                result.defect = condStr.substring(7, condStr.length - 1);
            } else {
                result.condition = condStr;
            }
        }
    });
    return result;
}

export interface LaptopClassification {
    id: string;
    name: string;
    color: string;
}

export function classifyLaptop(itemName: string, specsStr: string, price: number): LaptopClassification[] {
    const specs = parseItemSpecs(specsStr || "");
    const nameLower = itemName.toLowerCase();
    const procLower = (specs.processor || "").toLowerCase();
    const vgaLower = (specs.vga || "").toLowerCase();
    
    // Clean RAM value to number
    const ramStr = (specs.ram || "").toLowerCase();
    const ramGb = parseInt(ramStr.replace(/[^0-9]/g, "")) || 0;
    
    const classifications: LaptopClassification[] = [];
    
    // 1. Gaming & Rendering Berat
    const hasDedicatedGpu = vgaLower.includes("rtx") || 
                           vgaLower.includes("gtx") || 
                           vgaLower.includes("radeon rx") || 
                           vgaLower.includes("geforce") ||
                           vgaLower.includes("quadro") ||
                           vgaLower.includes("discrete") ||
                           nameLower.includes("rog") || 
                           nameLower.includes("tuf") || 
                           nameLower.includes("legion") || 
                           nameLower.includes("nitro") || 
                           nameLower.includes("predator") ||
                           nameLower.includes("alienware") ||
                           nameLower.includes("gaming");
    
    const isHighPerformanceCpu = procLower.includes("i7") || 
                                 procLower.includes("i9") || 
                                 procLower.includes("ryzen 7") || 
                                 procLower.includes("ryzen 9");
    
    if (hasDedicatedGpu || (isHighPerformanceCpu && ramGb >= 16)) {
        classifications.push({
            id: "gaming_heavy",
            name: "Gaming",
            color: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-450 dark:border-slate-800"
        });
    }
    
    // 2. Desain, Editing & Coding
    const isCapableCpu = procLower.includes("i5") || 
                          procLower.includes("i7") || 
                          procLower.includes("i9") || 
                          procLower.includes("ryzen 5") || 
                          procLower.includes("ryzen 7") || 
                          procLower.includes("ryzen 9") || 
                          procLower.includes("m1") || 
                          procLower.includes("m2") || 
                          procLower.includes("m3") || 
                          procLower.includes("m4");
    
    const isAppleMac = nameLower.includes("macbook") || procLower.includes("apple");
    
    if ((isCapableCpu && ramGb >= 8) || isAppleMac || price >= 6000000) {
        classifications.push({
            id: "creative_dev",
            name: "Desain",
            color: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-450 dark:border-slate-800"
        });
    }
    
    // 3. Pelajar & Kerja Harian
    const isBasicCpu = procLower.includes("celeron") || 
                       procLower.includes("pentium") || 
                       procLower.includes("athlon") || 
                       procLower.includes("i3") || 
                       procLower.includes("ryzen 3") ||
                       procLower.includes("core 2") ||
                       procLower.includes("dual core");
    
    if (isBasicCpu || price < 7000000 || ramGb <= 8 || (!hasDedicatedGpu && price < 9000000)) {
        classifications.push({
            id: "student_office",
            name: "Student & Office",
            color: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-450 dark:border-slate-800"
        });
    }
    
    if (classifications.length === 0) {
        classifications.push({
            id: "student_office",
            name: "Student & Office",
            color: "bg-slate-50 text-slate-500 border-slate-200 dark:bg-slate-900/40 dark:text-slate-450 dark:border-slate-800"
        });
    }
    
    return classifications;
}

export function generateMedsosTemplate(item: any): string {
    const storeName = localStorage.getItem("storeName") || "HANLAPTOP";
    const formattedPrice = formatCurrency(item.sellingPrice);
    
    let specsText = "";
    if (item.specs) {
        const parts = item.specs.split(/\||\n/);
        specsText = parts
            .map((part: string) => part.trim())
            .filter((part: string) => part.length > 0)
            .map((part: string) => {
                if (part.includes(":")) {
                    const [key, ...valParts] = part.split(":");
                    const val = valParts.join(":").trim();
                    return `- ${key.trim()}: ${val}`;
                }
                return `- ${part}`;
            })
            .join("\n");
    } else {
        specsText = `- Kategori: ${item.category}\n- Status: Ready Stock`;
    }
    
    return `💻 LAPTOP READY STOCK - ${storeName.toUpperCase()}
=================================
Spesifikasi ${item.itemName}:
${specsText}
---------------------------------
Harga: ${formattedPrice}
Berminat? Hubungi kami segera!`;
}
