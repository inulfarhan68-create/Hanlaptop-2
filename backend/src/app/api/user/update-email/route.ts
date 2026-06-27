import { NextResponse } from "next/server";
import { db } from "@/db";
import { user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth-guard";
import { updateEmailSchema } from "@/lib/validators";
import { checkRateLimit } from "@/lib/rate-limit";
import { sanitizeInput } from "@/lib/sanitize";

export async function POST(request: Request) {
    const rateLimitResponse = await checkRateLimit(request, 10, 60_000); // 10 email changes per minute
    if (rateLimitResponse) return rateLimitResponse;

    const authResult = await requireAuth();
    if (authResult instanceof NextResponse) return authResult;
    
    // authResult is the session object when successful
    const session = authResult;

    try {
        const rawBody = await request.json();
        const body = sanitizeInput(rawBody);
        const parsed = updateEmailSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.format() }, { status: 400 });
        }

        const { newEmail } = parsed.data;

        // Check if email already exists
        const existingUser = await db.query.user.findFirst({
            where: eq(user.email, newEmail)
        });

        if (existingUser && existingUser.id !== session.user.id) {
            return NextResponse.json({ error: "Email sudah digunakan oleh akun lain" }, { status: 400 });
        }

        // Update the user email
        await db.update(user)
            .set({ email: newEmail })
            .where(eq(user.id, session.user.id));

        return NextResponse.json({ success: true, email: newEmail });
    } catch (error) {
        console.error("Failed to update email:", error);
        return NextResponse.json({ error: "Gagal memperbarui email" }, { status: 500 });
    }
}
