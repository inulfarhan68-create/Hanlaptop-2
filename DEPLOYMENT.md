# Deployment Guide - Han Laptop ERP

## Prerequisites

1. Vercel CLI installed
   ```bash
   npm i -g vercel
   ```

2. Vercel account linked
   ```bash
   vercel login
   ```

3. Turso database created and URL available

---

## Environment Variables

### Required

```bash
# Database
TURSO_DATABASE_URL=libsql://your-database.turso.io
TURSO_AUTH_TOKEN=turso_xxx

# Authentication
BETTER_AUTH_SECRET=your-32-character-secret-key-here

# Environment
NODE_ENV=production
```

### Recommended (for Production Operations)

```bash
# Observability
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_AUTH_TOKEN=your-sentry-auth-token

# Rate Limiting (Optional - uses in-memory fallback if not set)
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Backup Storage (Optional)
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
CLOUDFLARE_BUCKET=backups

# Backup Retention
BACKUP_RETENTION_DAYS=30
CRON_SECRET=your-random-secret

# App Version
APP_VERSION=1.0.0
```

### Optional

```bash
# AI Features
OPENAI_API_KEY=sk-xxx

# Email (if using email)
RESEND_API_KEY=re_xxx

# Analytics
POSTHOG_API_KEY=phc_xxx
```

---

## Deploy Steps

### Option 1: Vercel Dashboard (Recommended for First Deploy)

1. Push code to GitHub
2. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
3. Click "New Project"
4. Select "hanlaptop-2" repository
5. Configure environment variables in Project Settings
6. Click "Deploy"

### Option 2: Vercel CLI

```bash
# Navigate to backend
cd backend

# Link project (first time only)
vercel link

# Set environment variables
vercel env add TURSO_DATABASE_URL
vercel env add TURSO_AUTH_TOKEN
vercel env add BETTER_AUTH_SECRET
# ... add other variables

# Deploy
vercel --prod
```

### Option 3: GitHub Actions (Automated)

The repository already has GitHub Actions configured. Push to main to trigger deployment.

---

## Health Checks

After deployment, verify:

```bash
# Replace with your production URL
curl https://your-app.vercel.app/api/health
curl https://your-app.vercel.app/api/health/ready
curl https://your-app.vercel.app/api/health/live
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2026-01-01T00:00:00.000Z",
  "uptime": 60,
  "checks": [...]
}
```

---

## Cron Jobs

Add to `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/backup",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Cron Endpoints

| Endpoint | Schedule | Purpose |
|----------|-----------|---------|
| `/api/cron/backup` | Daily 2 AM | Automated backup |
| `/api/cron/cleanup` | Daily 3 AM | Log cleanup |

---

## Monitoring

### Vercel Analytics

Enable in Project Settings > Analytics

### Sentry Integration

1. Create project in [sentry.io](https://sentry.io)
2. Add `SENTRY_DSN` to environment variables
3. Errors automatically tracked

### Uptime Monitoring

Recommended services:
- Vercel Built-in
- UptimeRobot (free tier: 50 monitors)
- Pingdom
- Better Uptime

Endpoints to monitor:
```
GET /api/health       # Every 30 seconds
GET /api/health/ready # Every minute
```

---

## Rollback Procedures

### Via Vercel Dashboard

1. Go to Deployments
2. Find working deployment
3. Click "..." menu > "Promote to Production"

### Via CLI

```bash
vercel rollback [deployment-url]
```

### Via Git

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Or checkout specific tag
git checkout v1.0.0
git push origin v1.0.0 --force
```

---

## Database Backup & Restore

### Manual Backup

```bash
# Create backup
curl -X POST https://your-app.vercel.app/api/settings/backup/export \
  -H "Cookie: better-auth.session_token=xxx"

# Response includes JSON backup
```

### Automated Backup

Configure cron job in vercel.json or external service like GitHub Actions daily workflow.

### Restore (Staging Only - Production requires manual verification)

```bash
curl -X POST https://staging.your-app.vercel.app/api/settings/backup/restore \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=xxx" \
  -d @backup.json
```

⚠️ **WARNING**: Restore will overwrite all data. Verify backup first.

---

## Troubleshooting

### "Connection refused" errors

Check `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct.

### "Better Auth" errors

1. Verify `BETTER_AUTH_SECRET` is 32+ characters
2. Check CORS settings in `vercel.json`

### Rate limiting not working

In-memory rate limiting resets on serverless cold starts. For consistent limits across instances, configure Upstash Redis.

### Cron jobs not running

1. Verify cron schedule in `vercel.json`
2. Check `CRON_SECRET` if configured
3. Verify endpoint returns 200 within timeout

### Slow queries

1. Check `/api/health/ready` for database latency
2. Review `/api/health` memory usage
3. Check Turso dashboard for slow queries

---

## Security Checklist

Before going live:

- [ ] All secrets in environment variables, not code
- [ ] `BETTER_AUTH_SECRET` is 32+ random characters
- [ ] Rate limiting configured
- [ ] Sentry error tracking active
- [ ] Health endpoints monitored
- [ ] Backup configured and tested
- [ ] CORS restricted to your domains

---

## Support

- Vercel Docs: [vercel.com/docs](https://vercel.com/docs)
- Turso Docs: [turso.tech/docs](https://turso.tech/docs)
- Sentry Docs: [sentry.io/docs](https://docs.sentry.io)
