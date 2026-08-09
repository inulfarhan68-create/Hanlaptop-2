import * as path from "path";
import * as dotenv from "dotenv";

// dotenv first, `db` imported dynamically below — src/db reads DATABASE_URL at
// module scope and ESM evaluates every static import before this file's body.
// Same shape as sync-plans.ts and set-platform-admin.ts.
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

/**
 * Check that a newly registered tenant came out whole. READ-ONLY.
 *
 * `register-tenant` writes an organization, a store, a subscription, a user, a
 * store-access grant and a full chart of accounts across two steps with two
 * compensating rollbacks between them. Nobody has ever walked that path from
 * outside, and its failure modes are quiet: a shop that signs up and lands on a
 * dashboard can still be missing its COA (no reports will balance), its store
 * grant (every page empty), or its subscription (locked out in 14 days for no
 * reason it can see).
 *
 * This reads every one of those and says which is missing. It writes nothing,
 * and it prints — but never runs — the SQL that would remove a test tenant.
 *
 *   cd backend && npx tsx scripts/verify-tenant.ts <email | organizationId>
 */
type Check = { label: string; ok: boolean; detail: string };

async function main() {
    const needle = process.argv[2];
    if (!needle) {
        console.error("Usage: npx tsx scripts/verify-tenant.ts <email | organizationId>");
        process.exit(1);
    }

    const { db } = await import("../src/db");
    const { organizations, stores, storeSettings, userStoreAccess, user, inventory, transactions } =
        await import("../src/db/schema");
    const { chartOfAccounts, fiscalPeriods } = await import("../src/db/schema/accounting");
    // Taken from the seed itself, not written down here: a hard-coded number
    // silently becomes a false alarm the day an account is added. It already did
    // once — 79 was the count of every `code:` in the file, including the SaaS
    // internal accounts a tenant never gets.
    const { DEFAULT_COA_ACCOUNTS } = await import("../src/db/seed-coa");
    const expectedCoaPerStore = DEFAULT_COA_ACCOUNTS.length;
    const { subscriptions, plans } = await import("../src/db/schema/saas");
    const { eq, inArray, sql } = await import("drizzle-orm");

    // Find the tenant by either handle — an operator has the email from the
    // signup form, and the id only after something has already gone right.
    const [byId] = await db.select().from(organizations).where(eq(organizations.id, needle)).limit(1);
    let org = byId;
    let owner: { id: string; email: string; role: string | null; organizationId: string | null } | undefined;

    if (!org) {
        const [u] = await db
            .select({ id: user.id, email: user.email, role: user.role, organizationId: user.organizationId })
            .from(user)
            .where(eq(user.email, needle.toLowerCase()))
            .limit(1);
        owner = u;
        if (!u?.organizationId) {
            console.error(
                u
                    ? `FOUND the user ${u.email}, but it has no organizationId — registration half-completed.`
                    : `No organization or user matches "${needle}".`
            );
            process.exit(1);
        }
        [org] = await db.select().from(organizations).where(eq(organizations.id, u.organizationId)).limit(1);
    }

    if (!org) {
        console.error(`No organization found for "${needle}".`);
        process.exit(1);
    }

    const orgStores = await db.select().from(stores).where(eq(stores.organizationId, org.id));
    const storeIds = orgStores.map((s) => s.id);

    const owners = await db
        .select({ id: user.id, email: user.email, role: user.role, organizationId: user.organizationId })
        .from(user)
        .where(eq(user.organizationId, org.id));
    owner = owner ?? owners[0];

    const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, org.id)).limit(1);
    const [plan] = sub
        ? await db.select().from(plans).where(eq(plans.key, sub.planKey)).limit(1)
        : [];

    const count = async (table: any, col: any) =>
        storeIds.length === 0
            ? 0
            : Number(
                  (await db.select({ n: sql<number>`count(*)::int` }).from(table).where(inArray(col, storeIds)))[0]?.n ?? 0
              );

    const [grants, coa, periods, settingsRows, invCount, txCount] = await Promise.all([
        storeIds.length
            ? db.select().from(userStoreAccess).where(inArray(userStoreAccess.storeId, storeIds))
            : Promise.resolve([]),
        count(chartOfAccounts, chartOfAccounts.storeId),
        count(fiscalPeriods, fiscalPeriods.storeId),
        storeIds.length
            ? db.select().from(storeSettings).where(inArray(storeSettings.storeId, storeIds))
            : Promise.resolve([]),
        count(inventory, inventory.storeId),
        count(transactions, transactions.storeId),
    ]);

    const now = Date.now();
    const daysLeft = sub ? Math.round((sub.currentPeriodEnd.getTime() - now) / 86_400_000) : 0;

    const checks: Check[] = [
        { label: "Organization", ok: true, detail: `${org.name} (${org.id})${org.isDemo ? " — DEMO" : ""}` },
        { label: "Store", ok: orgStores.length > 0, detail: orgStores.map((s) => s.name).join(", ") || "none" },
        {
            label: "Owner account",
            ok: Boolean(owner && owner.role === "owner" && owner.organizationId === org.id),
            detail: owner ? `${owner.email} role=${owner.role}` : "no user carries this organizationId",
        },
        {
            // Without a grant every page filters to an empty set — the shop logs
            // in successfully and sees nothing, which reads as data loss.
            label: "Store access grant",
            ok: grants.length >= storeIds.length && storeIds.length > 0,
            detail: `${grants.length} grant(s) for ${storeIds.length} store(s)`,
        },
        {
            label: "Subscription",
            ok: Boolean(sub) && daysLeft > 0,
            detail: sub
                ? `${sub.planKey} · ${sub.status} · ${daysLeft} day(s) left${plan?.isPublic === false ? " · NON-PUBLIC PLAN" : ""}`
                : "none — this shop will be read-only immediately",
        },
        {
            // A short count means the COA seed ran partially, and every report
            // will then be wrong rather than merely empty.
            label: "Chart of accounts",
            ok: coa >= expectedCoaPerStore * Math.max(storeIds.length, 1),
            detail: `${coa} account(s) across ${storeIds.length} store(s) — expected ${expectedCoaPerStore * Math.max(storeIds.length, 1)}`,
        },
        { label: "Fiscal period", ok: periods > 0, detail: `${periods} period(s)` },
        {
            // Not a failure: registration deliberately writes no settings row, and
            // the nota falls back to the store row. Reported because it is the
            // first onboarding step the shop will be asked to complete.
            label: "Store settings row",
            ok: true,
            detail: settingsRows.length ? `${settingsRows.length} row(s)` : "none yet (nota falls back to the store row)",
        },
        { label: "Usage", ok: true, detail: `${invCount} item(s), ${txCount} transaction(s)` },
    ];

    console.log(`\nTenant check — ${org.name}\n`);
    let failed = 0;
    for (const c of checks) {
        if (!c.ok) failed++;
        console.log(`  ${c.ok ? "PASS" : "FAIL"}  ${c.label.padEnd(20)} ${c.detail}`);
    }

    console.log(
        failed === 0
            ? "\nAll checks passed — this tenant is fully provisioned.\n"
            : `\n${failed} check(s) FAILED — registration did not complete cleanly.\n`
    );

    // Printed, never executed. Deleting a tenant is destructive and belongs to a
    // human: the org cascade takes the store, subscription and COA with it, but
    // the user rows are not cascaded and must go last, in this order, or the
    // email stays claimed by an account with no shop.
    if (!org.isDemo) {
        console.log("If this was a throwaway test tenant, remove it with (review first, run yourself):\n");
        console.log(`  DELETE FROM session WHERE user_id IN (SELECT id FROM "user" WHERE organization_id = '${org.id}');`);
        console.log(`  DELETE FROM account WHERE user_id IN (SELECT id FROM "user" WHERE organization_id = '${org.id}');`);
        console.log(`  DELETE FROM "user" WHERE organization_id = '${org.id}';`);
        console.log(`  DELETE FROM organizations WHERE id = '${org.id}';\n`);
    }

    process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
    console.error("verify-tenant failed:", e.message);
    process.exit(1);
});
