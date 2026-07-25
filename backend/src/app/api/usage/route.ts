import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { getUsage } from "@/lib/usage-limits";

export const dynamic = "force-dynamic";

/**
 * Current tenant's usage vs plan limits (stores, users, transactions-this-month).
 * Drives the soft-warning banner (80%/90%) and the "batas tercapai" upgrade CTA.
 */
export async function GET() {
    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;

    // platform_admin isn't a single tenant — nothing to meter.
    if (!authResult.organizationId) {
        return NextResponse.json({ metrics: [], plan: null });
    }

    const metrics = await getUsage(authResult.organizationId, authResult.plan);
    return NextResponse.json({
        metrics,
        plan: authResult.plan ? { key: authResult.plan.key, name: authResult.plan.name } : null,
    });
}
