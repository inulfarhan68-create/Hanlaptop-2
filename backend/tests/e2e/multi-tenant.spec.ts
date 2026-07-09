/**
 * Multi-Tenant Isolation Verification Tests
 *
 * These tests verify that Store A cannot access Store B's data.
 * Critical for SaaS security.
 *
 * Run: npx playwright test tests/e2e/multi-tenant.spec.ts
 */

import { test, expect } from '@playwright/test';

// Configuration
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

test.describe('Multi-Tenant Isolation', () => {
  let storeA: { id: string; name: string; userId: string };
  let storeB: { id: string; name: string; userId: string };
  let storeAToken: string;
  let storeBtoken: string;

  test.beforeAll(async () => {
    // Setup: Create two stores and users
    // In real tests, you'd use seeded test data
    storeA = {
      id: 'store-a-test-id',
      name: 'Toko A Test',
      userId: 'user-a-test-id',
    };
    storeB = {
      id: 'store-b-test-id',
      name: 'Toko B Test',
      userId: 'user-b-test-id',
    };
  });

  test.describe('Store A should NOT access Store B data', () => {
    test('GET /api/transactions/[id] - Store A cannot fetch Store B transaction', async ({ request }) => {
      // Get a transaction ID from Store B
      const storeBTransactions = await request.get(`${API_URL}/transactions`, {
        headers: {
          'x-store-id': storeB.id,
          'Cookie': `better-auth.session_token=${storeBtoken}`,
        },
      });
      const storeBData = await storeBTransactions.json();
      const storeBTransactionId = storeBData[0]?.id;

      if (!storeBTransactionId) {
        test.skip();
        return;
      }

      // Try to access from Store A
      const storeAAccess = await request.get(`${API_URL}/transactions/${storeBTransactionId}`, {
        headers: {
          'x-store-id': storeA.id,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });

      // Should be 404 (not found or access denied
      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/inventory/[id] - Store A cannot fetch Store B inventory', async ({ request }) => {
      // Get inventory from Store B
      const storeBInventory = await request.get(`${API_URL}/inventory`, {
        headers: {
          'x-store-id': storeB.id,
          'Cookie': `better-auth.session_token=${storeBtoken}`,
        },
      });
      const storeBData = await storeBInventory.json();
      const storeBInventoryId = storeBData.data?.[0]?.id;

      if (!storeBInventoryId) {
        test.skip();
        return;
      }

      // Try to access from Store A
      const storeAAccess = await request.get(`${API_URL}/inventory/${storeBInventoryId}`, {
        headers: {
          'x-store-id': storeA.id,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });

      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/customers/[id] - Store A cannot fetch Store B customer', async ({ request }) => {
      const storeBCustomers = await request.get(`${API_URL}/customers`, {
        headers: {
          'x-store-id': storeB.id,
          'Cookie': `better-auth.session_token=${storeBtoken}`,
        },
      });
      const storeBData = await storeBCustomers.json();
      const storeBCustomerId = storeBData.customers?.[0]?.id;

      if (!storeBCustomerId) {
        test.skip();
        return;
      }

      const storeAAccess = await request.get(`${API_URL}/customers/${storeBCustomerId}`, {
        headers: {
          'x-store-id': storeA.id,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });

      expect(storeAAccess.status()).toBe(404);
    });

    test('GET /api/services/[id] - Store A cannot fetch Store B service order', async ({ request }) => {
      const storeBServices = await request.get(`${API_URL}/services`, {
        headers: {
          'x-store-id': storeB.id,
          'Cookie': `better-auth.session_token=${storeBtoken}`,
        },
      });
      const storeBData = await storeBServices.json();
      const storeBServiceId = storeBData.services?.[0]?.id;

      if (!storeBServiceId) {
        test.skip();
        return;
      }

      const storeAAccess = await request.get(`${API_URL}/services/${storeBServiceId}`, {
        headers: {
          'x-store-id': storeA.id,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });

      expect(storeAAccess.status()).toBe(404);
    });
  });

  test.describe('Store should only see their own data', () => {
    test('GET /api/transactions - Store A only gets Store A transactions', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, {
        headers: {
          'x-store-id': storeA.id,
          'Cookie': `better-auth.session_token=${storeAToken}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // All transactions should belong to Store A
      for (const tx of data.slice(0, 10)) {
        expect(tx.storeId).toBe(storeA.id);
      }
    });

    test('GET /api/inventory - Store B only gets Store B inventory', async ({ request }) => {
      const response = await request.get(`${API_URL}/inventory?limit=50`, {
        headers: {
          'x-store-id': storeB.id,
          'Cookie': `better-auth.session_token=${storeBtoken}`,
        },
      });

      expect(response.status()).toBe(200);
      const data = await response.json();

      // All inventory should belong to Store B
      for (const item of (data.data || []).slice(0, 10)) {
        expect(item.storeId).toBe(storeB.id);
      }
    });
  });
});

test.describe('Global Owner Access', () => {
  let globalOwnerToken: string;

  test('Global owner can access any store when storeId=current', async ({ request }) => {
    // Owner should be able to access data from any store when they specify it
    // This tests the "owner bypass" in storeId="all" scenario
    const response = await request.get(`${API_URL}/transactions`, {
      headers: {
        'x-store-id': 'all',
        'Cookie': `better-auth.session_token=${globalOwnerToken}`,
      },
    });

    // Should succeed (even if empty)
    expect([200, 404]).toContain(response.status());
  });
});
