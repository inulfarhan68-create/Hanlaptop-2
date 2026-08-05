import type { APIRequestContext } from '@playwright/test';
import { db } from '../../src/db';
import { organizations, stores, userStoreAccess } from '../../src/db/schema';
import { subscriptions } from '../../src/db/schema/saas';
import { user, session, account } from '../../src/db/schema/users';
import { eq } from 'drizzle-orm';

/**
 * Real end-to-end authentication for the e2e suite.
 *
 * The tests used to fabricate a session by inserting a row into `session` and
 * sending the raw token as a cookie. Better-Auth v1.6 SIGNS the session cookie,
 * so an unsigned token is rejected and every request came back 401 — which is why
 * the multi-tenant suite ended up `.fixme`'d. Here we sign in for real and reuse
 * whatever cookies the server hands back, so the tests exercise the same auth path
 * a browser does (including the `session_data` cookie cache).
 *
 * Two things that are easy to trip over and are handled below:
 *  - Better-Auth rejects state-changing auth calls that arrive without an `Origin`
 *    header (403). Playwright's APIRequestContext doesn't add one, so we set it.
 *  - `role` and `organizationId` are declared `input: false` on the user model, so
 *    they cannot be set through the public sign-up endpoint. They are written
 *    server-side here, between sign-up and sign-in, exactly like the real
 *    provisioning routes do.
 */

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const PASSWORD = 'TestPassw0rd!23';

export interface TestTenant {
    orgId: string;
    storeId: string;
    userId: string;
    email: string;
    /** The plan its subscription points at — exposed so tests need not restate it. */
    planKey: string;
    /** Ready-to-send Cookie header value for this tenant's owner. */
    cookie: string;
}

/** Plan every test tenant is provisioned on. Seeded by the e2e global setup. */
const TENANT_PLAN_KEY = 'internal';

/** Collect every cookie the server set, as one `a=1; b=2` header value. */
function collectCookies(headers: { name: string; value: string }[]): string {
    return headers
        .filter((h) => h.name.toLowerCase() === 'set-cookie')
        .map((h) => h.value.split(';')[0])
        .filter(Boolean)
        .join('; ');
}

/**
 * Provision an isolated tenant (org + subscription + store + owner) and sign that
 * owner in. `seedPlans()` runs in the e2e global setup, so the `internal` plan the
 * subscription points at already exists — without an active subscription the SaaS
 * feature gates answer 402 before any isolation check is reached.
 */
export async function createTestTenant(
    request: APIRequestContext,
    label: string
): Promise<TestTenant> {
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const orgId = `org-${label}-${ts}`;
    const storeId = `store-${label}-${ts}`;
    const email = `${label}-${ts}@e2e.test`;

    await db.insert(organizations).values({ id: orgId, name: `Org ${label}` });

    const now = new Date();
    await db.insert(subscriptions).values({
        organizationId: orgId,
        planKey: TENANT_PLAN_KEY,
        status: 'active',
        currentPeriodStart: now,
        currentPeriodEnd: new Date(now.getFullYear() + 100, 0, 1),
    });

    await db.insert(stores).values({
        id: storeId,
        organizationId: orgId,
        name: `Toko ${label}`,
        address: `Alamat ${label}`,
        phone: '000',
    });

    const signUp = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
        headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
        data: { email, password: PASSWORD, name: `User ${label}` },
    });
    if (!signUp.ok()) {
        throw new Error(`sign-up failed for ${email}: ${signUp.status()} ${await signUp.text()}`);
    }

    // Look the id up rather than trusting the response shape.
    const [created] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (!created) throw new Error(`sign-up succeeded but no user row for ${email}`);
    const userId = created.id;

    // Server-side promotion — these fields are not settable via the public endpoint.
    await db.update(user)
        .set({ role: 'owner', organizationId: orgId, emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, userId));

    await db.insert(userStoreAccess).values({ userId, storeId, role: 'owner' });

    // Sign in AFTER the promotion so the session snapshot carries the owner role.
    const signIn = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
        headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
        data: { email, password: PASSWORD },
    });
    if (!signIn.ok()) {
        throw new Error(`sign-in failed for ${email}: ${signIn.status()} ${await signIn.text()}`);
    }

    const cookie = collectCookies(signIn.headersArray());
    if (!cookie.includes('session_token')) {
        throw new Error(`sign-in returned no session cookie for ${email}: "${cookie}"`);
    }

    return { orgId, storeId, userId, email, planKey: TENANT_PLAN_KEY, cookie };
}

/**
 * The same session as {@link asTenant}, but as browser cookies — for tests that
 * must load an actual page rather than call the API. Server Components do their
 * own queries, so a route can be correctly scoped while the layout rendering it
 * is not.
 */
export function tenantCookies(who: { cookie: string }, baseUrl: string = BASE_URL) {
    const { hostname } = new URL(baseUrl);
    return who.cookie.split('; ').filter(Boolean).map((pair) => {
        const eq = pair.indexOf('=');
        return {
            name: pair.slice(0, eq),
            value: pair.slice(eq + 1),
            domain: hostname,
            path: '/',
        };
    });
}

/** Request headers for this tenant, addressing one of its stores. */
export function asTenant(tenant: TestTenant, storeId?: string) {
    return {
        'x-store-id': storeId ?? tenant.storeId,
        Cookie: tenant.cookie,
    };
}

export interface TestPlatformAdmin {
    userId: string;
    email: string;
    /** Ready-to-send Cookie header value. */
    cookie: string;
}

/**
 * The platform operator: `platform_admin`, belonging to NO organization.
 *
 * That shape is deliberate and matches production (the real operator account has
 * organization_id NULL). requireAuth gives it accessibleStoreIds = null — global,
 * unrestricted — and exempts it from the read-only locks, so it is the one
 * identity that can act across tenants. Nothing else in the suite could reach the
 * platform console, which is why the manual-billing flow went untested.
 */
export async function createPlatformAdmin(request: APIRequestContext): Promise<TestPlatformAdmin> {
    const ts = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const email = `platform-admin-${ts}@e2e.test`;

    const signUp = await request.post(`${BASE_URL}/api/auth/sign-up/email`, {
        headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
        data: { email, password: PASSWORD, name: `Platform Admin ${ts}` },
    });
    if (!signUp.ok()) {
        throw new Error(`sign-up failed for ${email}: ${signUp.status()} ${await signUp.text()}`);
    }

    const [created] = await db.select({ id: user.id }).from(user).where(eq(user.email, email)).limit(1);
    if (!created) throw new Error(`sign-up succeeded but no user row for ${email}`);
    const userId = created.id;

    // `role` is input:false — it cannot come through the public sign-up endpoint.
    // organizationId stays null on purpose: an operator scoped to a tenant would
    // not be a platform admin.
    await db.update(user)
        .set({ role: 'platform_admin', organizationId: null, emailVerified: true, updatedAt: new Date() })
        .where(eq(user.id, userId));

    // Sign in AFTER the promotion so the session snapshot carries the new role.
    const signIn = await request.post(`${BASE_URL}/api/auth/sign-in/email`, {
        headers: { 'Content-Type': 'application/json', Origin: BASE_URL },
        data: { email, password: PASSWORD },
    });
    if (!signIn.ok()) {
        throw new Error(`sign-in failed for ${email}: ${signIn.status()} ${await signIn.text()}`);
    }

    const cookie = collectCookies(signIn.headersArray());
    if (!cookie.includes('session_token')) {
        throw new Error(`sign-in returned no session cookie for ${email}: "${cookie}"`);
    }

    return { userId, email, cookie };
}

/** Request headers for the platform operator. No `x-store-id`: it addresses no store. */
export function asPlatformAdmin(admin: TestPlatformAdmin) {
    return { Cookie: admin.cookie };
}

/** Remove the operator account. It owns no org, so nothing cascades. */
export async function cleanupPlatformAdmin(admin: TestPlatformAdmin | undefined) {
    if (!admin) return;
    await db.delete(session).where(eq(session.userId, admin.userId)).catch(() => {});
    await db.delete(account).where(eq(account.userId, admin.userId)).catch(() => {});
    await db.delete(user).where(eq(user.id, admin.userId)).catch(() => {});
}

/** Remove everything createTestTenant made. Org delete cascades to its stores. */
export async function cleanupTestTenant(tenant: TestTenant | undefined) {
    if (!tenant) return;
    await db.delete(session).where(eq(session.userId, tenant.userId)).catch(() => {});
    // sign-up also created a credential row; `account.userId` has no ON DELETE
    // cascade, so the user delete fails unless this goes first.
    await db.delete(account).where(eq(account.userId, tenant.userId)).catch(() => {});
    await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, tenant.userId)).catch(() => {});
    await db.delete(user).where(eq(user.id, tenant.userId)).catch(() => {});
    await db.delete(organizations).where(eq(organizations.id, tenant.orgId)).catch(() => {});
}
