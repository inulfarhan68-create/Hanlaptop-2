# Technical Specification
## Web App Bisnis Laptop - Database & API Design

---

## PART 1: DATABASE SCHEMA (DETAILED)

### Table 1: `users`
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  role_id INTEGER REFERENCES roles(id),
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER REFERENCES users(id),
  deleted_at TIMESTAMP -- soft delete
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

### Table 2: `roles`
```sql
CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB, -- JSON array of permission strings
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample data:
-- INSERT INTO roles (name, permissions) VALUES
-- ('admin', '["*"]'),
-- ('owner', '["view_reports", "view_dashboard", "approve_expenses"]'),
-- ('operator', '["create_invoice", "create_po", "manage_inventory"]'),
-- ('technician', '["create_workorder", "manage_service"]'),
-- ('viewer', '["view_reports", "view_dashboard"]');
```

### Table 3: `customers`
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  province VARCHAR(50),
  postal_code VARCHAR(10),
  notes TEXT,
  credit_limit DECIMAL(12,2) DEFAULT 0,
  payment_terms VARCHAR(50), -- e.g., "NET 30", "COD"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_customers_name ON customers(name);
```

### Table 4: `suppliers`
```sql
CREATE TABLE suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  contact_person VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  city VARCHAR(50),
  province VARCHAR(50),
  payment_terms VARCHAR(50), -- e.g., "DP 50%", "LUNAS"
  avg_delivery_days INTEGER,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
```

### Table 5: `products` (SKU Master)
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  sku VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  category VARCHAR(50) NOT NULL, -- laptop, parts, accessories
  subcategory VARCHAR(50),
  description TEXT,
  cost_price DECIMAL(12,2) NOT NULL, -- last purchase price
  selling_price DECIMAL(12,2) NOT NULL,
  current_stock INTEGER DEFAULT 0,
  min_stock_threshold INTEGER DEFAULT 5,
  max_stock_threshold INTEGER DEFAULT 50,
  reorder_qty INTEGER DEFAULT 10,
  location VARCHAR(100), -- warehouse location
  unit_of_measure VARCHAR(20) DEFAULT 'pcs', -- pieces, unit, etc
  supplier_id INTEGER REFERENCES suppliers(id),
  image_url VARCHAR(255),
  barcode VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, discontinued
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_current_stock ON products(current_stock);
```

### Table 6: `stock_movements` (Audit Trail)
```sql
CREATE TABLE stock_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id),
  movement_type VARCHAR(50) NOT NULL, -- 'purchase_in', 'sales_out', 'service_out', 'adjustment', 'damage'
  quantity_change INTEGER NOT NULL, -- signed number: positive for in, negative for out
  before_stock INTEGER NOT NULL,
  after_stock INTEGER NOT NULL,
  reference_type VARCHAR(50), -- 'sales_invoice', 'purchase_order', 'service_workorder', 'adjustment'
  reference_id INTEGER,
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
```

### Table 7: `sales_invoices`
```sql
CREATE TABLE sales_invoices (
  id SERIAL PRIMARY KEY,
  invoice_no VARCHAR(50) UNIQUE NOT NULL, -- INV-YYYY-MM-NNN
  date DATE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0, -- e.g., 10 for 10%
  total DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50), -- 'cash', 'transfer', 'credit'
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'completed'
  amount_paid DECIMAL(12,2) DEFAULT 0,
  notes TEXT,
  status VARCHAR(20) DEFAULT 'completed', -- 'draft', 'completed', 'cancelled'
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_sales_invoices_invoice_no ON sales_invoices(invoice_no);
CREATE INDEX idx_sales_invoices_customer ON sales_invoices(customer_id);
CREATE INDEX idx_sales_invoices_date ON sales_invoices(date);
CREATE INDEX idx_sales_invoices_payment_status ON sales_invoices(payment_status);
```

### Table 8: `sales_invoice_items`
```sql
CREATE TABLE sales_invoice_items (
  id SERIAL PRIMARY KEY,
  sales_invoice_id INTEGER NOT NULL REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL, -- qty * unit_price - discount
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sales_invoice_items_invoice ON sales_invoice_items(sales_invoice_id);
CREATE INDEX idx_sales_invoice_items_product ON sales_invoice_items(product_id);
```

### Table 9: `purchase_orders`
```sql
CREATE TABLE purchase_orders (
  id SERIAL PRIMARY KEY,
  po_no VARCHAR(50) UNIQUE NOT NULL, -- PO-YYYY-MM-NNN
  date DATE NOT NULL,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  subtotal DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL,
  expected_delivery DATE,
  actual_delivery DATE,
  payment_term VARCHAR(50), -- e.g., "DP 50%", "NET 30"
  payment_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'completed'
  amount_paid DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'submitted', 'received', 'partial_received', 'completed', 'cancelled'
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_purchase_orders_po_no ON purchase_orders(po_no);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(date);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
```

### Table 10: `purchase_order_items`
```sql
CREATE TABLE purchase_order_items (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL,
  quantity_received INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_po_items_po ON purchase_order_items(purchase_order_id);
CREATE INDEX idx_po_items_product ON purchase_order_items(product_id);
```

### Table 11: `goods_receipts`
```sql
CREATE TABLE goods_receipts (
  id SERIAL PRIMARY KEY,
  gr_no VARCHAR(50) UNIQUE NOT NULL, -- GR-YYYY-MM-NNN
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id),
  receipt_date DATE NOT NULL,
  notes TEXT,
  received_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_goods_receipts_po ON goods_receipts(purchase_order_id);
CREATE INDEX idx_goods_receipts_date ON goods_receipts(receipt_date);
```

### Table 12: `goods_receipt_items`
```sql
CREATE TABLE goods_receipt_items (
  id SERIAL PRIMARY KEY,
  goods_receipt_id INTEGER NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE,
  purchase_order_item_id INTEGER NOT NULL REFERENCES purchase_order_items(id),
  quantity_received INTEGER NOT NULL,
  condition_notes TEXT, -- good, damaged, incomplete, etc
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_gr_items_gr ON goods_receipt_items(goods_receipt_id);
```

### Table 13: `service_workorders`
```sql
CREATE TABLE service_workorders (
  id SERIAL PRIMARY KEY,
  wo_no VARCHAR(50) UNIQUE NOT NULL, -- WO-YYYY-MM-NNN
  date_created DATE NOT NULL,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  device_type VARCHAR(50), -- laptop, desktop, printer, etc
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  device_serial VARCHAR(100),
  issue_description TEXT NOT NULL,
  status VARCHAR(30) DEFAULT 'intake', -- intake, diagnosis, in_repair, qa, completed, returned
  assigned_technician_id INTEGER REFERENCES users(id),
  date_completed DATE,
  parts_cost DECIMAL(12,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  additional_cost DECIMAL(12,2) DEFAULT 0,
  total_cost DECIMAL(12,2) DEFAULT 0,
  service_price DECIMAL(12,2) NOT NULL, -- what customer pays
  margin DECIMAL(12,2), -- auto calculated: service_price - total_cost
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_service_workorders_wo_no ON service_workorders(wo_no);
CREATE INDEX idx_service_workorders_customer ON service_workorders(customer_id);
CREATE INDEX idx_service_workorders_technician ON service_workorders(assigned_technician_id);
CREATE INDEX idx_service_workorders_status ON service_workorders(status);
CREATE INDEX idx_service_workorders_date ON service_workorders(date_created);
```

### Table 14: `service_workorder_items` (Parts Used)
```sql
CREATE TABLE service_workorder_items (
  id SERIAL PRIMARY KEY,
  service_workorder_id INTEGER NOT NULL REFERENCES service_workorders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  cost_price DECIMAL(12,2) NOT NULL, -- cost at time of use
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_service_items_workorder ON service_workorder_items(service_workorder_id);
CREATE INDEX idx_service_items_product ON service_workorder_items(product_id);
```

### Table 15: `expenses`
```sql
CREATE TABLE expenses (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  category_id INTEGER NOT NULL REFERENCES expense_categories(id),
  description VARCHAR(200) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(30), -- 'cash', 'transfer', 'credit_card'
  receipt_file_path VARCHAR(255), -- file path to uploaded receipt
  approved BOOLEAN DEFAULT false,
  approved_by INTEGER REFERENCES users(id),
  notes TEXT,
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP
);

CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);
CREATE INDEX idx_expenses_approved ON expenses(approved);
```

### Table 16: `expense_categories`
```sql
CREATE TABLE expense_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  code VARCHAR(20),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Sample categories:
-- Rental, Utilities, Salaries, Equipment, Office Supplies, 
-- Marketing, Transportation, Internet, Insurance, Maintenance,
-- Licenses, Professional Services, etc.
```

### Table 17: `financial_reports`
```sql
CREATE TABLE financial_reports (
  id SERIAL PRIMARY KEY,
  report_type VARCHAR(30) NOT NULL, -- 'income_statement', 'balance_sheet'
  period_type VARCHAR(20) NOT NULL, -- 'monthly', 'yearly'
  period_year INTEGER NOT NULL,
  period_month INTEGER, -- null for yearly
  revenue_sales DECIMAL(12,2),
  revenue_service DECIMAL(12,2),
  total_revenue DECIMAL(12,2),
  cogs DECIMAL(12,2),
  gross_profit DECIMAL(12,2),
  gross_margin_percent DECIMAL(5,2),
  operating_expenses DECIMAL(12,2),
  net_profit DECIMAL(12,2),
  net_margin_percent DECIMAL(5,2),
  data JSONB, -- detailed breakdown
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  generated_by INTEGER NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_financial_reports_period ON financial_reports(period_year, period_month);
```

### Table 18: `activity_logs` (Audit Trail)
```sql
CREATE TABLE activity_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL, -- 'create_invoice', 'update_stock', 'delete_expense'
  table_name VARCHAR(100),
  record_id INTEGER,
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX idx_activity_logs_table ON activity_logs(table_name);
```

### Table 19: `system_settings`
```sql
CREATE TABLE system_settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  type VARCHAR(20), -- 'string', 'number', 'boolean', 'json'
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER REFERENCES users(id)
);

-- Sample settings:
-- company_name, company_phone, company_address
-- tax_rate, default_currency, fiscal_year_start
-- auto_backup_enabled, backup_frequency
```

### Table 20: `notifications`
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type VARCHAR(50), -- 'low_stock', 'payment_due', 'invoice_created'
  title VARCHAR(200),
  message TEXT,
  reference_type VARCHAR(50), -- 'product', 'invoice', 'po'
  reference_id INTEGER,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
```

---

## PART 2: API ENDPOINTS SPECIFICATION

### Authentication Endpoints

#### POST /api/auth/login
```
Request:
{
  "email": "user@example.com",
  "password": "password123"
}

Response (200):
{
  "success": true,
  "data": {
    "user_id": 1,
    "email": "user@example.com",
    "full_name": "John Doe",
    "role": "operator",
    "permissions": ["create_invoice", "create_po", "manage_inventory"],
    "access_token": "eyJhbGc..."
  }
}
```

#### POST /api/auth/logout
```
Request:
Authorization: Bearer <access_token>

Response (200):
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Product/Inventory Endpoints

#### GET /api/products
```
Query Parameters:
?category=laptop&status=active&limit=50&offset=0

Response (200):
{
  "success": true,
  "data": [
    {
      "id": 1,
      "sku": "LAP-001",
      "name": "Laptop Dell XPS 13",
      "category": "laptop",
      "current_stock": 5,
      "min_stock_threshold": 3,
      "cost_price": 8000000,
      "selling_price": 9500000,
      "status": "active"
    },
    ...
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST /api/products
```
Request:
{
  "sku": "LAP-002",
  "name": "Laptop HP Pavilion",
  "category": "laptop",
  "cost_price": 6000000,
  "selling_price": 7500000,
  "min_stock_threshold": 2,
  "supplier_id": 1
}

Response (201):
{
  "success": true,
  "data": {
    "id": 2,
    "sku": "LAP-002",
    "name": "Laptop HP Pavilion",
    ...
  }
}
```

#### GET /api/products/:id
```
Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "sku": "LAP-001",
    "name": "Laptop Dell XPS 13",
    "category": "laptop",
    "current_stock": 5,
    "stock_movements": [ // last 10 movements
      {
        "date": "2026-05-19",
        "movement_type": "sales_out",
        "quantity_change": -1,
        "before_stock": 6,
        "after_stock": 5,
        "reference_no": "INV-202605-001"
      },
      ...
    ]
  }
}
```

#### PUT /api/products/:id
```
Request:
{
  "selling_price": 9800000,
  "min_stock_threshold": 4
}

Response (200):
{
  "success": true,
  "data": { ... }
}
```

### Sales Invoice Endpoints

#### POST /api/sales-invoices
```
Request:
{
  "customer_id": 1,
  "items": [
    { "product_id": 1, "quantity": 1, "unit_price": 9500000 },
    { "product_id": 5, "quantity": 2, "unit_price": 500000 }
  ],
  "discount_percent": 5,
  "tax_rate": 10,
  "payment_method": "transfer",
  "notes": "Delivery to office"
}

Response (201):
{
  "success": true,
  "data": {
    "id": 101,
    "invoice_no": "INV-202605-001",
    "customer": { "id": 1, "name": "PT ABC" },
    "items": [...],
    "subtotal": 10000000,
    "discount_amount": 500000,
    "tax_amount": 950000,
    "total": 10450000,
    "payment_status": "pending",
    "created_at": "2026-05-19T10:30:00Z"
  }
}

Side Effects:
- inventory.current_stock reduced for each product
- stock_movements entries created
- financial_reports (monthly) updated
- notifications sent if stock falls below threshold
```

#### GET /api/sales-invoices
```
Query Parameters:
?date_from=2026-05-01&date_to=2026-05-31&customer_id=1&payment_status=pending

Response (200):
{
  "success": true,
  "data": [
    {
      "id": 101,
      "invoice_no": "INV-202605-001",
      "date": "2026-05-19",
      "customer": { "id": 1, "name": "PT ABC" },
      "total": 10450000,
      "payment_status": "pending",
      "created_by": "Budi"
    },
    ...
  ],
  "summary": {
    "total_revenue": 50000000,
    "total_pending": 10450000,
    "total_completed": 39550000
  }
}
```

#### PUT /api/sales-invoices/:id/payment
```
Request:
{
  "amount_paid": 10450000,
  "payment_date": "2026-05-20",
  "notes": "Transfer received"
}

Response (200):
{
  "success": true,
  "data": {
    "id": 101,
    "payment_status": "completed",
    "amount_paid": 10450000,
    ...
  }
}
```

### Purchase Order Endpoints

#### POST /api/purchase-orders
```
Request:
{
  "supplier_id": 1,
  "items": [
    { "product_id": 1, "quantity": 10, "unit_price": 8000000 },
    { "product_id": 5, "quantity": 20, "unit_price": 400000 }
  ],
  "discount_percent": 2,
  "expected_delivery": "2026-05-26",
  "payment_term": "DP 50%",
  "notes": "Monthly stock replenishment"
}

Response (201):
{
  "success": true,
  "data": {
    "id": 50,
    "po_no": "PO-202605-001",
    "supplier": { "id": 1, "name": "Supplier ABC" },
    "items": [...],
    "total": 87600000,
    "status": "draft",
    "created_at": "2026-05-19T10:30:00Z"
  }
}
```

#### POST /api/purchase-orders/:id/submit
```
Request: {} (or with notes)

Response (200):
{
  "success": true,
  "data": {
    "id": 50,
    "po_no": "PO-202605-001",
    "status": "submitted",
    "submitted_at": "2026-05-19T10:35:00Z"
  }
}
```

#### POST /api/goods-receipts
```
Request:
{
  "purchase_order_id": 50,
  "items": [
    { "purchase_order_item_id": 1, "quantity_received": 10, "condition_notes": "good" },
    { "purchase_order_item_id": 2, "quantity_received": 20, "condition_notes": "good" }
  ],
  "notes": "Goods received in good condition"
}

Response (201):
{
  "success": true,
  "data": {
    "id": 30,
    "gr_no": "GR-202605-001",
    "purchase_order_id": 50,
    "receipt_date": "2026-05-22",
    "created_at": "2026-05-22T14:30:00Z"
  }
}

Side Effects:
- PO status changed to 'received' or 'partial_received'
- inventory.current_stock increased for each product
- cost_price updated to new supplier price (if different)
- stock_movements entries created
- notifications sent to owner if new stock added
```

### Service Workorder Endpoints

#### POST /api/service-workorders
```
Request:
{
  "customer_id": 2,
  "device_type": "laptop",
  "device_brand": "Dell",
  "device_model": "XPS 13",
  "device_serial": "ABC123456",
  "issue_description": "Laptop not turning on, possible motherboard issue",
  "assigned_technician_id": 5
}

Response (201):
{
  "success": true,
  "data": {
    "id": 1,
    "wo_no": "WO-202605-001",
    "customer": { "id": 2, "name": "John Doe" },
    "device": { "type": "laptop", "brand": "Dell", "model": "XPS 13" },
    "status": "intake",
    "assigned_technician": { "id": 5, "name": "Rudi" },
    "created_at": "2026-05-19T11:00:00Z"
  }
}
```

#### POST /api/service-workorders/:id/add-parts
```
Request:
{
  "parts": [
    { "product_id": 10, "quantity": 1 }, // Motherboard
    { "product_id": 15, "quantity": 2 }  // RAM modules
  ]
}

Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "wo_no": "WO-202605-001",
    "parts_used": [
      { "product_id": 10, "product_name": "Motherboard", "quantity": 1, "cost_price": 2000000 },
      { "product_id": 15, "product_name": "RAM 8GB", "quantity": 2, "cost_price": 500000 }
    ],
    "parts_cost": 3000000
  }
}

Side Effects:
- inventory.current_stock decreased for each part
- stock_movements entries created
- service_workorder.parts_cost updated
- service_workorder.total_cost recalculated
```

#### PUT /api/service-workorders/:id/status
```
Request:
{
  "status": "completed", // or 'diagnosis', 'in_repair', 'qa'
  "labor_cost": 500000,
  "additional_cost": 0,
  "service_price": 4000000,
  "notes": "Motherboard replaced, tested and working fine"
}

Response (200):
{
  "success": true,
  "data": {
    "id": 1,
    "wo_no": "WO-202605-001",
    "status": "completed",
    "total_cost": 3500000,
    "service_price": 4000000,
    "margin": 500000,
    "margin_percent": 12.5
  }
}

Side Effects:
- When status = 'completed': auto-generate service invoice
```

### Expense Endpoints

#### POST /api/expenses
```
Request:
{
  "date": "2026-05-19",
  "category_id": 1, // Rental
  "description": "Office rent for May",
  "amount": 5000000,
  "payment_method": "transfer",
  "notes": "Monthly office lease"
}

Response (201):
{
  "success": true,
  "data": {
    "id": 1,
    "date": "2026-05-19",
    "category": { "id": 1, "name": "Rental" },
    "description": "Office rent for May",
    "amount": 5000000,
    "created_at": "2026-05-19T09:30:00Z"
  }
}

Side Effects:
- Expense added to monthly P&L calculation
```

### Financial Reports Endpoints

#### GET /api/reports/income-statement
```
Query Parameters:
?period=monthly&year=2026&month=5
// OR
?period=yearly&year=2026

Response (200):
{
  "success": true,
  "data": {
    "report_type": "income_statement",
    "period": "May 2026",
    "revenue": {
      "sales": 50000000,
      "service": 5000000,
      "total": 55000000
    },
    "cost_of_goods_sold": {
      "inventory_cost": 35000000
    },
    "gross_profit": 20000000,
    "gross_margin_percent": 36.4,
    "operating_expenses": {
      "rental": 5000000,
      "utilities": 2000000,
      "salaries": 8000000,
      "other": 1500000,
      "total": 16500000
    },
    "net_profit": 3500000,
    "net_margin_percent": 6.36,
    "generated_at": "2026-05-31T23:59:59Z"
  }
}
```

#### GET /api/reports/balance-sheet
```
Query Parameters:
?date=2026-05-31

Response (200):
{
  "success": true,
  "data": {
    "assets": {
      "current": {
        "cash": 25000000,
        "receivables": 5000000,
        "inventory": 45000000,
        "total": 75000000
      },
      "total": 75000000
    },
    "liabilities": {
      "current": {
        "payables": 20000000,
        "total": 20000000
      },
      "total": 20000000
    },
    "equity": {
      "capital": 50000000,
      "retained_earnings": 5000000,
      "total": 55000000
    },
    "date": "2026-05-31",
    "generated_at": "2026-05-31T23:59:59Z"
  }
}
```

### Dashboard/Analytics Endpoints

#### GET /api/analytics/kpi
```
Query Parameters:
?period=monthly&year=2026&month=5
// OR
?period=yearly&year=2026

Response (200):
{
  "success": true,
  "data": {
    "period": "May 2026",
    "kpi": {
      "revenue_ytd": 275000000,
      "revenue_period": 55000000,
      "profit_ytd": 15000000,
      "profit_period": 3500000,
      "margin_percent": 6.36,
      "inventory_value": 45000000,
      "cash_position": 25000000,
      "receivables": 5000000,
      "payables": 20000000
    },
    "top_products": [
      { "id": 1, "name": "Laptop Dell XPS 13", "qty_sold": 5, "revenue": 47500000 },
      { "id": 5, "name": "USB Adapter", "qty_sold": 50, "revenue": 5000000 }
    ],
    "service_contribution": {
      "service_revenue": 5000000,
      "service_margin": 1000000,
      "percent_of_total": 9.1
    },
    "low_stock_products": [
      { "id": 2, "sku": "LAP-002", "current_stock": 2, "min_threshold": 3 }
    ]
  }
}
```

#### GET /api/analytics/charts
```
Query Parameters:
?type=sales_trend&period=monthly&year=2026

Response (200):
{
  "success": true,
  "data": {
    "type": "sales_trend",
    "period": "2026",
    "data": [
      { "month": "January", "revenue": 50000000, "profit": 3000000 },
      { "month": "February", "revenue": 52000000, "profit": 3100000 },
      { "month": "March", "revenue": 55000000, "profit": 3500000 },
      { "month": "April", "revenue": 53000000, "profit": 3200000 },
      { "month": "May", "revenue": 55000000, "profit": 3500000 }
    ]
  }
}
```

---

## PART 3: DEVELOPMENT GUIDELINES

### Git Workflow

```
Main branches:
  - main (production-ready)
  - develop (integration branch)
  
Feature workflow:
  1. Create branch: git checkout -b feature/invoice-module
  2. Develop & test
  3. Create pull request
  4. Code review
  5. Merge to develop
  6. Test in staging
  7. Merge to main (release)

Naming conventions:
  - feature/: new feature (feature/dashboard)
  - bugfix/: bug fix (bugfix/inventory-stock)
  - hotfix/: urgent production fix (hotfix/payment-error)
  - test/: testing branch (test/load-test)
```

### Code Standards

**Backend (Node.js/Express):**
```typescript
// Always use TypeScript
// Folder structure:
src/
  ├── controllers/
  ├── services/
  ├── models/
  ├── routes/
  ├── middleware/
  ├── utils/
  ├── validators/
  └── config/

// Example controller:
export async function createInvoice(req: Request, res: Response) {
  try {
    const { customerId, items, discountPercent } = req.body;
    
    // Validate
    const validated = invoiceSchema.parse(req.body);
    
    // Business logic
    const invoice = await invoiceService.create(validated);
    
    // Update inventory (trigger)
    await inventoryService.decreaseStock(invoice.items);
    
    // Respond
    res.status(201).json({ success: true, data: invoice });
  } catch (error) {
    // Error handling
    res.status(400).json({ success: false, error: error.message });
  }
}
```

**Frontend (React/TypeScript):**
```typescript
// Component structure:
src/
  ├── components/
  │   ├── common/ (reusable components)
  │   ├── dashboard/
  │   ├── transactions/
  │   └── reports/
  ├── hooks/ (custom hooks)
  ├── stores/ (Zustand state)
  ├── api/ (API calls)
  ├── types/ (TypeScript types)
  └── pages/ (page routes)

// Example API call:
export async function createInvoice(data: CreateInvoiceInput) {
  const response = await fetch('/api/sales-invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) throw new Error('Failed to create invoice');
  return response.json();
}

// Example component:
export function InvoiceForm() {
  const [loading, setLoading] = useState(false);
  const form = useForm<CreateInvoiceInput>();
  
  const onSubmit = async (data: CreateInvoiceInput) => {
    setLoading(true);
    try {
      await createInvoice(data);
      toast.success('Invoice created');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      {/* form fields */}
    </form>
  );
}
```

### Error Handling Standards

```typescript
// Define error codes:
enum ErrorCode {
  INVALID_INPUT = 'INVALID_INPUT',
  STOCK_INSUFFICIENT = 'STOCK_INSUFFICIENT',
  SUPPLIER_NOT_FOUND = 'SUPPLIER_NOT_FOUND',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
}

// Standard error response:
{
  "success": false,
  "error": {
    "code": "STOCK_INSUFFICIENT",
    "message": "Product XYZ has only 2 units, but 5 requested",
    "details": { "product_id": 1, "available": 2, "requested": 5 }
  }
}
```

### Testing Standards

```
Unit tests: 80%+ coverage of business logic
Integration tests: All critical workflows
E2E tests: Main user journeys

Example test:
test('creating invoice should decrease inventory', async () => {
  const before = await getStock(productId);
  
  await createInvoice({
    items: [{ productId, quantity: 2 }]
  });
  
  const after = await getStock(productId);
  expect(after).toBe(before - 2);
});
```

---

