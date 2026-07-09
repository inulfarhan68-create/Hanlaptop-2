import { GoogleGenAI } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const AI_SYSTEM_PROMPT = `You are an expert AI parser for retail and wholesale billing documents. Your task is to analyze the uploaded supplier invoice, purchase receipt, bill, or inventory log (which can be a PDF document, Excel screenshot, or a messy photo).
Extract all purchased inventory items and financial details from the document with extreme precision.

Follow these rules carefully:
1. Identify the Supplier Name if mentioned in the document.
2. Financial Summaries: Look for invoice totals.
   - "discount": Any discounts applied to the total bill in IDR (not percentage, convert to flat amount).
   - "tax": Any VAT / PPN / Taxes applied to the bill in IDR.
   - "shipping": Any shipping, delivery, or freight costs (Ongkir) in IDR.
   - "grandTotal": The final amount paid.

3. Extract Items. For each physical inventory item purchased, extract:
   - "itemName": The precise name of the item.
   - "category": Decide the category: "Laptop Bekas" (for laptops/PCs), "Sparepart" (for components like SSD, RAM, Keyboard, screen, motherboard), or "Aksesoris" (for accessories like mice, bags, chargers, cables).
   - "quantity": Number of units purchased (default to 1).
   - "costPrice": The purchase price per unit (Unit Cost) in IDR. If the document only lists a subtotal for the item, divide it by quantity. MUST BE A CLEAN NUMBER (e.g., 5200000). Remove Rp, dots, or commas.
   - "sellingPrice": Suggested selling price. Calculate as costPrice + 25% markup (costPrice * 1.25) and round it to nearest thousand.
   - "specs": If it is a "Laptop Bekas", extract the processor, RAM, and storage (e.g., "Intel Core i5-8250U | 8GB RAM | 256GB SSD").
   - "sku": If there is a product code, SKU, or Part Number.
   - "serialNumber": If there is a Serial Number (SN, S/N), IMEI, or Service Tag explicitly listed for the item.

4. CRITICAL RULES:
   - IGNORE SERVICES: If a line item is clearly a service (e.g., "Jasa Servis", "Biaya Rakit", "Ongkos Kirim"), DO NOT include it in the "items" array. (Shipping goes to the invoiceSummary).
   - NUMBER FORMATTING: All numeric values (costPrice, discount, etc.) MUST be raw integers. Convert formats like "5.200.000,00" or "Rp 5,200,000" into 5200000.
   - NULL VALUES: If a field like sku or serialNumber is not found, return null (not an empty string).

5. Output EXCLUSIVELY as a valid JSON object matching this structure (no markdown, no backticks, just raw JSON):
{
  "supplierName": "string or null",
  "invoiceSummary": {
    "discount": number,
    "tax": number,
    "shipping": number,
    "grandTotal": number
  },
  "items": [
    {
      "itemName": "string",
      "category": "Laptop Bekas" | "Sparepart" | "Aksesoris",
      "quantity": number,
      "costPrice": number,
      "sellingPrice": number,
      "specs": "string or null",
      "sku": "string or null",
      "serialNumber": "string or null"
    }
  ]
}
`;

const mockInvoices = [
    {
        name: "Skenario 1: Nota Lengkap (Distributor) dengan PPN, Ongkir & Jasa",
        content: `
            INVOICE #99281
            SUPPLIER: PT. MEGA TEKNOLOGI
            
            1. Laptop Asus ROG Strix G15 (i7-10750H, 16GB RAM, 512GB SSD) - SN: G15X9928A - QTY 2 - @ Rp 12.500.000 - Total: Rp 25.000.000
            2. SSD Samsung 870 EVO 500GB - SKU: MZ-77E500BW - QTY: 5 - @ 850.000 - Total: 4.250.000
            3. Mouse Logitech G102 - QTY: 10 - @ 200,000.00 - Total: 2,000,000
            4. Biaya Asuransi & Pengiriman (JNE) - Rp 150.000
            5. Jasa Rakit & Instalasi Windows - Rp 500.000
            
            Subtotal: Rp 31.900.000
            PPN (11%): Rp 3.437.500
            Diskon Khusus: - Rp 1.000.000
            GRAND TOTAL: Rp 34.337.500
        `
    },
    {
        name: "Skenario 2: Nota Bon Tulisan Tangan (Format Kacau)",
        content: `
            Toko Komputer Laris Manis
            
            Beli:
            - thinkpad t470s i5 gen6 ram8 ssd256 1 unit hrga rp 3500000
            - ram ddr4 8gb sodimm 3 pcs @150rb = 450rb
            - charger lenovo kotak 2 biji 100rban = 200rb
            
            total ssemua 4150000
            potongan 50rb jd 4100000 pas.
        `
    }
];

async function runTests() {
    console.log("=========================================");
    console.log("   AI INVOICE PARSER - SIMULATION TEST");
    console.log("=========================================");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error("❌ ERROR: GEMINI_API_KEY is missing in .env");
        process.exit(1);
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    for (const invoice of mockInvoices) {
        console.log(`\n\n▶ MENGUJI: ${invoice.name}`);
        console.log(`Input Teks Nota:\n${invoice.content}`);
        console.log(`\nMenghubungi Gemini 2.5 Flash...`);
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: [
                    "Analyze this document text (OCR output) and extract all inventory items and prices.",
                    invoice.content
                ],
                config: {
                    systemInstruction: AI_SYSTEM_PROMPT,
                    responseMimeType: 'application/json',
                    temperature: 0.1
                }
            });

            console.log("\n✅ HASIL EKSTRAKSI JSON:");
            console.log(JSON.stringify(JSON.parse(response.text || "{}"), null, 2));

        } catch (err: any) {
            console.error(`❌ GAGAL:`, err.message);
        }
    }
}

runTests().catch(console.error);
