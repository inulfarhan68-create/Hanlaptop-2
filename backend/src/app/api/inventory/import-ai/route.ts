import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { checkRateLimitTier } from "@/lib/rate-limit";
import { GoogleGenAI } from "@google/genai";

export const dynamic = 'force-dynamic';

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

export async function POST(request: Request) {
    // AI calls hit a paid Gemini API — cap per-IP usage (30/hour) to prevent cost abuse.
    const rateLimitResponse = await checkRateLimitTier(request, "ai");
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { fileData, mimeType } = body;

        if (!fileData || !mimeType) {
            return NextResponse.json({ error: "fileData (base64) dan mimeType wajib disertakan." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key GEMINI_API_KEY belum dikonfigurasi di server." }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });

        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [
                {
                    inlineData: {
                        data: fileData,
                        mimeType: mimeType
                    }
                },
                "Analyze this document and extract all inventory items and prices."
            ],
            config: {
                systemInstruction: AI_SYSTEM_PROMPT,
                responseMimeType: 'application/json',
                temperature: 0.1
            }
        });

        const textResponse = response.text;
        if (!textResponse) {
             throw new Error("Gemini returned an empty response.");
        }

        const jsonResponse = JSON.parse(textResponse);
        return NextResponse.json(jsonResponse);
    } catch (error: any) {
        console.error("Gemini Invoice Import Error:", error);
        return NextResponse.json(
            { error: "Gagal memproses nota menggunakan AI", details: error.message },
            { status: 500 }
        );
    }
}
