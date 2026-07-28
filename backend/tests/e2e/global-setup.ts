import { seedPlans } from '../../src/db/seed-plans';

/**
 * Playwright global setup for the e2e suite.
 *
 * CI's test database is schema-only (built by the integration step's drizzle-kit
 * push) with an EMPTY `plans` table. Seed the base SaaS plans once so that:
 *  - register-tenant's planKey validation resolves (onboarding flow),
 *  - subscription rows can reference a real plan,
 *  - requireFeature() gates have plans to check against.
 * Idempotent (upsert by key).
 */
export default async function globalSetup() {
    await seedPlans();
}
