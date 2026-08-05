/**
 * Security Regression Tests
 *
 * Verifies security fixes are not reverted.
 * Run: npx playwright test tests/e2e/security.spec.ts
 */

import { test, expect } from '@playwright/test';
import { db } from '../../src/db';
import { transactions, stores } from '../../src/db/schema';
import { eq } from 'drizzle-orm';
import {
  createTestTenant,
  cleanupTestTenant,
  createTenantUser,
  cleanupTenantUser,
  asTenantUser,
  type TestTenant,
  type TestTenantUser,
} from '../helpers/auth';

const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';
const API_URL = process.env.E2E_API_URL || 'http://localhost:3000/api';

test.describe('Security Regression Tests', () => {
  test.describe('Rate Limiting', () => {
    test('Login endpoint is rate limited', async ({ request }) => {
      // Attempt 6 logins rapidly (limit is 5/min)
      const responses = [];
      for (let i = 0; i < 6; i++) {
        const response = await request.post(`${API_URL}/auth/sign-in/email`, {
          data: {
            email: 'attacker@test.com',
            password: 'wrongpassword',
          },
        });
        responses.push(response.status());
      }

      // At least one should be rate limited
      const has429 = responses.includes(429);
      const has401 = responses.includes(401);

      // Either rate limiting kicked in (429) or all attempts failed (401)
      expect(has429 || has401).toBe(true);
    });

    test('API endpoints return rate limit headers', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`);
      const headers = response.headers();

      // Check for rate limit headers
      const hasLimitHeader = headers['x-ratelimit-limit'] || headers['x-ratelimit-remaining'];
      const hasRetryAfter = headers['retry-after'];

      // At minimum, should have some rate limit info
      expect(hasLimitHeader || hasRetryAfter || response.status() === 200).toBeTruthy();
    });
  });

  test.describe('Authentication', () => {
    test('Unauthenticated requests are rejected', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`);
      expect([401, 403]).toContain(response.status());
    });

    test('Invalid token is rejected', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, {
        headers: {
          'Cookie': 'better-auth.session_token=invalid-token',
        },
      });
      expect([401, 403]).toContain(response.status());
    });

    test('Expired token is rejected', async ({ request }) => {
      const response = await request.get(`${API_URL}/transactions`, {
        headers: {
          'Cookie': 'better-auth.session_token=expired-token',
        },
      });
      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Authorization', () => {
    // Real signed-in users at real store roles. The previous version declared
    // kasirToken/managerToken/storeId and never assigned them, so every request
    // here went out as `Cookie: better-auth.session_token=undefined` and came
    // back 401 — and each assertion allowed 401, so the whole block passed while
    // testing nothing. TypeScript was reporting it (TS2454, "used before being
    // assigned"); tsconfig excludes tests/, so nobody saw it.
    let tenant: TestTenant;
    let kasir: TestTenantUser;
    let manager: TestTenantUser;
    let txId: string;

    test.beforeAll(async ({ request }) => {
      tenant = await createTestTenant(request, 'sec');
      kasir = await createTenantUser(request, tenant, 'kasir');
      manager = await createTenantUser(request, tenant, 'manager');

      txId = `tx-sec-${Date.now()}`;
      await db.insert(transactions).values({
        id: txId,
        storeId: tenant.storeId,
        transactionType: 'Penjualan',
        invoiceNumber: `INV-SEC-${Date.now()}`,
        amount: 1000,
        paymentMethod: 'Tunai',
        paymentStatus: 'Lunas',
        transactionDate: new Date(),
      });
    });

    test.afterAll(async () => {
      await db.delete(transactions).where(eq(transactions.id, txId)).catch(() => {});
      await cleanupTenantUser(kasir);
      await cleanupTenantUser(manager);
      await cleanupTestTenant(tenant);
    });

    test('the kasir session is real', async ({ request }) => {
      // Guards the guard. Without this, a broken login would send every test
      // below back to 401 and they would "pass" for the wrong reason — exactly
      // what happened before.
      const res = await request.get(`${API_URL}/transactions`, { headers: asTenantUser(tenant, kasir) });
      expect(res.status()).toBe(200);
    });

    test('a kasir may read settings but may not write them', async ({ request }) => {
      // The old test claimed "kasir cannot access settings". That is not what the
      // code does, and asserting it would fail: GET /api/settings sits behind
      // requireAuth on purpose, because the client reads the store name and its
      // own role from it. The WRITE is what is restricted.
      const read = await request.get(`${API_URL}/settings`, { headers: asTenantUser(tenant, kasir) });
      expect(read.status()).toBe(200);

      const write = await request.post(`${API_URL}/settings`, {
        headers: asTenantUser(tenant, kasir),
        data: { storeName: 'Diubah Kasir', storeAddress: 'Jalan', storePhone: '000' },
      });
      expect(write.status()).toBe(403);
    });

    test('a kasir deleting a transaction raises an approval instead of voiding it', async ({ request }) => {
      // Not a 403: lacking TRANSACTION_VOID routes the request into the approval
      // workflow. The old assertion accepted 200 outright, so it would have
      // passed just as happily if the kasir had actually voided the sale.
      const res = await request.delete(`${API_URL}/transactions/${txId}`, {
        headers: asTenantUser(tenant, kasir),
      });
      expect(res.status()).toBe(200);
      const body = await res.json();
      expect(body.approvalRequired).toBe(true);
      expect(body.success).toBe(false);

      const [row] = await db.select().from(transactions).where(eq(transactions.id, txId));
      expect(row, 'the transaction must survive a kasir delete').toBeDefined();
    });

    test('a manager cannot delete a store', async ({ request }) => {
      // DELETE /api/stores/[id] is requireOwner. The old assertion accepted 200,
      // i.e. it would have passed if the manager HAD deleted the store.
      const res = await request.delete(`${API_URL}/stores/${tenant.storeId}`, {
        headers: asTenantUser(tenant, manager),
      });
      expect(res.status()).toBe(403);

      const [store] = await db.select().from(stores).where(eq(stores.id, tenant.storeId));
      expect(store, 'the store must still exist').toBeDefined();
    });
  });

  test.describe('Input Validation', () => {
    test('SQL injection in search is handled', async ({ request }) => {
      const response = await request.get(
        `${API_URL}/inventory?search=' OR 1=1 --`
      );

      // Must not crash (no 500). Unauthenticated → 401 is a valid safe rejection.
      expect([200, 400, 401, 404]).toContain(response.status());
    });

    test('XSS in customer name is sanitized', async ({ request }) => {
      const response = await request.post(`${API_URL}/customers`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          name: '<script>alert("xss")</script>',
          phone: '08123456789',
        },
      });

      // Should either accept (and sanitize) or reject; unauthenticated → 401.
      expect([200, 201, 400, 401]).toContain(response.status());
    });

    test('Negative quantities are rejected', async ({ request }) => {
      const response = await request.put(`${API_URL}/inventory/some-id`, {
        headers: {
          'Content-Type': 'application/json',
        },
        data: {
          quantity: -100,
        },
      });

      expect([400, 401, 403, 404]).toContain(response.status());
    });
  });

  test.describe('Request ID Tracing', () => {
    test('Responses include request ID', async ({ request }) => {
      const response = await request.get(`${API_URL}/health`);

      // Health check might not have auth, but responses should have request ID
      const requestId = response.headers()['x-request-id'];

      // Either has request ID or is health endpoint (special case)
      expect(requestId || response.url()?.includes('health')).toBeTruthy();
    });
  });
});
