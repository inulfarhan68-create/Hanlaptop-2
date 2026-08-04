import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimitTier } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public "Coba demo" entry point. Signs the visitor into the FIXED, read-only demo
 * tenant server-side using env-configured credentials, so the demo password never
 * reaches the browser.
 *
 * The write-lock is `organizations.isDemo = true` on the demo org — NOT the account's
 * role. `isDemo` resolves to `AuthContext.isReadOnly`, and `requirePermission` rejects
 * every write-intent permission on a read-only context regardless of role (with
 * requireWritable / requireWriteAccess covering the handlers that don't go through
 * PBAC). That single central choke is precisely what lets the demo account carry the
 * broad `manager` role — a full menu for the sales tour (inventory, POS, servis,
 * laporan, payroll, …) — while still being unable to mutate anything. Do not treat the
 * role as a second safety layer: it is chosen for demo surface area, not containment.
 * The demo also can't see any other tenant (storeScope confines it to the demo store).
 * Seed it with `seed-demo-tenant`, which is what pins the role.
 */
export async function POST(req: Request) {
    // Session-creating endpoint → use the app's stricter tier (not the 60/min default).
    const rateLimited = await checkRateLimitTier(req, "strict");
    if (rateLimited) return rateLimited;

    const email = process.env.DEMO_LOGIN_EMAIL;
    const password = process.env.DEMO_LOGIN_PASSWORD;
    if (!email || !password) {
        return NextResponse.json(
            { error: "Mode demo sedang tidak tersedia." },
            { status: 503 }
        );
    }

    try {
        // asResponse:true returns Better-Auth's raw Response, whose Set-Cookie header
        // carries the session. Returning it verbatim sets the cookie on the browser.
        const res = await auth.api.signInEmail({
            body: { email, password },
            headers: req.headers,
            asResponse: true,
        });

        if (!res.ok) {
            console.error("Demo sign-in rejected:", res.status);
            return NextResponse.json(
                { error: "Gagal masuk ke demo. Coba lagi nanti." },
                { status: 502 }
            );
        }

        return res;
    } catch (error) {
        console.error("Demo login failed:", error);
        return NextResponse.json(
            { error: "Gagal masuk ke demo. Coba lagi nanti." },
            { status: 500 }
        );
    }
}
