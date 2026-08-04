import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { user, stores, organizations, transactions } from '../../src/db/schema';
import { session, account } from '../../src/db/schema/users';
import { subscriptions } from '../../src/db/schema/saas';
import { chartOfAccounts } from '../../src/db/schema/accounting';
import { eq } from 'drizzle-orm';
import { createTestTenant, cleanupTestTenant, type TestTenant } from '../helpers/auth';

test.describe('Tenant Onboarding Flow', () => {
  const testEmail = `newtenant-${Date.now()}@example.com`;
  const testStoreName = `Toko Maju Jaya ${Date.now()}`;

  // A second, unrelated shop — the one a freshly registered tenant must never see.
  let neighbour: TestTenant | undefined;
  let neighbourTxId: string | undefined;

  test.afterAll(async () => {
    if (neighbourTxId) {
      await db.delete(transactions).where(eq(transactions.id, neighbourTxId)).catch(() => {});
    }
    await cleanupTestTenant(neighbour);

    // Cleanup: Find the user, their org, and delete to keep DB clean
    const testUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, testEmail)
    });
    
    if (testUser) {
      // Better-Auth creates session + account (credential) rows that FK to user
      // without ON DELETE CASCADE — delete them first to avoid constraint errors.
      await db.delete(session).where(eq(session.userId, testUser.id)).catch(() => {});
      await db.delete(account).where(eq(account.userId, testUser.id)).catch(() => {});

      if (testUser.organizationId) {
        // Cascades to store, subscriptions, COA
        await db.delete(organizations).where(eq(organizations.id, testUser.organizationId));
      }
      await db.delete(user).where(eq(user.id, testUser.id));
    }
  });

  test('New user can register and get a fully provisioned tenant', async ({ page, request }) => {
    // 1. Visit the registration page
    await page.goto('/register?plan=starter');
    
    // Check if the plan is pre-selected
    await expect(page.locator('text=Starter — Rp69.000/bln').first()).toBeVisible();

    // 2. Fill the form
    await page.fill('input[name="storeName"]', testStoreName);
    await page.fill('input[name="name"]', 'Budi Owner');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Password123!');
    
    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirection to the app home (register-client pushes to /home on success)
    await expect(page).toHaveURL('/home', { timeout: 15000 });
    
    // 5. Verify the DB was provisioned correctly
    const user = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, testEmail)
    });
    
    expect(user).toBeDefined();
    expect(user?.role).toBe('owner');
    expect(user?.organizationId).toBeTruthy();

    const orgId = user!.organizationId!;

    const store = await db.query.stores.findFirst({
      where: (s, { eq }) => eq(s.organizationId, orgId)
    });
    
    expect(store).toBeDefined();
    expect(store?.name).toBe(testStoreName);

    const sub = await db.query.subscriptions.findFirst({
      where: (s, { eq }) => eq(s.organizationId, orgId)
    });
    
    expect(sub).toBeDefined();
    expect(sub?.planKey).toBe('starter');
    expect(sub?.status).toBe('trialing');

    const coaCount = await db.select().from(chartOfAccounts).where(eq(chartOfAccounts.storeId, store!.id));
    // Should have seeded the COA
    expect(coaCount.length).toBeGreaterThan(20);

    // 6. The whole point of selling this to other shops: a tenant that signed up
    // through the real form must be sealed off from every other shop. The
    // multi-tenant suite proves isolation for tenants built by the test helper —
    // this proves it for one that came through the actual registration path.
    neighbour = await createTestTenant(request, 'onb-neighbour');
    neighbourTxId = `tx-onb-${Date.now()}`;
    await db.insert(transactions).values({
      id: neighbourTxId,
      storeId: neighbour.storeId,
      transactionType: 'Penjualan',
      invoiceNumber: `INV-ONB-${Date.now()}`,
      amount: 999_000,
      paymentMethod: 'Tunai',
      paymentStatus: 'Lunas',
      transactionDate: new Date(),
    });

    // `page` still holds the newly registered owner's session.
    const asNewTenant = await page.request.get('/api/transactions');
    expect(asNewTenant.status()).toBe(200);
    const rows = await asNewTenant.json();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.find((t: any) => t.id === neighbourTxId)).toBeUndefined();
  });

  test('cannot self-register onto a non-public plan', async ({ request }) => {
    // register-tenant validates planKey against isPublic/priceMonthly. Without that
    // check anyone could post planKey:"internal" and grant themselves the unlimited
    // in-house plan for free — the kind of hole that only shows up once strangers
    // can reach the form.
    for (const planKey of ['internal', 'enterprise']) {
      const res = await request.post('/api/register-tenant', {
        headers: { 'Content-Type': 'application/json' },
        data: {
          name: 'Plan Probe',
          email: `plan-probe-${planKey}-${Date.now()}@example.com`,
          password: 'ProbePassw0rd!23',
          storeName: 'Probe Store',
          phone: '0800000000',
          planKey,
        },
      });
      expect(res.status(), `planKey=${planKey} must be rejected`).toBe(400);
    }
  });
});
