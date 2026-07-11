import { NextResponse } from "next/server";
import { db } from "@/db";
import { aiPricingLogs } from "@/db/schema";
import { requireAuth } from "@/lib/auth-guard";
import { checkRateLimitTier } from "@/lib/rate-limit";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

export const dynamic = 'force-dynamic';

const pricingRequestSchema = z.object({
    specs: z.string().min(5, "Spesifikasi laptop terlalu singkat"),
    condition: z.enum(['NEW', 'USED_A', 'USED_B', 'USED_C', 'BROKEN', 'IN_INSPECTION']),
    additionalNotes: z.string().optional()
});

const AI_SYSTEM_PROMPT = `You are a highly experienced Laptop Pricing Appraiser for a retail business in Indonesia.
Your job is to analyze the laptop specifications and physical condition provided, and determine a fair 'Buying Price' (Harga Beli untuk toko) and 'Selling Price' (Harga Jual ke end user) in Indonesian Rupiah (IDR).

Follow these rules:
1. Ensure a healthy profit margin for the store (Selling Price must be higher than Buying Price by at least 15-30% depending on risk).
2. Take into account depreciation for older processors (e.g., Intel 8th Gen vs 13th Gen).
3. Condition 'NEW' means brand new in box. 'USED_A' is mint condition. 'USED_B' has minor scratches. 'USED_C' has noticeable defects. 'BROKEN' means for parts only.
4. Output your response EXCLUSIVELY as a valid JSON object with the following structure exactly (no markdown, no backticks, just the JSON string):
{
  "recommendedBuyPrice": number, // Raw number in IDR (e.g., 5000000)
  "recommendedSellPrice": number, // Raw number in IDR (e.g., 6500000)
  "confidenceScore": number, // 0-100 indicating how confident you are in this pricing
  "reasoning": string // Brief explanation of why you chose these prices in Bahasa Indonesia
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
        const parsed = pricingRequestSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: "API Key GEMINI_API_KEY belum dikonfigurasi di server." }, { status: 500 });
        }

        const ai = new GoogleGenAI({ apiKey: apiKey });

        const prompt = `Laptop Specs: ${parsed.data.specs}
Condition: ${parsed.data.condition}
Additional Notes (Accessories, minus, etc.): ${parsed.data.additionalNotes || 'None'}`;

        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents: prompt,
            config: {
                systemInstruction: AI_SYSTEM_PROMPT,
                responseMimeType: 'application/json',
                temperature: 0.2 // Low temperature for consistent pricing
            }
        });

        const textResponse = response.text;
        if (!textResponse) {
             throw new Error("AI returned empty response");
        }

        const jsonResponse = JSON.parse(textResponse);

        // Save to Database Logs for Audit
        await db.insert(aiPricingLogs).values({
            specs: parsed.data.specs,
            condition: parsed.data.condition,
            recommendedBuyPrice: jsonResponse.recommendedBuyPrice,
            recommendedSellPrice: jsonResponse.recommendedSellPrice,
            confidenceScore: jsonResponse.confidenceScore,
            reasoning: jsonResponse.reasoning
        });

        return NextResponse.json(jsonResponse);
    } catch (error: any) {
        console.error("AI Pricing Error:", error);
        return NextResponse.json({ error: "Gagal mendapatkan rekomendasi harga dari AI", details: error.message }, { status: 500 });
    }
}
