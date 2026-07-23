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
import { stores, user, session, transactions, inventory, customers, serviceOrders } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

// Configuration
const API_URL = '/api';

test.describe('Multi-Tenant Isolation', () => {
  let storeAId: string;
  let storeBId: string;
  let storeAToken: string;
  let storeBToken: string;

  let txBId: string;
  let invBId: string;
  let custBId: string;
  let svcBId: string;

  test.beforeAll(async () => {
    // 1. Setup: Create two stores
    storeAId = `store-a-${Date.now()}`;
    storeBId = `store-b-${Date.now()}`;

    await db.insert(stores).values([
      { id: storeAId, name: 'Toko A Test', address: 'Alamat A', phone: '123' },
      { id: storeBId, name: 'Toko B Test', address: 'Alamat B', phone: '456' },
    ]);

    // 2. Setup: Create two users
    const userAId = `user-a-${Date.now()}`;
    const userBId = `user-b-${Date.now()}`;

    await db.insert(user).values([
      { id: userAId, email: `a-${Date.now()}@test.com`, name: 'User A', role: 'admin', storeId: storeAId, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
      { id: userBId, email: `b-${Date.now()}@test.com`, name: 'User B', role: 'admin', storeId: storeBId, emailVerified: true, createdAt: new Date(), updatedAt: new Date() },
    ]);

    // 3. Setup: Create sessions for both users (Simulate login)
    storeAToken = crypto.randomBytes(32).toString('hex');
    storeBToken = crypto.randomBytes(32).toString('hex');

    await db.insert(session).values([
      { id: storeAToken, userId: userAId, token: storeAToken, expiresAt: new Date(Date.now() + 1000000), ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date(), updatedAt: new Date() },
      { id: storeBToken, userId: userBId, token: storeBToken, expiresAt: new Date(Date.now() + 1000000), ipAddress: '127.0.0.1', userAgent: 'test', createdAt: new Date(), updatedAt: new Date() },
    ]);

    // 4. Setup: Create data in Store B
    txBId = `tx-b-${Date.now()}`;
    await db.insert(transactions).values({
      id: txBId,
      storeId: storeBId,
      transactionType: 'Penjualan',
      invoiceNumber: `INV-B-${Date.now()}`,
      amount: 1000,
      paymentMethod: 'Tunai',
      paymentStatus: 'Lunas',
      transactionDate: new Date(),
    });

    invBId = `inv-b-${Date.now()}`;
    await db.insert(inventory).values({
      id: invBId,
      storeId: storeBId,
      itemCode: `ITEM-B-${Date.now()}`,
      itemName: 'Laptop B',
      category: 'Laptop',
      brand: 'Test',
      costPrice: 500,
      sellingPrice: 1000,
      quantity: 10,
    });

    custBId = `cust-b-${Date.now()}`;
    await db.insert(customers).values({
      id: custBId,
      storeId: storeBId,
      name: 'Customer B',
      phone: '081234567890',
    });

    svcBId = `svc-b-${Date.now()}`;
    await db.insert(serviceOrders).values({
      id: svcBId,
      storeId: storeBId,
      customerId: custBId,
      serviceNumber: `SVC-B-${Date.now()}`,
      deviceName: 'Device B',
      issue: 'Mati Total',
      status: 'Antrian',
    });

  });

  test.afterAll(async () => {
    // Cleanup to keep DB clean
    await db.delete(serviceOrders).where(eq(serviceOrders.id, svcBId));
    await db.delete(customers).where(eq(customers.id, custBId));
    await db.delete(inventory).where(eq(inventory.id, invBId));
    await db.delete(transactions).where(eq(transactions.id, txBId));
    await db.delete(session).where(eq(session.id, storeAToken));
    await db.delete(session).where(eq(session.id, storeBToken));
    await db.delete(user).where(eq(user.storeId, storeAId));
    await db.delete(user).where(eq(user.storeId, storeBId));
    await db.delete(stores).where(eq(stores.id, storeAId));
    await db.delete(stores).where(eq(stores.id, storeBId));
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
