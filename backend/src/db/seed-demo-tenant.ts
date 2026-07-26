import { db } from "./index";
import { organizations, stores, userStoreAccess, user, subscriptions } from "./schema";
import { seedStoreCoa } from "./seed-coa";
import { seedPlans } from "./seed-plans";
import { seedDemoData } from "../services/DemoSeeder";
import { auth } from "../lib/auth";
import { and, eq } from "drizzle-orm";

/**
 * Provisions the public read-only demo tenant that the "Coba demo" button
 * (`/api/demo/login`) signs visitors into.
 *
 * Run (operator), after migration 0008 (`organizations.is_demo`):
 *   DEMO_LOGIN_EMAIL=demo@hanlaptop.app DEMO_LOGIN_PASSWORD=... tsx src/db/seed-demo-tenant.ts
 *
 * The credentials MUST match the ones the login route reads from env. The demo user
 * carries the `manager` role for a rich operational tour (inventory, POS, servis,
 * laporan, payroll, …) — but every mutation is blocked because its org has
 * `isDemo = true` (requirePermission blocks write-perms centrally; requireWritable /
 * requireWriteAccess block the rest). It also can't see any other tenant (storeScope
 * confines it to the demo store).
 *
 * Idempotent: re-running syncs the demo user's role (so an earlier investor-role
 * demo is upgraded to manager) without duplicating the sample data.
 */
const DEMO_ROLE = "manager";

async function main() {
    const orgId = process.env.DEMO_ORGANIZATION_ID || "org-demo";
    const storeId = process.env.DEMO_STORE_ID || "store-demo";
    const email = process.env.DEMO_LOGIN_EMAIL;
    const password = process.env.DEMO_LOGIN_PASSWORD;
    const demoName = "Demo Han Laptop";

    if (!email || !password) {
        console.error(
            "DEMO_LOGIN_EMAIL and DEMO_LOGIN_PASSWORD must be set — they must match the values /api/demo/login reads from env."
        );
        process.exit(1);
    }

    // Find-or-create the demo user, then (idempotently) pin it to the demo org + role.
    // role/organizationId are input:false at sign-up, so they're set server-side here.
    async function ensureDemoUser(): Promise<string> {
        const [existing] = await db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, email!.toLowerCase()))
            .limit(1);

        let userId: string;
        if (existing) {
            userId = existing.id;
        } else {
            const res = await auth.api.signUpEmail({
                body: { email: email!, password: password!, name: demoName },
                headers: new Headers(),
            });
            if (!res?.user?.id) throw new Error("Failed to create the demo user via Better-Auth");
            userId = res.user.id;
        }

        await db.update(user).set({ role: DEMO_ROLE, organizationId: orgId }).where(eq(user.id, userId));

        const [access] = await db
            .select({ id: userStoreAccess.id })
            .from(userStoreAccess)
            .where(and(eq(userStoreAccess.userId, userId), eq(userStoreAccess.storeId, storeId)))
            .limit(1);
        if (access) {
            await db.update(userStoreAccess).set({ role: DEMO_ROLE }).where(eq(userStoreAccess.id, access.id));
        } else {
            await db.insert(userStoreAccess).values({ userId, storeId, role: DEMO_ROLE });
        }
        return userId;
    }

    // If the demo org already exists, just sync the demo user's role (upgrade path)
    // and stop — don't duplicate the sample data.
    const [existingOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
    if (existingOrg) {
        if (process.env.DEMO_RESEED === "1") {
            // Rebuild the demo's sample content WITHOUT touching the org/user/subscription:
            // delete the demo store (cascades all its data + userStoreAccess), recreate it,
            // reseed the COA, re-grant the demo user's access, and repopulate sample data.
            // Use this when an earlier seed only half-completed.
            console.log("DEMO_RESEED=1 → rebuilding demo store sample data…");
            await seedPlans();
            await db.delete(stores).where(eq(stores.id, storeId));
            await db.transaction(async (tx) => {
                await tx.insert(stores).values({
                    id: storeId,
                    organizationId: orgId,
                    name: "Demo Han Laptop (Read-only)",
                });
                await seedStoreCoa(storeId, { tx });
            });
            const reseedUserId = await ensureDemoUser();
            await seedDemoData(storeId, reseedUserId);
            console.log("Demo sample data rebuilt.");
            return;
        }
        await ensureDemoUser();
        console.log(`Demo tenant '${orgId}' already exists — synced demo user to role '${DEMO_ROLE}'. (Set DEMO_RESEED=1 to rebuild sample data.)`);
        return;
    }

    // Fresh provisioning: internal plan, org (isDemo) + store + subscription + COA.
    await seedPlans();
    await db.transaction(async (tx) => {
        await tx.insert(organizations).values({ id: orgId, name: demoName, isDemo: true });
        await tx.insert(stores).values({
            id: storeId,
            organizationId: orgId,
            name: "Demo Han Laptop (Read-only)",
        });
        const now = new Date();
        const farFuture = new Date(now);
        farFuture.setFullYear(farFuture.getFullYear() + 100); // effectively non-expiring
        await tx.insert(subscriptions).values({
            organizationId: orgId,
            planKey: "internal",
            status: "active",
            currentPeriodStart: now,
            currentPeriodEnd: farFuture,
        });
        await seedStoreCoa(storeId, { tx });
    });

    const userId = await ensureDemoUser();
    await seedDemoData(storeId, userId);

    console.log(`Demo tenant seeded: org=${orgId}, store=${storeId}, user=${email} (${DEMO_ROLE}, read-only via isDemo).`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
