import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Public "Coba demo" entry point. Signs the visitor into the FIXED, read-only demo
 * tenant server-side using env-configured credentials, so the demo password never
 * reaches the browser. The account is intentionally low-privilege:
 *   - role `investor` (read-only via RBAC), and
 *   - its org has `isDemo = true` (hard write-lock via requireWritable / requireWriteAccess).
 * So even with a valid session, the visitor can neither mutate data nor see any other
 * tenant (storeScope confines it to the demo store). Seed it with `seed-demo-tenant`.
 */
export async function POST(req: Request) {
    const rateLimited = await checkRateLimit(req);
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
