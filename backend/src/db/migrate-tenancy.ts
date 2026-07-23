import { db } from "./index";
import { organizations, user, userStoreAccess, stores, subscriptions } from "./schema";
import { eq, isNull } from "drizzle-orm";
import { seedPlans } from "./seed-plans";

/**
 * One-time Phase-2 tenancy backfill. Idempotent — safe to re-run.
 * Run once after applying migration 0005 (`user.organization_id`):
 *   tsx src/db/migrate-tenancy.ts
 * To also designate the SaaS operator:
 *   PLATFORM_ADMIN_EMAIL=you@example.com tsx src/db/migrate-tenancy.ts
 *
 * Does NOT convert the ~64 `storeId === "all"` query sites — that is Phase 2b
 * (swap them to `storeScope(authResult, col)` from `lib/auth-guard`) and MUST land
 * before self-serve Register (Phase 3) goes live.
 */
async function main() {
    // 0. Ensure the base plans exist (idempotent) so the subscription→plan join
    //    below — and requireFeature()/checkQuota() at runtime — can resolve.
    await seedPlans();
    console.log("Plans seeded/synced.");

    // 1. Rename the legacy default org → the flagship tenant.
    const [defaultOrg] = await db.update(organizations)
        .set({ name: "Han Laptop", updatedAt: new Date() })
        .where(eq(organizations.id, "org-default"))
        .returning({ id: organizations.id });

    // 1b. Ensure the flagship tenant has an ACTIVE subscription on the internal
    //     (unlimited) plan. Without a subscription, resolveAuthContext() leaves
    //     `plan` null and every requireFeature() route 402s Han Laptop. New tenants
    //     get their own subscription at register-time; only this backfilled org lacks one.
    if (defaultOrg) {
        const [existingSub] = await db.select({ id: subscriptions.id })
            .from(subscriptions)
            .where(eq(subscriptions.organizationId, "org-default"))
            .limit(1);
        if (!existingSub) {
            const now = new Date();
            const farFuture = new Date(now);
            farFuture.setFullYear(farFuture.getFullYear() + 100); // effectively non-expiring
            await db.insert(subscriptions).values({
                organizationId: "org-default",
                planKey: "internal",
                status: "active",
                currentPeriodStart: now,
                currentPeriodEnd: farFuture,
            });
            console.log("Created internal 'active' subscription for Han Laptop (org-default).");
        } else {
            console.log("Han Laptop already has a subscription — skipped.");
        }
    } else {
        console.log("org-default not found — skipped flagship subscription (fresh DB?).");
    }

    // 2. Backfill user.organizationId from each user's store access (their store's org).
    const usersWithoutOrg = await db.select({ id: user.id }).from(user).where(isNull(user.organizationId));
    let backfilled = 0;
    for (const u of usersWithoutOrg) {
        const [access] = await db.select({ storeId: userStoreAccess.storeId })
            .from(userStoreAccess).where(eq(userStoreAccess.userId, u.id)).limit(1);
        if (!access) continue;
        const [store] = await db.select({ orgId: stores.organizationId })
            .from(stores).where(eq(stores.id, access.storeId)).limit(1);
        if (store?.orgId) {
            await db.update(user).set({ organizationId: store.orgId }).where(eq(user.id, u.id));
            backfilled++;
        }
    }
    console.log(`Backfilled organizationId for ${backfilled} user(s).`);

    // 3. Designate the platform_admin (global SaaS operator) by email, if provided.
    const email = process.env.PLATFORM_ADMIN_EMAIL;
    if (email) {
        const res = await db.update(user)
            .set({ role: "platform_admin", organizationId: null })
            .where(eq(user.email, email)).returning({ id: user.id });
        console.log(res.length ? `Set ${email} as platform_admin.` : `No user found with email ${email}.`);
    } else {
        console.log("PLATFORM_ADMIN_EMAIL not set — skipped platform_admin designation (set it + re-run to grant).");
    }

    console.log("Tenancy backfill done.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
