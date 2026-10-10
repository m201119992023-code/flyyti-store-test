
-- Create customers table for mobile phone purchases
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC NOT NULL CHECK (purchase_price >= 0),
    phone_model TEXT NOT NULL,
    storage_capacity TEXT NOT NULL,
    model_number TEXT NULL,
    serial_number TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add performance indexes
CREATE INDEX IF NOT EXISTS idx_customers_national_id ON customers(national_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone_number ON customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_customers_serial_number ON customers(serial_number);
CREATE INDEX IF NOT EXISTS idx_customers_purchase_date ON customers(purchase_date);

-- Enable Row Level Security (RLS)
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Consistent with existing project settings, allowing public access for all operations
-- Note: In a strict production environment, this should be scoped to authenticated users
CREATE POLICY "Public Access" ON customers FOR ALL USING (true);
