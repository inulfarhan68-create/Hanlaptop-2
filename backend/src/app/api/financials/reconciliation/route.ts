import { NextResponse } from "next/server";
import { db } from "@/db";
import { bankMutations, transactions, journalEntries } from "@/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { requireOwnerOrManager, storeScope } from "@/lib/auth-guard";
import crypto from "crypto";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    try {
        let conditions = [];
        const scope = storeScope(authResult, bankMutations.storeId);
        if (scope) conditions.push(scope);

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        const data = await db.query.bankMutations.findMany({
            where: whereClause,
            orderBy: [desc(bankMutations.date), desc(bankMutations.createdAt)],
            with: {
                reconciledTransaction: true,
                reconciledServiceOrder: true
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Failed to fetch bank mutations:", error);
        return NextResponse.json({ error: error.message || "Gagal memuat mutasi bank." }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireOwnerOrManager();
    if (authResult instanceof NextResponse) return authResult;

    if (authResult.storeId === "all") {
        return NextResponse.json({ error: "Silakan pilih cabang terlebih dahulu untuk melakukan rekonsiliasi." }, { status: 400 });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;

        if (!file) {
            return NextResponse.json({ error: "File CSV mutasi wajib diunggah." }, { status: 400 });
        }

        const text = await file.text();
        const lines = text.split(/\r?\n/);
        const importedMutations = [];

        // Parse CSV line by line (skip header if present)
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || i === 0 && (line.toLowerCase().includes("date") || line.toLowerCase().includes("tanggal"))) {
                continue; // Skip header
            }

            // Support comma or semicolon separation
            const cols = line.includes(";") ? line.split(";") : line.split(",");
            if (cols.length < 3) continue;

            const rawDate = cols[0]?.replace(/"/g, "").trim() || "";
            const rawDescription = cols[1]?.replace(/"/g, "").trim() || "";
            const rawAmount = cols[2]?.replace(/"/g, "").trim() || "0";
            const rawType = cols[3]?.replace(/"/g, "").trim().toUpperCase() || "CR"; // Default credit

            // Clean amount
            const cleanAmountStr = rawAmount.replace(/[^\d.-]/g, "");
            const amount = Math.abs(parseFloat(cleanAmountStr)) || 0;

            if (amount <= 0) continue;

            // Generate clean date (YYYY-MM-DD)
            let date = new Date().toISOString().split("T")[0];
            if (rawDate) {
                // If format is DD/MM/YYYY or DD-MM-YYYY
                const parts = rawDate.split(/[-/]/);
                if (parts.length >= 2) {
                    const day = parts[0].padStart(2, "0");
                    const month = parts[1].padStart(2, "0");
                    const year = parts[2] ? (parts[2].length === 2 ? "20" + parts[2] : parts[2]) : new Date().getFullYear().toString();
                    date = `${year}-${month}-${day}`;
                }
            }

            // Insert into bank_mutations
            const mutationId = crypto.randomUUID();
            await db.insert(bankMutations).values({
                id: mutationId,
                storeId: authResult.storeId,
                date,
                description: rawDescription,
                amount,
                type: rawType.startsWith("DB") || cleanAmountStr.startsWith("-") ? "DB" : "CR",
                reconciled: 0,
                createdAt: new Date()
            });

            // Find match suggestions from unpaid transactions of the same amount
            const suggestions = await db.query.transactions.findMany({
                where: and(
                    eq(transactions.storeId, authResult.storeId),
                    eq(transactions.amount, amount),
                    eq(transactions.paymentStatus, "Belum Lunas")
                )
            });

            importedMutations.push({
                id: mutationId,
                date,
                description: rawDescription,
                amount,
                type: rawType.startsWith("DB") || cleanAmountStr.startsWith("-") ? "DB" : "CR",
                suggestions
            });
        }

        return NextResponse.json({
            message: `Berhasil mengimpor ${importedMutations.length} baris mutasi bank.`,
            mutations: importedMutations
        });

    } catch (error: any) {
        console.error("Failed to parse and reconcile mutations:", error);
        return NextResponse.json({ error: error.message || "Gagal memproses mutasi bank." }, { status: 500 });
    }
}
