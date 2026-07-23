import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/auth-guard";
import { cookies } from "next/headers";

export async function POST() {
    const authResult = await requirePlatformAdmin();
    if (authResult instanceof NextResponse) return authResult;

    const cookieStore = await cookies();
    cookieStore.delete("x-impersonate-org-id");

    return NextResponse.json({ success: true, message: "Impersonation stopped" });
}
