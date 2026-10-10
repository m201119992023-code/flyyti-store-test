
export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category_id: string | null;
  sub_category_id: string | null;
  created_at: string;
  variants?: Variant[];
}

export interface Variant {
  id: string;
  product_id: string;
  barcode: string | null;
  name: string;
  cost_price: number;
  sale_price: number;
  suggested_discount: number;
  stock_quantity: number;
  supplier: string | null;
  manufacturer: string | null;
  created_at: string;
}

export interface Invoice {
  id: string;
  total_amount: number;
  discount: number;
  net_amount: number;
  total_cost: number;
  profit: number;
  created_at: string;
  items?: InvoiceItem[];
  services?: ExtraService[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  variant_id: string | null;
  product_name: string;
  variant_name: string | null;
  quantity: number;
  cost_price: number;
  sale_price: number;
}

export interface ExtraService {
  id?: string;
  invoice_id?: string;
  name: string;
  cost_price: number;
  sale_price: number;
  quantity: number;
}

export interface Expense {
  id: string;
  type: string;
  amount: number;
  date: string;
  note: string | null;
}

export interface Purchase {
  id: string;
  amount: number;
  supplier: string | null;
  date: string;
  note: string | null;
}

export interface Customer {
  id: string;
  customer_name: string;
  national_id: string;
  phone_number: string;
  purchase_date: string;
  purchase_price: number;
  phone_model: string;
  storage_capacity: string;
  model_number: string | null;
  color: string | null;
  imei1: string | null;
  imei2: string | null;
  serial_number: string | null;
  created_at: string;
}

export interface AppSettings {
  id: number;
  username: string;
  password?: string;
  page_password?: string;
  capital: number;
  savings: number;
  protection_enabled: boolean;
  login_protection_enabled: boolean;
  page_locks: Record<string, boolean>;
  profit_shares: {
    mujahed: number;
    abboud: number;
    shop: number;
    special: number;
  };
}
