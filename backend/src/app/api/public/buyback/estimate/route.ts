import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
    // 1. Rate Limiting (limit to 15 requests per minute per IP for AI safety)
    const rateLimitResponse = await checkRateLimit(request, 15, 60_000);
    if (rateLimitResponse) return rateLimitResponse;

    try {
        const body = await request.json();
        const { query, purchaseYear, hasWarranty } = body;

        if (!query || query.trim().length < 3) {
            return NextResponse.json({ error: "Query pencarian minimal 3 karakter." }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ 
                error: "GEMINI_API_KEY belum terkonfigurasi. Silakan tambahkan GEMINI_API_KEY ke file .env di backend.",
                isApiKeyMissing: true
            }, { status: 500 });
        }

        // Construct prompt for Gemini with Search Grounding
        const prompt = `You are an expert laptop appraiser and specs identifier in Indonesia.
Given the laptop model query: "${query}", purchase year / duration of use: "${purchaseYear || 'Unknown'}", and official warranty status: "${hasWarranty ? 'Yes, still active' : 'No/Expired'}".

TASK 1 - SPECS IDENTIFICATION:
Identify the standard/default specifications for this exact laptop model. 
IMPORTANT: The same laptop type (e.g. "Asus ROG Strix G15") can have many variants with different specs (different processors, RAM, VGA). 
- First, identify the MOST COMMON variant for this model.
- Return the standard specs. The user may later adjust if their unit differs (e.g. upgraded RAM or different VGA).
- If the query is ambiguous (e.g. just a brand name without a model), make a best guess on a popular model.

TASK 2 - MARKET PRICE RESEARCH:
Search the web for SECOND-HAND (bekas) listings of this laptop on Indonesian marketplaces (Tokopedia, Shopee, Bukalapak, OLX, Facebook Marketplace).
- Focus on finding the AVERAGE reasonable second-hand market price wajar (harga rata-rata pasaran yang wajar) available for this laptop in standard working condition. We want a realistic average price listing to base our offer on.
- Consider the purchase year: "${purchaseYear || 'Unknown'}" and warranty: "${hasWarranty ? 'Active' : 'Expired/None'}".

Return your response strictly as a JSON object with the following structure:
{
  "brand": "The brand (e.g., Asus, Acer, Lenovo, HP, Dell, Apple, MSI)",
  "model": "The specific model name (e.g., ROG Strix G15 G513QE)",
  "processor": "Full processor name including family and series (e.g., Intel Core i5-11400H, AMD Ryzen 7 5800H, Apple M1)",
  "ram": "Typical default RAM, one of: 4GB, 8GB, 16GB, 32GB",
  "storage": "Typical default storage, one of: 128GB SSD, 256GB SSD, 512GB SSD, 1TB SSD, 2TB SSD, 1TB HDD, or double storage like 256GB SSD + 1TB HDD",
  "vga": "Full VGA card name including brand and series (e.g., NVIDIA GeForce RTX 3050 Ti, AMD Radeon RX 6600M, Intel Iris Xe Graphics, Integrated)",
  "keyboard": "Default keyboard type, MUST be one of: Non-Backlight, Single Backlight, RGB Backlight",
  "screen": "Screen size and resolution. MUST be one of: 11.6\" HD (1366x768), 13.3\" FHD (1920x1080), 13.3\" WQXGA (2560x1600), 14\" HD (1366x768), 14\" FHD (1920x1080), 14\" WUXGA (1920x1200), 14\" 2.2K / 2.5K, 14\" 2.8K OLED, 15.6\" HD (1366x768), 15.6\" FHD (1920x1080), 15.6\" FHD 144Hz, 15.6\" QHD 165Hz, 16\" WUXGA (1920x1200), 16\" WQXGA (2560x1600), 16\" 3.2K OLED, 17.3\" FHD, 17.3\" QHD",
  "os": "Operating system. MUST be one of: Windows 11 Home, Windows 11 Pro, Windows 10 Home, Windows 10 Pro, macOS",
  "connectivity": "Typical wireless connectivity info, e.g. Wi-Fi 6 + Bluetooth 5.1 or Wi-Fi 5 + Bluetooth 4.2",
  "ports": "Available physical ports list, e.g. 2x USB-C, 1x USB-A, HDMI, Audio Jack",
  "lowestMarketPrice": 7500000
}

IMPORTANT RULES:
- Do NOT include "explanation", "marketPriceRange", "recommendedOfferPrice", or any extra fields. Only the fields listed above.
- The "lowestMarketPrice" should be the average reasonable second-hand market price you found (harga rata-rata pasaran yang masuk akal).
- Make sure the JSON output is valid and contains no other text or markdown block wrappers. Do not include markdown code block syntax (like \`\`\`json) in your raw output.`;

        // Call Gemini 2.5 Flash API with Search Grounding & Temperature 0.0 for consistency
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        
        const geminiResponse = await fetch(geminiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                text: prompt
                            }
                        ]
                    }
                ],
                tools: [
                    {
                        googleSearch: {}
                    }
                ],
                generationConfig: {
                    temperature: 0.0
                }
            })
        });

        if (!geminiResponse.ok) {
            const errorText = await geminiResponse.text();
            console.error("Gemini API error status:", geminiResponse.status, errorText);
            if (geminiResponse.status === 429) {
                return NextResponse.json({ 
                    error: "Layanan Taksir AI sedang sibuk karena batas kuota harian/menit tercapai. Anda tetap bisa mengisi spesifikasi secara manual di bawah, atau silakan coba lagi dalam beberapa menit." 
                }, { status: 429 });
            }
            throw new Error(`Gemini API returned status ${geminiResponse.status}`);
        }

        const data = await geminiResponse.json();
        
        // Parse the generated text
        const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!contentText) {
            throw new Error("Gemini did not return any content.");
        }

        // Clean markdown code blocks if present (e.g. ```json ... ```)
        let cleanedText = contentText.trim();
        if (cleanedText.startsWith("```json")) {
            cleanedText = cleanedText.substring(7);
        } else if (cleanedText.startsWith("```")) {
            cleanedText = cleanedText.substring(3);
        }
        if (cleanedText.endsWith("```")) {
            cleanedText = cleanedText.substring(0, cleanedText.length - 3);
        }
        cleanedText = cleanedText.trim();

        let parsedResult;
        try {
            parsedResult = JSON.parse(cleanedText);
        } catch (e) {
            console.error("Failed to parse Gemini output as JSON. Output was:", contentText);
            throw new Error("Gagal memproses respons dari AI. Coba masukkan nama laptop yang lebih spesifik.");
        }

        // Helper parsers for backwards compatibility
        const getProcFamily = (p: string) => {
            const s = (p || "").toUpperCase();
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
            return "Intel Core i5";
        };

        const getVgaType = (v: string) => {
            const s = (v || "").toUpperCase();
            if (s.includes("RTX")) return "NVIDIA RTX Series";
            if (s.includes("GTX")) return "NVIDIA GTX Series";
            if (s.includes("RADEON") || s.includes("AMD")) {
                if (s.includes("INTEGRATED") || s.includes("VEGA") || s.includes("GRAPHICS")) return "Integrated";
                return "AMD Radeon Dedicated";
            }
            if (s.includes("IRIS") || s.includes("INTEL") || s.includes("INTEGRATED") || s.includes("XE")) return "Integrated";
            if (s.includes("M-SERIES") || s.includes("APPLE") || s.includes("M1") || s.includes("M2") || s.includes("M3")) return "Integrated";
            return "Integrated";
        };

        const lowestMarketPrice = Number(parsedResult.lowestMarketPrice) || 3000000;

        // Deterministic price calculation for recommendedOfferPrice by grade
        const currentYear = 2026;
        const year = parseInt(purchaseYear) || 2023;
        const age = currentYear - year;
        let ageMultiplier = 1.0;
        if (age <= 1) ageMultiplier = 1.0;
        else if (age === 2) ageMultiplier = 0.90;
        else if (age === 3) ageMultiplier = 0.80;
        else ageMultiplier = 0.65;

        const warrantyMultiplier = hasWarranty === true ? 1.10 : 1.0;
        const adjustedMarket = lowestMarketPrice * ageMultiplier * warrantyMultiplier;
        
        // 30% margin (70% offer price)
        const baseOffer = adjustedMarket * 0.70;

        const roundTo50k = (val: number) => Math.max(500000, Math.round(val / 50000) * 50000);

        const recommendedOfferPrice = {
            USED_A: roundTo50k(baseOffer * 1.00),
            USED_B: roundTo50k(baseOffer * 0.85),
            USED_C: roundTo50k(baseOffer * 0.65),
            BROKEN: roundTo50k(baseOffer * 0.25)
        };

        // Sanitize: remove any fields we don't want exposed publicly
        // Keep lowestMarketPrice for internal admin use only (admin panel reads it)
        // The public landing page will NOT display it
        const sanitizedResult = {
            brand: parsedResult.brand || "",
            model: parsedResult.model || "",
            processor: parsedResult.processor || "",
            ram: parsedResult.ram || "",
            storage: parsedResult.storage || "",
            vga: parsedResult.vga || "",
            keyboard: parsedResult.keyboard || "",
            screen: parsedResult.screen || "",
            os: parsedResult.os || "",
            connectivity: parsedResult.connectivity || "",
            ports: parsedResult.ports || "",
            lowestMarketPrice: lowestMarketPrice,
            recommendedOfferPrice: recommendedOfferPrice,
            aiBaselineYear: purchaseYear || "2023",
            aiBaselineHasWarranty: hasWarranty === true,
            
            // For backwards compatibility:
            processorFamily: getProcFamily(parsedResult.processor),
            processorSeries: parsedResult.processor || "",
            vgaType: getVgaType(parsedResult.vga),
            vgaDetails: parsedResult.vga || "Integrated"
        };

        return NextResponse.json({
            success: true,
            data: sanitizedResult
        });

    } catch (error: any) {
        console.error("AI estimation error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
