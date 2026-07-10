# Han Laptop ERP

Sistem Manajemen Toko Komputer dengan fitur lengkap untuk UMKM Indonesia.

---

## Fitur Utama

### Modul Transaksi
- [x] Point of Sale (Kasir)
- [x] Penjualan & Pembelian
- [x] Multi-payment (Cash, Transfer, QRIS)
- [x] Retur & Tukar Tambah
- [x] Trade-in & Buyback
- [x] Pesanan Servis

### Modul Inventory
- [x] Manajemen Stok
- [x] Digital Passport (Serial Number Tracking)
- [x] QC Inspection
- [x] Stock Opname
- [x] Markdown/Diskon Otomatis
- [x] Transfer Antar Gudang

### Modul Service
- [x] Service Order Management
- [x] Technician Assignment
- [x] Commission Tracking
- [x] Warranty Claims
- [x] AI Pricing (TechSama integration)

### Modul Accounting
- [x] Chart of Accounts
- [x] General Ledger
- [x] Trial Balance
- [x] Income Statement (Laba Rugi)
- [x] Balance Sheet (Neraca)
- [x] Cash Flow
- [x] Fixed Assets & Depreciation
- [x] Fiscal Period Management

### Modul HR
- [x] Employee Management
- [x] Attendance Tracking
- [x] Payroll
- [x] Employee Loans
- [x] Purchase Requisitions

### Modul CRM
- [x] Customer Management
- [x] Supplier Management
- [x] Membership & Points
- [x] Reminders & Notifications
- [x] Lead Management

### Multi-Tenant
- [x] Multi-Store Support
- [x] Role-Based Access (Owner/Manager/Kasir/Teknisi/Investor)
- [x] PBAC (Permission-Based Access Control)
- [x] Store Isolation

---

## Production Readiness

### Monitoring & Observability
- [x] Structured Logging (Pino)
- [x] Request ID & Correlation ID
- [x] Health Check Endpoints (`/health`, `/ready`, `/live`)
- [x] Sentry Integration (Frontend & Backend)
- [x] Rate Limiting per Endpoint

### Security
- [x] Multi-Tenant Isolation (IDOR Protection)
- [x] Rate Limiting (Login: 5/min, Export: 10/hr, AI: 30/hr, API: 300/min)
- [x] Dependency Security (npm audit)
- [x] TypeScript Strict Mode
- [x] ESLint Configuration

### Database
- [x] SQLite (Turso)
- [x] Database Indexing for Performance
- [x] Soft Delete Pattern
- [x] Audit Trail

### Backup & Recovery
- [x] Manual Backup/Restore
- [x] Cron-based Automated Backup
- [x] Cloud Storage Support (R2, S3)
- [x] Health Check Endpoints

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Backend | Next.js (App Router) |
| Database | SQLite + Turso |
| Auth | Better Auth |
| ORM | Drizzle |
| UI | shadcn/ui |
| Charts | Recharts |
| Email | React Email |
| Payments | Midtrans |

---

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- Turso CLI (optional, for local DB)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/han-laptop-erp.git
cd han-laptop-erp

# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Copy environment file
cp backend/.env.example backend/.env.local
```

### Development

```bash
# Backend (port 3000)
cd backend && npm run dev

# Frontend (port 5173)
cd frontend && npm run dev
```

### Production Build

```bash
# Build backend
cd backend && npm run build

# Verify TypeScript
npx tsc --noEmit

# Run tests
cd backend && node tests/smoke-test.js
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Vercel deployment guide |
| [VERIFICATION.md](./backend/VERIFICATION.md) | Pre-production checklist |
| [CLAUDE.md](./CLAUDE.md) | Project context for AI tools |

---

## API Endpoints

### Health

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Basic liveness |
| `/api/health/ready` | GET | Readiness with dependencies |
| `/api/health/live` | GET | Kubernetes liveness probe |

### Transactions
| `/api/transactions` | GET, POST | List/Create transactions |
| `/api/transactions/[id]` | GET, PUT, PATCH, DELETE | Single transaction |

### Inventory
| `/api/inventory` | GET, POST | List/Create inventory |
| `/api/inventory/[id]` | GET, PUT, DELETE | Single item |
| `/api/inventory/kpi` | GET | Aggregated stats |
| `/api/inventory/transfers` | GET, POST | Stock transfers |

### Services
| `/api/services` | GET, POST | List/Create service orders |
| `/api/services/[id]` | GET, PATCH, DELETE | Single service |

### Accounting
| `/api/accounting/*` | GET | Reports & ledgers |

### Cron Jobs
| `/api/cron/backup` | GET | Daily backup |
| `/api/cron/cleanup` | GET | Daily cleanup |

---

## Rate Limits

| Endpoint Tier | Limit | Window |
|----------------|-------|---------|
| Login | 5 | 1 minute |
| Token Refresh | 20 | 1 minute |
| Export | 10 | 1 hour |
| AI Operations | 30 | 1 hour |
| Standard API | 300 | 1 minute |

---

## Environment Variables

### Required
```bash
# Primary DB env names (the app also accepts the legacy TURSO_DATABASE_URL / TURSO_AUTH_TOKEN)
DATABASE_URL=libsql://xxx.turso.io
DATABASE_AUTH_TOKEN=xxx
BETTER_AUTH_SECRET=32-char-secret
NODE_ENV=production
```

### Recommended
```bash
GEMINI_API_KEY=xxx                         # AI parsing / pricing (import-ai, ai/pricing)
SENTRY_DSN=https://xxx@sentry.io/xxx
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io   # enables the distributed rate limiter
UPSTASH_REDIS_REST_TOKEN=xxx
```

> Full list of environment variable names is documented in [CLAUDE.md](./CLAUDE.md#5-environment-variables-nama-saja).

---

## License

Proprietary - Han Laptop ERP
