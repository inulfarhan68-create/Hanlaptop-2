/**
 * Multi-Tenant Isolation Verification Tests
 *
 * These tests verify that Store A cannot access Store B's data.
 * Critical for SaaS security.
 *
 * Run: npx playwright test tests/e2e/multi-tenant.spec.ts
 */

import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { organizations, stores, userStoreAccess } from '../../src/db/schema';
import { user, session } from '../../src/db/schema/users';
import { transactions, inventory, customers, serviceOrders } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Configuration
const API_URL = '/api';

test.describe('Multi-Tenant Isolation', () => {
  let orgAId: string;
  let orgBId: string;
  let storeAId: string;
  let storeBId: string;
  let storeAToken: string;
  let storeBToken: string;
  let userAId: string;
  let userBId: string;

  let txBId: string;
  let invBId: string;
  let custBId: string;
  let svcBId: string;

  test.beforeAll(async () => {
    const ts = Date.now();

    // 1. Setup: Create two organizations (tenant boundary)
    orgAId = `org-a-${ts}`;
    orgBId = `org-b-${ts}`;
    await db.insert(organizations).values([
      { id: orgAId, name: 'Org A Test' },
      { id: orgBId, name: 'Org B Test' },
    ]);

    // 2. Setup: Create two stores (one per org)
    storeAId = `store-a-${ts}`;
    storeBId = `store-b-${ts}`;
    await db.insert(stores).values([
      { id: storeAId, organizationId: orgAId, name: 'Toko A Test', address: 'Alamat A', phone: '123' },
      { id: storeBId, organizationId: orgBId, name: 'Toko B Test', address: 'Alamat B', phone: '456' },
    ]);

    // 3. Setup: Create two users
    userAId = `user-a-${ts}`;
    userBId = `user-b-${ts}`;
    await db.insert(user).values([
      { id: userAId, email: `a-${ts}@test.com`, name: 'User A', role: 'owner', organizationId: orgAId, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      { id: userBId, email: `b-${ts}@test.com`, name: 'User B', role: 'owner', organizationId: orgBId, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    ]);

    // 4. Setup: Grant store access
    await db.insert(userStoreAccess).values([
      { userId: userAId, storeId: storeAId, role: 'owner' },
      { userId: userBId, storeId: storeBId, role: 'owner' },
    ]);

    // 5. Setup: Create sessions for both users (Simulate login)
    storeAToken = crypto.randomBytes(32).toString('hex');
    storeBToken = crypto.randomBytes(32).toString('hex');

    await db.insert(session).values([
      { id: storeAToken, userId: userAId, token: storeAToken, expiresAt: new Date(Date.now() + 1000000), ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date(), updatedAt: new Date() },
      { id: storeBToken, userId: userBId, token: storeBToken, expiresAt: new Date(Date.now() + 1000000), ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // 6. Setup: Create data in Store B
    txBId = `tx-b-${ts}`;
    await db.insert(transactions).values({
      id: txBId,
      storeId: storeBId,
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
      storeId: storeBId,
      itemCode: `ITEM-B-${ts}`,
      itemName: 'Laptop B',
      category: 'Laptop',
      brand: 'Test',
      costPrice: 500,
      sellingPrice: 1000,
      quantity: 10,
    });

    custBId = `cust-b-${ts}`;
    await db.insert(customers).values({
      id: custBId,
      storeId: storeBId,
      name: 'Customer B',
      phone: '081234567890',
    });

    svcBId = `svc-b-${ts}`;
    await db.insert(serviceOrders).values({
      id: svcBId,
      storeId: storeBId,
      customerId: custBId,
      serviceNumber: `SVC-B-${ts}`,
      deviceName: 'Device B',
      issue: 'Mati Total',
      status: 'Antrian',
    });

  });

  test.afterAll(async () => {
    // Cleanup in reverse-dependency order
    await db.delete(serviceOrders).where(eq(serviceOrders.id, svcBId)).catch(() => {});
    await db.delete(customers).where(eq(customers.id, custBId)).catch(() => {});
    await db.delete(inventory).where(eq(inventory.id, invBId)).catch(() => {});
    await db.delete(transactions).where(eq(transactions.id, txBId)).catch(() => {});
    await db.delete(session).where(eq(session.id, storeAToken)).catch(() => {});
    await db.delete(session).where(eq(session.id, storeBToken)).catch(() => {});
    await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, userAId)).catch(() => {});
    await db.delete(userStoreAccess).where(eq(userStoreAccess.userId, userBId)).catch(() => {});
    await db.delete(user).where(eq(user.id, userAId)).catch(() => {});
    await db.delete(user).where(eq(user.id, userBId)).catch(() => {});
    // Cascading delete: deleting org cascades to stores
    await db.delete(organizations).where(eq(organizations.id, orgAId)).catch(() => {});
    await db.delete(organizations).where(eq(organizations.id, orgBId)).catch(() => {});
  });

  test.describe('Store A should NOT access Store B data', () => {
    test('GET /api/transactions/[id] - Store A cannot fetch Store B transaction', async ({ request }) => {
      const storeAAccess = await request.get(`${API_URL}/transactions/${txBId}`, {
        headers: {
          'x-store-id': storeAId,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });
      // 404 because storeScope filters out Store B's transaction
      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/inventory/[id] - Store A cannot fetch Store B inventory', async ({ request }) => {
      const storeAAccess = await request.get(`${API_URL}/inventory/${invBId}`, {
        headers: {
          'x-store-id': storeAId,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });
      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/customers/[id] - Store A cannot fetch Store B customer', async ({ request }) => {
      const storeAAccess = await request.get(`${API_URL}/customers/${custBId}`, {
        headers: {
          'x-store-id': storeAId,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });
      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/services/[id] - Store A cannot fetch Store B service order', async ({ request }) => {
      const storeAAccess = await request.get(`${API_URL}/services/${svcBId}`, {
        headers: {
          'x-store-id': storeAId,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });
      expect(storeAAccess.status()).toBe(404);
    });
  });

  test.describe('Store should only see their own data', () => {
    test('GET /api/transactions - Store A only gets Store A transactions (Empty)', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, {
        headers: {
          'x-store-id': storeAId,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(0); // Store A has no transactions
    });

    test('GET /api/transactions - Store B only gets Store B transactions (1 item)', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, {
        headers: {
          'x-store-id': storeBId,
          'Cookie': `better-auth.session_token=${storeBToken}`,
        },
      });
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(txBId);
      expect(data[0].storeId).toBe(storeBId);
    });
  });
});
