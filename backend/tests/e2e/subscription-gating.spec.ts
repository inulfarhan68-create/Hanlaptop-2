/**
 * Subscription write-gating, end to end.
 *
 * The promise this feature makes is narrow and easy to get wrong in either
 * direction: a shop whose subscription has lapsed must STOP being able to save,
 * while still being able to read and export everything it owns and see how to
 * pay. A bug that locks a paying shop out of its POS mid-sale is as bad as one
 * that lets a trial run forever.
 *
 * Run: npx playwright test tests/e2e/subscription-gating.spec.ts
 */

import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { subscriptions } from '../../src/db/schema/saas';
import { eq } from 'drizzle-orm';
import { createTestTenant, cleanupTestTenant, asTenant, tenantCookies, type TestTenant } from '../helpers/auth';

const API_URL = '/api';

/** Push the tenant's paid period into the past without touching its status. */
async function expireSubscription(tenant: TestTenant) {
    await db.update(subscriptions)
        .set({ currentPeriodEnd: new Date(Date.now() - 24 * 60 * 60 * 1000) })
        .where(eq(subscriptions.organizationId, tenant.orgId));
}

async function restoreSubscription(tenant: TestTenant) {
    await db.update(subscriptions)
        .set({ currentPeriodEnd: new Date(new Date().getFullYear() + 100, 0, 1), status: 'active' })
        .where(eq(subscriptions.organizationId, tenant.orgId));
}

test.describe('Subscription gating', () => {
    let tenant: TestTenant;

    test.beforeAll(async ({ request }) => {
        // createTestTenant provisions an `active` subscription ending in 100 years.
        tenant = await createTestTenant(request, 'sub');
    });

    test.afterAll(async () => {
        await cleanupTestTenant(tenant);
    });

    test('a tenant in good standing can write', async ({ request }) => {
        // Control. Without this, every assertion below would pass just as happily
        // against a tenant that could never write for some unrelated reason.
        const res = await request.post(`${API_URL}/customers`, {
            headers: asTenant(tenant),
            data: { name: `Pelanggan Aktif ${Date.now()}` },
        });
        expect(res.status()).toBeLessThan(300);
    });

    test.describe('once the paid period has elapsed', () => {
        test.beforeAll(async () => {
            await expireSubscription(tenant);
        });

        test.afterAll(async () => {
            await restoreSubscription(tenant);
        });

        test('the status column is deliberately NOT what locks it', async () => {
            // The row still says `trialing`/`active`: /api/cron/billing is what
            // relabels it and it may never have run. The gate keys off the date,
            // so this test proves the lock does not depend on a scheduler.
            const [row] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, tenant.orgId));
            expect(['trialing', 'active']).toContain(row.status);
        });

        test('writes guarded by requireWriteAccess are refused', async ({ request }) => {
            const res = await request.post(`${API_URL}/customers`, {
                headers: asTenant(tenant),
                data: { name: `Pelanggan Ditolak ${Date.now()}` },
            });
            expect(res.status()).toBe(403);
            const body = await res.json();
            // Not "demo": a shop whose subscription ran out must not be told it is
            // in demo mode, and the machine-readable reason drives the UI.
            expect(body.reason).toBe('subscription_inactive');
            expect(body.error).not.toContain('demo');
        });

        test('writes guarded by requirePermission are refused too', async ({ request }) => {
            // A separate enforcement path from the one above — both must bite.
            const res = await request.post(`${API_URL}/inventory`, {
                headers: asTenant(tenant),
                data: {
                    itemName: `Barang Ditolak ${Date.now()}`,
                    category: 'Laptop',
                    quantity: 1,
                    costPrice: 1000,
                    sellingPrice: 2000,
                },
            });
            expect(res.status()).toBe(403);
            expect((await res.json()).reason).toBe('subscription_inactive');
        });

        test('reads still work — the shop is read-only, not locked out', async ({ request }) => {
            // The whole design: they keep their books and can still pay.
            const list = await request.get(`${API_URL}/customers`, { headers: asTenant(tenant) });
            expect(list.status()).toBe(200);

            const inventory = await request.get(`${API_URL}/inventory`, { headers: asTenant(tenant) });
            expect(inventory.status()).toBe(200);
        });

        test('the admin shell explains why saving stopped', async ({ page }) => {
            await page.context().addCookies(tenantCookies(tenant));
            await page.goto('/dashboard');

            const banner = page.getByRole('status').first();
            await expect(banner).toContainText('Langganan tidak aktif');
            await expect(banner.getByRole('link', { name: /Perpanjang/i })).toHaveAttribute('href', '/settings/billing');
        });

        test('the billing page tells the shop its data is safe and how to renew', async ({ page }) => {
            await page.context().addCookies(tenantCookies(tenant));
            await page.goto('/settings/billing');

            // The reassurance is the point: a shop that thinks it lost its books
            // panics and churns instead of paying.
            await expect(page.getByText(/tetap tersimpan/i)).toBeVisible();
            await expect(page.getByText(/Cara memperpanjang/i)).toBeVisible();
        });

        test('a tenant cannot extend its own subscription', async ({ request }) => {
            // Otherwise the entire gate is decorative.
            const res = await request.post(`${API_URL}/platform/subscriptions`, {
                headers: asTenant(tenant),
                data: { organizationId: tenant.orgId, planKey: 'internal', months: 36 },
            });
            expect(res.status()).toBe(403);

            const [row] = await db.select().from(subscriptions).where(eq(subscriptions.organizationId, tenant.orgId));
            expect(row.currentPeriodEnd.getTime()).toBeLessThan(Date.now());
        });
    });

    test('restoring the period restores write access', async ({ request }) => {
        // Runs after the nested describe's afterAll has restored the period. Proves
        // the lock releases — a gate that never reopens would strand paying shops.
        const res = await request.post(`${API_URL}/customers`, {
            headers: asTenant(tenant),
            data: { name: `Pelanggan Pulih ${Date.now()}` },
        });
        expect(res.status()).toBeLessThan(300);
    });
});
