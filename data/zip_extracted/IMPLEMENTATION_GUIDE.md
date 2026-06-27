# Implementation Getting Started Guide
## Web App Bisnis Laptop - Development Checklist & Setup

---

## PHASE 0: PRE-DEVELOPMENT (WEEK 0)

### Checklist

- [ ] **Stakeholder Sign-off**
  - [ ] PRD reviewed & approved
  - [ ] Tech stack confirmed
  - [ ] Timeline & budget approved
  - [ ] Team assigned

- [ ] **Project Infrastructure**
  - [ ] GitHub repository created (private)
  - [ ] Add team members as collaborators
  - [ ] Create branch protection rules
    ```
    - Require pull request review (1 reviewer minimum)
    - Dismiss stale pull request approvals
    - Require status checks to pass
    - No force push allowed
    ```
  - [ ] Setup GitHub projects for tracking

- [ ] **Local Development Setup**
  - [ ] Node.js 18+ installed
  - [ ] PostgreSQL 14+ installed locally
  - [ ] Redis installed locally
  - [ ] Docker & Docker Compose installed
  - [ ] Code editor setup (VS Code recommended)
  - [ ] Essential extensions installed:
    - [ ] ESLint
    - [ ] Prettier
    - [ ] Thunder Client / Postman (API testing)
    - [ ] PostgreSQL extension (if using VS Code)

- [ ] **Documentation Repositories**
  - [ ] Create docs folder in repo
  - [ ] Create API documentation template
  - [ ] Create deployment guide template
  - [ ] Create architecture diagrams folder

- [ ] **Communication Setup**
  - [ ] Daily standup meeting scheduled
  - [ ] Slack channel created (#dev-laptop-app)
  - [ ] Issue tracking system configured
  - [ ] Code review process defined

---

## PHASE 1: FOUNDATION SETUP (WEEK 1)

### Week 1 Deliverables
- ✅ Project scaffold (backend + frontend)
- ✅ Database migrations setup
- ✅ Authentication system
- ✅ Basic UI component library
- ✅ Development environment with Docker

### Backend Setup Steps

#### Step 1.1: Create Backend Project
```bash
# Create project directory
mkdir laptop-business-app
cd laptop-business-app

# Create backend folder
mkdir backend
cd backend

# Initialize Node.js project
npm init -y

# Install dependencies
npm install express cors dotenv zod pg redis bcryptjs jsonwebtoken
npm install -D typescript @types/express @types/node ts-node nodemon

# Create tsconfig.json
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true
  },
  "include": ["src"],
  "exclude": ["node_modules"]
}
EOF

# Create .env.example
cat > .env.example << 'EOF'
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/laptop_app
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_secret_key_here
JWT_EXPIRY=8h
LOG_LEVEL=debug
EOF

# Create folder structure
mkdir -p src/{controllers,services,models,routes,middleware,utils,validators,config}
```

#### Step 1.2: Setup Database Connection
```typescript
// src/config/database.ts
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export default pool;

// Test connection
export async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0]);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}
```

#### Step 1.3: Setup Authentication Middleware
```typescript
// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    req.user = decoded as AuthRequest['user'];
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Role-based middleware
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    next();
  };
}
```

#### Step 1.4: Create Server Entry Point
```typescript
// src/index.ts
import express, { Express } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool, { testConnection } from './config/database';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes (placeholder)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Start server
async function start() {
  try {
    await testConnection();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await pool.end();
  process.exit(0);
});
```

#### Step 1.5: Setup Database Migrations
```bash
# Create migrations folder
mkdir src/migrations

# Create migration helper
cat > src/migrations/migrate.ts << 'EOF'
import fs from 'fs';
import path from 'path';
import pool from '../config/database';

async function migrate() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅ Migrated: ${file}`);
    } catch (error) {
      console.error(`❌ Migration failed: ${file}`, error);
      throw error;
    }
  }

  await pool.end();
}

migrate();
EOF
```

#### Step 1.6: Create Initial Migration
```sql
-- src/migrations/001_create_tables.sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(100) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  permissions JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50),
  cost_price DECIMAL(12,2),
  selling_price DECIMAL(12,2),
  current_stock INTEGER DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 5,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Stock movements table
CREATE TABLE IF NOT EXISTS stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  movement_type VARCHAR(50),
  quantity_change INTEGER,
  before_stock INTEGER,
  after_stock INTEGER,
  reference_id INTEGER,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
```

#### Step 1.7: Setup Package Scripts
```json
// package.json - update scripts section
"scripts": {
  "dev": "ts-node-dev --respawn src/index.ts",
  "build": "tsc",
  "start": "node dist/index.js",
  "migrate": "ts-node src/migrations/migrate.ts",
  "test": "jest",
  "lint": "eslint src --ext .ts"
}
```

#### Step 1.8: Create Docker Setup
```yaml
# docker-compose.yml (root)
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: laptop_app
      POSTGRES_PASSWORD: password123
      POSTGRES_DB: laptop_app_dev
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Frontend Setup Steps

#### Step 2.1: Create React Project
```bash
# Go to root directory
cd ..

# Create frontend with Vite (faster than CRA)
npm create vite@latest frontend -- --template react-ts

cd frontend

# Install dependencies
npm install

# Install additional packages
npm install axios zustand react-query react-router-dom
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

#### Step 2.2: Setup Tailwind CSS
```css
/* frontend/src/index.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Dark mode support */
@media (prefers-color-scheme: dark) {
  :root {
    color-scheme: dark;
  }
}
```

#### Step 2.3: Create API Client
```typescript
// frontend/src/lib/api.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

#### Step 2.4: Setup Routing
```typescript
// frontend/src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

#### Step 2.5: Create Folder Structure
```bash
# frontend/src/
mkdir -p pages components hooks stores types api

# Create file structure
touch pages/{Dashboard,Login,NotFound}.tsx
touch components/{Header,Sidebar,LoadingSpinner}.tsx
touch hooks/useAuth.ts
touch stores/authStore.ts
touch types/index.ts
touch api/auth.ts
```

---

## TESTING THE SETUP (End of Week 1)

### Backend Testing
```bash
cd backend

# Test database connection
npm run migrate

# Start development server
npm run dev

# Should see:
# ✅ Database connected: { now: '2026-05-19T10:30:00.000Z' }
# 🚀 Server running on port 3000
```

### Frontend Testing
```bash
cd frontend

# Start dev server
npm run dev

# Should see:
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

### API Testing
```bash
# Test health endpoint
curl http://localhost:3000/health

# Should return:
# {"status":"ok","timestamp":"2026-05-19T10:30:00.000Z"}
```

---

## PHASE 2: CORE MODULES DEVELOPMENT (WEEKS 2-4)

### Week 2: Products & Inventory

#### Backend Tasks
- [ ] Create Product model & service
- [ ] Create inventory endpoints
  - [ ] GET /api/products (list)
  - [ ] POST /api/products (create)
  - [ ] PUT /api/products/:id (update)
  - [ ] GET /api/products/:id (detail)
- [ ] Implement stock tracking logic
- [ ] Create stock movement audit trail

#### Frontend Tasks
- [ ] Create Products list page
- [ ] Create Add/Edit Product modal
- [ ] Create Inventory dashboard
- [ ] Create stock alert notifications

#### Acceptance Criteria
- [ ] Can create product with all fields
- [ ] Stock shows in real-time
- [ ] Edit product updates database
- [ ] Stock movement logged

---

### Week 3: Authentication & Admin

#### Backend Tasks
- [ ] Implement user registration
- [ ] Implement login/logout with JWT
- [ ] Create RBAC middleware
- [ ] Create user management endpoints
- [ ] Implement password hashing (bcrypt)

#### Frontend Tasks
- [ ] Create login page with validation
- [ ] Create user management dashboard
- [ ] Implement token storage & refresh
- [ ] Create protected routes

#### Acceptance Criteria
- [ ] Can register & login user
- [ ] JWT token generated & validated
- [ ] Role-based access working
- [ ] Logout clears session

---

### Week 4: Sales & Purchase Modules

#### Backend Tasks
- [ ] Create sales invoice endpoints
  - [ ] POST /api/sales-invoices
  - [ ] GET /api/sales-invoices
  - [ ] PUT /api/sales-invoices/:id
- [ ] Create purchase order endpoints
  - [ ] POST /api/purchase-orders
  - [ ] GET /api/purchase-orders
  - [ ] POST /api/goods-receipts
- [ ] Implement auto inventory updates
  - [ ] Sales → Stock decrease
  - [ ] Goods receipt → Stock increase
- [ ] Add payment tracking

#### Frontend Tasks
- [ ] Create Invoice creation form
- [ ] Create Invoice list & detail view
- [ ] Create PO creation form
- [ ] Create Goods receipt form
- [ ] Add invoice printing

#### Acceptance Criteria
- [ ] Create invoice → Stock auto-decreases
- [ ] Create PO → Goods receipt → Stock auto-increases
- [ ] Invoice payment tracking works
- [ ] Can print invoice

---

## DETAILED WEEK-BY-WEEK ROADMAP

### Week 1: Foundation
```
Mon: Setup backend project, database, migrations
Tue: Setup frontend project, routing
Wed: Implement authentication backend
Thu: Implement authentication frontend
Fri: Testing, Docker setup, documentation
```

### Week 2: Products & Inventory
```
Mon: Product CRUD API
Tue: Stock tracking logic
Wed: Inventory components frontend
Thu: Integration testing
Fri: Documentation, refinement
```

### Week 3: Admin Panel
```
Mon: User management API
Tue: RBAC implementation
Wed: Admin dashboard frontend
Thu: Permissions testing
Fri: Documentation, refinement
```

### Week 4: Sales & Purchase
```
Mon: Sales invoice API
Tue: Purchase order API
Wed: Goods receipt logic
Thu: Frontend forms integration
Fri: End-to-end testing
```

---

## DEVELOPMENT BEST PRACTICES

### Code Review Checklist
Before merging any PR:
- [ ] Code follows style guide
- [ ] Tests written for new features
- [ ] No console.log or debugger statements
- [ ] Error handling implemented
- [ ] Database migrations included (if applicable)
- [ ] API documentation updated
- [ ] UI responsive (desktop + mobile)

### Commit Message Format
```
[FEATURE/BUGFIX/DOCS] Brief description (50 chars max)

Detailed explanation of what and why (72 char line wrap)

- Item 1
- Item 2

Fixes #123
```

Example:
```
[FEATURE] Add inventory stock tracking

Implement real-time stock updates when sales/purchase
transactions are created. Stock movements are logged
for audit trail.

- Create stock_movements table
- Add trigger for automatic stock updates
- Implement audit log endpoint

Fixes #42
```

### Testing Requirements
```
Unit tests:
  - Business logic (calculations, validations)
  - Error handling
  - Edge cases

Integration tests:
  - API endpoints
  - Database interactions
  - Data consistency

E2E tests:
  - Critical user workflows
  - Cross-module interactions
```

### Performance Checklist
- [ ] Database queries optimized (use indexes)
- [ ] API responses cached where applicable
- [ ] Frontend components memoized
- [ ] Bundle size analyzed
- [ ] Load testing performed

---

## TROUBLESHOOTING GUIDE

### Common Issues

**Issue: Database connection refused**
```bash
# Check if PostgreSQL is running
sudo systemctl status postgresql
# or with Docker:
docker-compose ps
```

**Issue: Port 3000 already in use**
```bash
# Find process using port
lsof -i :3000
# Kill process
kill -9 <PID>
```

**Issue: Module not found errors**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**Issue: Token expired**
```
Solution: Implement refresh token endpoint
- Access token: 8 hours (short-lived)
- Refresh token: 30 days (long-lived)
- Endpoint: POST /api/auth/refresh
```

---

## DELIVERABLES CHECKLIST

### End of Week 1
- [ ] GitHub repo with proper structure
- [ ] Backend: Node.js + Express server running
- [ ] Database: PostgreSQL with migrations
- [ ] Frontend: React + Vite setup
- [ ] Docker: docker-compose.yml working
- [ ] Documentation: README with setup instructions

### End of Week 2
- [ ] Products CRUD working
- [ ] Inventory tracking functional
- [ ] Stock movements logged
- [ ] Frontend: Products list page
- [ ] 80%+ unit test coverage

### End of Week 3
- [ ] User authentication complete
- [ ] RBAC implemented
- [ ] Admin dashboard functional
- [ ] User management working
- [ ] Security audit passed

### End of Week 4
- [ ] Sales invoice module complete
- [ ] Purchase order module complete
- [ ] Auto inventory updates working
- [ ] All integration tests passing
- [ ] Ready for Phase 2

---

## NEXT STEPS (PHASE 2-5)

After completing Phase 1, proceed with:

**Phase 2 (Weeks 5-8):**
- Expense module
- Service workorder module
- Payment tracking enhancements

**Phase 3 (Weeks 9-12):**
- Financial reporting (P&L, Balance Sheet)
- COGS calculation
- Report generation & export

**Phase 4 (Weeks 13-16):**
- KPI dashboard with charts
- Analytics & trending
- Mobile responsiveness
- Dark mode implementation

**Phase 5 (Weeks 17-20):**
- Performance optimization
- Security hardening
- CI/CD pipeline
- Production deployment

---

## USEFUL RESOURCES

### Documentation
- PostgreSQL: https://www.postgresql.org/docs/
- Express.js: https://expressjs.com/
- React: https://react.dev/
- TypeScript: https://www.typescriptlang.org/

### Tools
- Postman: https://www.postman.com/
- pgAdmin: https://www.pgadmin.org/
- Figma: https://www.figma.com/ (design)

### Libraries
- Zod: Schema validation
- TanStack Query: Data fetching
- Zustand: State management
- React Hook Form: Form management

---

**Document Version:** 1.0  
**Last Updated:** May 2026  
**Next Review:** End of Week 1

