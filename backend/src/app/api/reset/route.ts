import { NextResponse } from "next/server";
import { db } from "@/db";
import { OPERATIONAL_TABLES } from "@/db/reset-tables";
import { sql } from "drizzle-orm";
import { requireOwnerOnly } from "@/lib/auth-guard";
import { resetDbSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
    // ── Security Feature Flag Check ──
    if (process.env.ENABLE_FACTORY_RESET !== "true") {
        return NextResponse.json(
            { error: "Fitur reset database dinonaktifkan di lingkungan ini. Aktifkan melalui ENABLE_FACTORY_RESET=true." },
            { status: 403 }
        );
    }

    const rateLimitResponse = await checkRateLimit(request, 5, 60_000); // Very strict: 5 per minute
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireOwnerOnly();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const parsed = resetDbSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid confirmation string", details: parsed.error.format() }, { status: 400 });
        }

        // Delete all operational tables in strict FK dependency order within a transaction
        await db.transaction(async (tx) => {
            for (const table of OPERATIONAL_TABLES) {
                await tx.delete(table);
            }
            
            // Clear auto-increment sequences safely (only if sqlite_sequence table exists in the database)
            try {
                const checkTable = await tx.run(sql`SELECT name FROM sqlite_master WHERE type='table' AND name='sqlite_sequence';`);
                if (checkTable.rows && checkTable.rows.length > 0) {
                    await tx.run(sql`DELETE FROM sqlite_sequence;`);
                }
            } catch (e) {
                console.log("Could not clear sqlite_sequence, skipping:", e);
            }
        });

        return NextResponse.json({ message: "Database successfully reset. All operational data cleared." }, { status: 200 });
    } catch (error: any) {
        console.error("Failed to reset database:", error);
        return NextResponse.json({ error: error.message || "Failed to reset database" }, { status: 500 });
    }
}
