import { NextResponse } from "next/server";
import { db } from "@/db";
import { warrantyClaims, activityLogs, transactions, customers } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, requireWriteAccess, storeScope } from "@/lib/auth-guard";
import { warrantyClaimSchema } from "@/lib/validators";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const data = await db.query.warrantyClaims.findMany({
            where: storeScope(authResult, warrantyClaims.storeId),
            orderBy: [desc(warrantyClaims.createdAt)],
            with: {
                transaction: true,
                customer: true,
                parts: true,
            }
        });

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Fetch Warranty Claims error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    const writeAccess = await requireWriteAccess(authResult);
    if (writeAccess instanceof NextResponse) return writeAccess;

    try {
        const body = await request.json();
        const parsed = warrantyClaimSchema.parse(body);

        return await db.transaction(async (tx) => {
            // Verify transaction exists
            const [txRecord] = await tx.select().from(transactions).where(eq(transactions.id, parsed.transactionId));
            if (!txRecord) {
                return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
            }

            const [claim] = await tx.insert(warrantyClaims).values({
                storeId: authResult.storeId,
                transactionId: parsed.transactionId,
                customerId: parsed.customerId,
                technicianId: parsed.technicianId || null,
                issueDescription: parsed.issueDescription,
                status: 'SUBMITTED',
            }).returning();

            // Log activity
            await tx.insert(activityLogs).values({
                userId: authResult.user.id,
                userName: authResult.user.name || 'Unknown',
                action: 'CREATE_WARRANTY_CLAIM',
                entityType: 'WARRANTY_CLAIM',
                entityId: claim.id,
                details: `Opened warranty claim for transaction ${txRecord.invoiceNumber}`,
            });

            return NextResponse.json({ success: true, claim });
        });
    } catch (error: any) {
        console.error("Create Warranty Claim error:", error);
        return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
    }
}
