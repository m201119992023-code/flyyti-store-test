-- Flyyti Mobile POS - Full Database Schema v7.0 (Updated Service Tracking)

-- 1. Settings Table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL DEFAULT 'admin',
    password TEXT NOT NULL DEFAULT 'admin',
    page_password TEXT NOT NULL DEFAULT '1234',
    capital DECIMAL(15,2) DEFAULT 0,
    savings DECIMAL(15,2) DEFAULT 0,
    protection_enabled BOOLEAN DEFAULT TRUE,
    login_protection_enabled BOOLEAN DEFAULT TRUE,
    page_locks JSONB DEFAULT '{"pos": false, "daily_reports": true, "inventory": true, "categories": true, "customers": true, "expenses": true, "invoices": true, "reports": true, "security": true}',
    profit_shares JSONB DEFAULT '{"mujahed": 25, "abboud": 25, "shop": 40, "special": 10}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- 2. Categories Table
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    sub_category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    supplier TEXT, 
    manufacturer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Variants Table
CREATE TABLE IF NOT EXISTS variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    barcode TEXT UNIQUE, 
    name TEXT NOT NULL DEFAULT 'افتراضي',
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    suggested_discount DECIMAL(15,2) NOT NULL DEFAULT 0,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    supplier TEXT, 
    manufacturer TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Invoices Table
CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY, 
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    discount DECIMAL(15,2) DEFAULT 0,
    net_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    total_cost DECIMAL(15,2) DEFAULT 0,
    profit DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Invoice Items Table
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES variants(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    cost_price DECIMAL(15,2) NOT NULL,
    sale_price DECIMAL(15,2) NOT NULL
);

-- 7. Extra Services Table (Updated with service_type)
CREATE TABLE IF NOT EXISTS extra_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    name TEXT NOT NULL, 
    service_type TEXT NOT NULL DEFAULT 'خدمة', -- 'صيانة', 'خدمة', 'أجهزة'
    cost_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    sale_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1
);

-- 8. Phone Customers Table
CREATE TABLE IF NOT EXISTS phone_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name TEXT NOT NULL,
    national_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
    purchase_price DECIMAL(15,2) NOT NULL DEFAULT 0,
    phone_model TEXT NOT NULL,
    storage_capacity TEXT NOT NULL,
    model_number TEXT,
    color TEXT,
    imei1 TEXT,
    imei2 TEXT,
    serial_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Expenses Table
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Purchases Table
CREATE TABLE IF NOT EXISTS purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    amount DECIMAL(15,2) NOT NULL,
    supplier TEXT,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_variants_barcode ON variants(barcode);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at);
CREATE INDEX IF NOT EXISTS idx_extra_services_type ON extra_services(service_type);

-- Enable RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow All" ON settings FOR ALL USING (true);
CREATE POLICY "Allow All Cat" ON categories FOR ALL USING (true);
CREATE POLICY "Allow All Prod" ON products FOR ALL USING (true);
CREATE POLICY "Allow All Var" ON variants FOR ALL USING (true);
CREATE POLICY "Allow All Inv" ON invoices FOR ALL USING (true);
CREATE POLICY "Allow All InvIt" ON invoice_items FOR ALL USING (true);
CREATE POLICY "Allow All ExSer" ON extra_services FOR ALL USING (true);
CREATE POLICY "Allow All PhCu" ON phone_customers FOR ALL USING (true);
CREATE POLICY "Allow All Exp" ON expenses FOR ALL USING (true);
CREATE POLICY "Allow All Pur" ON purchases FOR ALL USING (true);