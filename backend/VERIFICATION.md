# Sprint 2 - Production Verification Checklist

## Overview

This document contains the verification steps required before declaring the application "Production Ready".

---

## Phase 1: Smoke Tests (5 minutes)

Run basic health and authentication checks.

```bash
cd backend
node tests/smoke-test.js
```

### Expected Results
- [ ] `/health` returns 200
- [ ] `/health/ready` returns 200
- [ ] `/health/live` returns 200
- [ ] Unauthenticated requests to `/transactions` return 401/403
- [ ] Unauthenticated requests to `/inventory` return 401/403
- [ ] Unauthenticated requests to `/customers` return 401/403

---

## Phase 2: Multi-Tenant Isolation (10 minutes)

Verify Store A cannot access Store B data.

```bash
cd backend
npx playwright test tests/e2e/multi-tenant.spec.ts
```

### Expected Results
- [ ] Store A cannot GET Store B transactions
- [ ] Store A cannot GET Store B inventory
- [ ] Store A cannot GET Store B customers
- [ ] Store A cannot PATCH Store B data
- [ ] Store A cannot DELETE Store B data
- [ ] Store only sees own data in list endpoints

---

## Phase 3: Security Regression (10 minutes)

Verify security controls are working.

```bash
cd backend
npx playwright test tests/e2e/security.spec.ts
```

### Expected Results
- [ ] Rate limiting is active on login endpoint
- [ ] Invalid tokens are rejected
- [ ] SQL injection attempts are handled
- [ ] XSS attempts are handled
- [ ] Negative quantities are rejected
- [ ] Response headers include rate limit info

---

## Phase 4: Backup & Recovery (15 minutes)

Verify backup can be restored.

### 4.1 Create Backup
```bash
# Via API
curl -X POST /api/settings/backup/export
```

### 4.2 Verify Backup Contents
```json
{
  "version": "2.0",
  "storeId": "...",
  "backupDate": "...",
  "data": {
    "customers": [...],
    "inventory": [...],
    "transactions": [...],
    ...
  }
}
```

### 4.3 Restore Test (Staging Only)
```bash
# 1. Create staging environment
# 2. Restore backup to staging
# 3. Verify data integrity
# 4. Verify no cross-store contamination
```

### Checklist
- [ ] Backup creates successfully
- [ ] Backup contains all tables
- [ ] Backup file is encrypted (if configured)
- [ ] Backup size is reasonable (< 100MB for typical store)
- [ ] Restore test completed on staging
- [ ] Restore integrity verified

---

## Phase 5: Load Testing (Optional, 20 minutes)

For production with > 100 concurrent users:

```bash
# Install k6
npm install -g k6

# Run load test
k6 run tests/load.js
```

### Expected Results
- [ ] p95 latency < 500ms
- [ ] p99 latency < 1s
- [ ] Error rate < 1%
- [ ] No memory leaks

---

## Phase 6: Performance Benchmarks (10 minutes)

```bash
cd backend
# Check database indexes
npx tsx src/db/migrate-add-indexes.ts --dry-run
```

### Database Indexes
- [ ] `audit_logs` indexes created
- [ ] `inventory` indexes created
- [ ] `transactions` indexes created
- [ ] `journal_entries` indexes created
- [ ] No missing indexes reported

---

## Phase 7: Security Scan (10 minutes)

```bash
# Dependency audit
cd backend
npm audit

# Secrets scan
# Install detect-secrets or similar
git diff --secrets
```

### Results
- [ ] No HIGH severity vulnerabilities
- [ ] No CRITICAL vulnerabilities
- [ ] No hardcoded secrets in code

---

## Phase 8: Final Build Verification (5 minutes)

```bash
cd backend
npm run build
npm run lint
npx tsc --noEmit
```

### Expected Results
- [ ] Build completes without errors
- [ ] No ESLint errors
- [ ] No TypeScript errors

---

## Phase 9: Environment Variables Check

Verify all required environment variables are set:

```bash
# Required for production
echo $DATABASE_URL
echo $BETTER_AUTH_SECRET
echo $SENTRY_DSN
echo $NODE_ENV  # Should be "production"
```

### Checklist
- [ ] `DATABASE_URL` is set (Supabase Postgres pooler)
- [ ] `BETTER_AUTH_SECRET` is set (32+ chars)
- [ ] `SENTRY_DSN` is set (optional but recommended)
- [ ] `NODE_ENV=production`
- [ ] `LOG_LEVEL=info` or `LOG_LEVEL=warn`
- [ ] `BACKUP_STORAGE` configured (cloudflare-r2 or local)

---

## Phase 10: Monitoring Setup

Verify monitoring is active:

### Sentry
- [ ] Errors appearing in Sentry dashboard
- [ ] Release version tagged correctly
- [ ] Environment set to "production"

### Health Checks
- [ ] `/health` monitored by uptime service
- [ ] `/ready` monitored for readiness
- [ ] Alerts configured for 5xx errors

### Logs
- [ ] Structured logs appearing in log aggregator
- [ ] Request IDs traceable
- [ ] No `console.log` in production code

---

## Phase 11: Deployment Verification

### Pre-Deploy

```bash
# Verify build works locally
cd backend
npm run build

# Verify TypeScript
npx tsc --noEmit
```

### Deploy to Staging

```bash
# Via Vercel CLI
cd backend
vercel --environment=preview

# Or push to staging branch
git checkout -b staging
git push origin staging
```

### Post-Deploy Verification

```bash
# Health checks
curl https://staging-url.vercel.app/api/health
curl https://staging-url.vercel.app/api/health/ready

# Smoke tests on staging
BASE_URL=https://staging-url.vercel.app API_URL=https://staging-url.vercel.app/api node tests/smoke-test.js
```

### Deploy to Production

```bash
# Via Vercel CLI
vercel --prod

# Or promote from dashboard
# Deployments > Select working deployment > Promote to Production
```

### Post-Production Checklist

- [ ] Health endpoints return 200
- [ ] `/api/health/ready` shows all checks passing
- [ ] Sentry receiving errors
- [ ] Logs appearing in aggregator (if configured)
- [ ] Rate limiting active
- [ ] Backup cron scheduled
- [ ] Uptime monitoring configured
- [ ] Custom domain SSL active

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Developer | | | ☐ |
| Reviewer | | | ☐ |
| DevOps | | | ☐ |
| Product Owner | | | ☐ |

### Decision

**IF ALL CHECKMARKS PASSED:**

```bash
# Tag release
git tag v1.0.0-production
git push origin main --tags
```

**Deploy to production.**

---

## Rollback Procedures

If production issues detected:

```bash
# 1. Identify issue via Sentry/logs

# 2. Rollback via Vercel
vercel rollback [deployment-url]

# Or revert code
git revert HEAD
git push origin main

# 3. Restore backup if data corruption
curl -X POST /api/settings/backup/restore -d @backup.json
```

---

## Emergency Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Dev On-Call | | Primary |
| Database Admin | Turso Support | Secondary |
| Cloud Provider | Vercel Support | Tertiary |
