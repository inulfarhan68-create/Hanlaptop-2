import * as path from "path";
import * as dotenv from "dotenv";

// Resolved from the working directory, not __dirname: this package is ESM, where
// __dirname does not exist (create-admin.ts still uses it and throws before it
// reaches any logic). Scripts here are documented to run from `backend/`
// — CLAUDE.md rule 17 — so cwd is the right anchor.
// `.env.local` FIRST: dotenv does not override a variable that is already set,
// so the file loaded first wins. Loading `.env` first would let a stale
// DATABASE_URL there shadow the real one in `.env.local` — which is the reverse
// of Next.js precedence and sends the script at the wrong database.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Create or promote the SaaS operator account — the one identity that can reach
 * /platform to see every tenant's subscription and record a manual payment.
 *
 * Why this exists: `create-admin.ts` cannot do it. It passes `role: "owner"` to
 * signUpEmail, but `role` is declared `input: false` on the user model, so the
 * value is dropped and the account comes out as whatever the default is. The role
 * has to be written server-side afterwards, which is what this does.
 *
 * IMPORTANT — do not point this at the email you use to run your own shop.
 * `platform_admin` sets `accessibleStoreIds = null` in requireAuth, and
 * `storeScope()` then applies NO store filter at all. Your own dashboards,
 * reports and stock lists would silently include every other tenant's rows.
 * Keep the operator identity separate from any tenant owner identity.
 *
 * Usage (from backend/):
 *   PLATFORM_ADMIN_EMAIL=ops@example.com PLATFORM_ADMIN_PASSWORD='…' \
 *     npx tsx scripts/set-platform-admin.ts
 *
 * The password is only read from the environment — it is never logged, and it is
 * only used when creating a NEW account. For an email that already exists this
 * promotes the role and leaves the existing password untouched; if that password
 * is unknown, use a different email instead.
 */
async function main() {
    const email = process.env.PLATFORM_ADMIN_EMAIL;
    const password = process.env.PLATFORM_ADMIN_PASSWORD;

    if (!email) {
        console.error("PLATFORM_ADMIN_EMAIL is required.");
        process.exit(1);
    }

    const { db } = await import("../src/db");
    const { user } = await import("../src/db/schema/users");
    const { eq } = await import("drizzle-orm");

    const [existing] = await db.select({ id: user.id, role: user.role, organizationId: user.organizationId })
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1);

    let userId = existing?.id;

    if (!existing) {
        if (!password) {
            console.error(`${email} does not exist yet, so PLATFORM_ADMIN_PASSWORD is required to create it.`);
            process.exit(1);
        }
        const { auth } = await import("../src/lib/auth");
        await auth.api.signUpEmail({
            body: { email, password, name: "Platform Operator" },
        });
        const [created] = await db.select({ id: user.id }).from(user).where(eq(user.email, email.toLowerCase())).limit(1);
        if (!created) {
            console.error("Sign-up reported success but no user row was found.");
            process.exit(1);
        }
        userId = created.id;
        console.log(`created ${email}`);
    } else {
        console.log(`${email} already exists (role: ${existing.role ?? "—"}) — promoting, password unchanged`);
    }

    // organizationId is cleared on purpose: the operator belongs to no tenant.
    // Leaving it set would make requireAuth resolve a plan and tenant for them.
    await db.update(user)
        .set({ role: "platform_admin", organizationId: null, emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, userId!));

    const [after] = await db.select({ email: user.email, role: user.role, organizationId: user.organizationId })
        .from(user)
        .where(eq(user.id, userId!))
        .limit(1);

    console.log(`\n  ${after.email}`);
    console.log(`  role           : ${after.role}`);
    console.log(`  organizationId : ${after.organizationId ?? "null (correct — belongs to no tenant)"}`);
    console.log(`\nSign in with this account, then open /platform.`);
    console.log(`Note: role changes take up to 60s to appear because of the Better-Auth session cookie cache;`);
    console.log(`sign out and back in if the console still bounces you.`);
    process.exit(0);
}

main().catch((e) => {
    console.error("Failed:", e?.message || e);
    process.exit(1);
});
