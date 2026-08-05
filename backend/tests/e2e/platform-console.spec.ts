/**
 * The operator's side of manual billing, driven through the real UI.
 *
 * Billing has no payment gateway: a shop transfers money and an operator records
 * it here. That makes this console the only key to the write-lock — without it a
 * shop that has paid can be restored only by hand-editing the production
 * database. It is also the one surface no test could previously reach, because
 * every fixture in the suite was a tenant and this page is platform_admin only.
 *
 * So this drives the button rather than calling the endpoint: a working API
 * behind a form that never submits would still leave the operator stuck.
 *
 * Run: npx playwright test tests/e2e/platform-console.spec.ts
 */

import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { subscriptions, subscriptionEvents } from '../../src/db/schema/saas';
import { eq, desc } from 'drizzle-orm';
import {
    createTestTenant,
    cleanupTestTenant,
    createPlatformAdmin,
    cleanupPlatformAdmin,
    asTenant,
    asPlatformAdmin,
    tenantCookies,
    type TestTenant,
    type TestPlatformAdmin,
} from '../helpers/auth';

const API_URL = '/api';

test.describe('Platform console — manual billing', () => {
    let tenant: TestTenant;
    let admin: TestPlatformAdmin;
    const orgName = 'Org plat';

    test.beforeAll(async ({ request }) => {
        tenant = await createTestTenant(request, 'plat');
        admin = await createPlatformAdmin(request);

        // Put the tenant in the state an operator actually has to rescue: paid
        // period elapsed. Status is left alone on purpose — the gate keys off the
        // date, and /api/cron/billing may never have relabelled it.
        await db.update(subscriptions)
            .set({ currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000) })
            .where(eq(subscriptions.organizationId, tenant.orgId));
    });

    test.afterAll(async () => {
        await cleanupTestTenant(tenant);
        await cleanupPlatformAdmin(admin);
    });

    test('the tenant is locked before the operator does anything', async ({ request }) => {
        // Control: without it, the "restored" assertion later would pass against a
        // tenant that was never blocked.
        const res = await request.post(`${API_URL}/customers`, {
            headers: asTenant(tenant),
            data: { name: `Sebelum ${Date.now()}` },
        });
        expect(res.status()).toBe(403);
    });

    test('a tenant cannot reach the console at all', async ({ request }) => {
        const res = await request.get(`${API_URL}/platform/subscriptions`, { headers: asTenant(tenant) });
        // No GET handler on that route, but the point is it is never 200 for a tenant.
        expect(res.status()).not.toBe(200);
    });

    test('the console shows the tenant and flags that it is locked', async ({ page }) => {
        await page.context().addCookies(tenantCookies(admin));
        await page.goto('/platform');

        // Scoped to THIS tenant's card — asserting the warning anywhere on the page
        // would pass on some other lapsed tenant's card and prove nothing.
        const card = page.getByRole('group', { name: orgName });
        await expect(card).toBeVisible();
        await expect(card).toContainText(/read-only sampai pembayaran dicatat/i);
        await expect(card.getByRole('button', { name: `Perpanjang langganan ${orgName}` })).toBeVisible();
    });

    test('recording a payment through the form restores the shop', async ({ page, request }) => {
        await page.context().addCookies(tenantCookies(admin));
        await page.goto('/platform');

        // The operator is asked to confirm before money-backed access is granted.
        page.on('dialog', (dialog) => dialog.accept());

        await page.getByRole('button', { name: `Perpanjang langganan ${orgName}` }).click();

        const [response] = await Promise.all([
            page.waitForResponse(
                (r) => r.url().includes('/api/platform/subscriptions') && r.request().method() === 'POST'
            ),
            page.getByRole('button', { name: `Catat pembayaran ${orgName}` }).click(),
        ]);
        expect(response.status()).toBe(200);

        const [row] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, tenant.orgId));
        expect(row.status).toBe('active');
        expect(row.currentPeriodEnd.getTime()).toBeGreaterThan(Date.now());

        // The whole point of the console: the shop can save again.
        const write = await request.post(`${API_URL}/customers`, {
            headers: asTenant(tenant),
            data: { name: `Sesudah ${Date.now()}` },
        });
        expect(write.status()).toBeLessThan(300);
    });

    test('the grant is recorded with who did it', async () => {
        // Money moved outside the app, so the only trace that this tenant was given
        // paid time is what the endpoint writes here.
        const [event] = await db.select()
            .from(subscriptionEvents)
            .where(eq(subscriptionEvents.organizationId, tenant.orgId))
            .orderBy(desc(subscriptionEvents.createdAt))
            .limit(1);

        expect(event).toBeDefined();
        expect(event.type).toBe('manual_renewal');
        const payload = JSON.parse(event.payload ?? '{}');
        expect(payload.by).toBe(admin.email);
        expect(payload.months).toBe(1);
        expect(new Date(payload.newPeriodEnd).getTime()).toBeGreaterThan(Date.now());
    });

    test('the operator cannot grant an absurd duration', async ({ request }) => {
        // The duration is typed by hand; 120 instead of 12 would hand out a decade.
        const res = await request.post(`${API_URL}/platform/subscriptions`, {
            headers: asPlatformAdmin(admin),
            data: { organizationId: tenant.orgId, planKey: 'internal', months: 120 },
        });
        expect(res.status()).toBe(400);
    });

    test('an unknown organization is rejected rather than silently created', async ({ request }) => {
        const res = await request.post(`${API_URL}/platform/subscriptions`, {
            headers: asPlatformAdmin(admin),
            data: { organizationId: 'org-does-not-exist', planKey: 'internal', months: 1 },
        });
        expect(res.status()).toBe(404);
    });
});
