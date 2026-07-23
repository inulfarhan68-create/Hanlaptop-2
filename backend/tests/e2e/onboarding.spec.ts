import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { user, stores, organizations } from '../../src/db/schema';
import { subscriptions } from '../../src/db/schema/saas';
import { chartOfAccounts } from '../../src/db/schema/accounting';
import { eq } from 'drizzle-orm';

test.describe('Tenant Onboarding Flow', () => {
  const testEmail = `newtenant-${Date.now()}@example.com`;
  const testStoreName = `Toko Maju Jaya ${Date.now()}`;

  test.afterAll(async () => {
    // Cleanup: Find the user, their org, and delete to keep DB clean
    const testUser = await db.query.user.findFirst({
      where: (u, { eq }) => eq(u.email, testEmail)
    });
    
    if (testUser && testUser.organizationId) {
      // Cascades to store, subscriptions, COA
      await db.delete(organizations).where(eq(organizations.id, testUser.organizationId));
      await db.delete(user).where(eq(user.id, testUser.id));
    }
  });

  test('New user can register and get a fully provisioned tenant', async ({ page }) => {
    // 1. Visit the registration page
    await page.goto('/register?plan=starter');
    
    // Check if the plan is pre-selected
    await expect(page.locator('text=Starter — Rp69.000/bln')).toBeVisible();

    // 2. Fill the form
    await page.fill('input[name="storeName"]', testStoreName);
    await page.fill('input[name="name"]', 'Budi Owner');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', 'Password123!');
    
    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify redirection to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    
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
  });
});
