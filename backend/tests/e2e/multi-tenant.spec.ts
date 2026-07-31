/**
 * Multi-Tenant Isolation Verification Tests
 *
 * Two real tenants, each with a real signed-in owner: tenant A must never reach
 * tenant B's data. This is the gate that catches a cross-tenant leak — the kind
 * where an endpoint forgets its store filter and starts answering for every org.
 *
 * Run: npx playwright test tests/e2e/multi-tenant.spec.ts
 */

import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { transactions, inventory, customers, serviceOrders } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import { createTestTenant, cleanupTestTenant, asTenant, type TestTenant } from '../helpers/auth';

const API_URL = '/api';

test.describe('Multi-Tenant Isolation', () => {
  let tenantA: TestTenant;
  let tenantB: TestTenant;

  let txBId: string;
  let invBId: string;
  let custBId: string;
  let svcBId: string;

  test.beforeAll(async ({ request }) => {
    // Real sign-up + sign-in per tenant; see tests/helpers/auth.ts for why the
    // previous hand-rolled session rows could never work.
    tenantA = await createTestTenant(request, 'a');
    tenantB = await createTestTenant(request, 'b');

    const ts = Date.now();

    txBId = `tx-b-${ts}`;
    await db.insert(transactions).values({
      id: txBId,
      storeId: tenantB.storeId,
      transactionType: 'Penjualan',
      invoiceNumber: `INV-B-${ts}`,
      amount: 1000,
      paymentMethod: 'Tunai',
      paymentStatus: 'Lunas',
      transactionDate: new Date(),
    });

    invBId = `inv-b-${ts}`;
    await db.insert(inventory).values({
      id: invBId,
      storeId: tenantB.storeId,
      barcode: `ITEM-B-${ts}`,
      itemName: 'Laptop B',
      category: 'Laptop',
      specs: 'Test Specs',
      costPrice: 500,
      sellingPrice: 1000,
      quantity: 10,
    });

    custBId = `cust-b-${ts}`;
    await db.insert(customers).values({
      id: custBId,
      storeId: tenantB.storeId,
      name: 'Customer B',
      phone: '081234567890',
    });

    svcBId = `svc-b-${ts}`;
    await db.insert(serviceOrders).values({
      id: svcBId,
      storeId: tenantB.storeId,
      customerId: custBId,
      customerName: 'Customer B',
      deviceName: 'Device B',
      issue: 'Mati Total',
      status: 'Diterima',
    });
  });

  test.afterAll(async () => {
    await db.delete(serviceOrders).where(eq(serviceOrders.id, svcBId)).catch(() => {});
    await db.delete(customers).where(eq(customers.id, custBId)).catch(() => {});
    await db.delete(inventory).where(eq(inventory.id, invBId)).catch(() => {});
    await db.delete(transactions).where(eq(transactions.id, txBId)).catch(() => {});
    await cleanupTestTenant(tenantA);
    await cleanupTestTenant(tenantB);
  });

  test('the signed-in owner is actually authenticated', async ({ request }) => {
    // Guards the guard: if login silently broke, every isolation assertion below
    // would "pass" on 401s instead of on real tenant scoping.
    const response = await request.get(`${API_URL}/transactions`, { headers: asTenant(tenantA) });
    expect(response.status()).toBe(200);
  });

  test.describe('Tenant A should NOT access Tenant B data', () => {
    test('GET /api/transactions/[id] - cannot fetch the other tenant transaction', async ({ request }) => {
      const res = await request.get(`${API_URL}/transactions/${txBId}`, { headers: asTenant(tenantA) });
      // 404 because storeScope filters Tenant B's row out of the query entirely
      expect(res.status()).toBe(404);
    });

    test('GET /api/inventory/[id] - cannot fetch the other tenant inventory', async ({ request }) => {
      const res = await request.get(`${API_URL}/inventory/${invBId}`, { headers: asTenant(tenantA) });
      expect(res.status()).toBe(404);
    });

    test('GET /api/customers/[id] - cannot fetch the other tenant customer', async ({ request }) => {
      const res = await request.get(`${API_URL}/customers/${custBId}`, { headers: asTenant(tenantA) });
      expect(res.status()).toBe(404);
    });

    test('GET /api/services/[id] - cannot fetch the other tenant service order', async ({ request }) => {
      const res = await request.get(`${API_URL}/services/${svcBId}`, { headers: asTenant(tenantA) });
      expect(res.status()).toBe(404);
    });

    test('spoofing x-store-id with the other tenant store must not widen access', async ({ request }) => {
      // requireAuth falls back to "all" for a store id outside the caller's set, and
      // storeScope then bounds "all" to the caller's own org.
      const res = await request.get(`${API_URL}/transactions`, {
        headers: asTenant(tenantA, tenantB.storeId),
      });
      expect(res.status()).toBe(200);
      const data = await res.json();
      expect(Array.isArray(data)).toBe(true);
      expect(data.find((t: any) => t.id === txBId)).toBeUndefined();
    });
  });

  test.describe('Each tenant sees only its own data', () => {
    test('GET /api/transactions - Tenant A gets none', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, { headers: asTenant(tenantA) });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(0);
    });

    test('GET /api/transactions - Tenant B gets its own row', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, { headers: asTenant(tenantB) });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(txBId);
      expect(data[0].storeId).toBe(tenantB.storeId);
    });

    test('GET /api/user/stores - the switcher lists only the tenant own stores', async ({ request }) => {
      // Regression guard: this endpoint returned every store in the database for any
      // owner, leaking other tenants' names and addresses.
      const response = await request.get(`${API_URL}/user/stores`, { headers: asTenant(tenantA) });
      expect(response.status()).toBe(200);
      const data = await response.json();
      const ids = data.map((s: any) => s.id);
      expect(ids).toContain(tenantA.storeId);
      expect(ids).not.toContain(tenantB.storeId);
    });
  });
});
