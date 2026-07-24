import { db } from "./index";
import { organizations, stores, userStoreAccess, user, subscriptions } from "./schema";
import { seedStoreCoa } from "./seed-coa";
import { seedPlans } from "./seed-plans";
import { seedDemoData } from "../services/DemoSeeder";
import { auth } from "../lib/auth";
import { eq } from "drizzle-orm";

/**
 * Provisions the public read-only demo tenant that the "Coba demo" button
 * (`/api/demo/login`) signs visitors into. Idempotent — bails if the demo org
 * already exists.
 *
 * Run once (operator), after migration 0008 (`organizations.is_demo`):
 *   DEMO_LOGIN_EMAIL=demo@hanlaptop.app DEMO_LOGIN_PASSWORD=... tsx src/db/seed-demo-tenant.ts
 *
 * The credentials MUST match the ones the login route reads from env. The account
 * is deliberately low-privilege: role `investor` (read-only via RBAC) in an org with
 * `isDemo = true` (hard write-lock). Even with a valid session it cannot mutate data
 * or see any other tenant (storeScope confines it to the demo store).
 */
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

    // Idempotent: if the demo org already exists, do nothing (avoids duplicate sample data).
    const [existingOrg] = await db
        .select({ id: organizations.id })
        .from(organizations)
        .where(eq(organizations.id, orgId))
        .limit(1);
    if (existingOrg) {
        console.log(`Demo tenant '${orgId}' already exists — nothing to do.`);
        return;
    }

    // Ensure the internal (unlimited) plan exists so the demo showcases every feature
    // and requireFeature() never 402s it.
    await seedPlans();

    // 1. Org (isDemo) + store + active internal subscription + COA — atomic.
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

    // 2. Demo user via Better-Auth (hashes the password compatibly with sign-in),
    //    then lock it to investor + the demo org (role/organizationId are input:false).
    let userId: string;
    const [existingUser] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.email, email.toLowerCase()))
        .limit(1);
    if (existingUser) {
        userId = existingUser.id;
        console.log("Demo user already existed — reusing.");
    } else {
        const res = await auth.api.signUpEmail({
            body: { email, password, name: demoName },
            headers: new Headers(),
        });
        if (!res?.user?.id) throw new Error("Failed to create the demo user via Better-Auth");
        userId = res.user.id;
    }
    await db.update(user).set({ role: "investor", organizationId: orgId }).where(eq(user.id, userId));
    await db.insert(userStoreAccess).values({ userId, storeId, role: "investor" });

    // 3. Populate sample data so the demo has something to browse.
    await seedDemoData(storeId, userId);

    console.log(`Demo tenant seeded: org=${orgId}, store=${storeId}, user=${email} (investor, read-only).`);
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
