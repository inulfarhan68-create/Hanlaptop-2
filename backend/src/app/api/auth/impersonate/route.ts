import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { cookies } from "next/headers";
import { db } from "@/db";
import { activityLogs } from "@/db/schema";

export async function POST(request: Request) {
    const authResult = await requirePlatformAdmin();
    if (authResult instanceof NextResponse) return authResult;

    try {
        const body = await request.json();
        const { organizationId } = body;

        if (!organizationId) {
            return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
        }

        const cookieStore = await cookies();
        cookieStore.set("x-impersonate-org-id", organizationId, {
            path: "/",
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            maxAge: 60 * 60 * 24 // 24 hours
        });

        // Audit trail: record who impersonated which tenant and when.
        await db.insert(activityLogs).values({
            storeId: "default",
            userId: authResult.user.id,
            userName: authResult.user.name,
            action: "IMPERSONATE_START",
            entityType: "ORGANIZATION",
            entityId: organizationId,
            details: JSON.stringify({ organizationId }),
        });

        return NextResponse.json({ success: true, message: "Impersonation started" });
    } catch (e: any) {
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 });
    }
}
