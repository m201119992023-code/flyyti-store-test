# V25 Store management prototype
Routes: /#/store-products, /#/store-orders, /#/store-reports, /#/store-settings.
Imports inventory product/variant rows read-only from existing Supabase tables.
Draft storefront listings are stored in browser localStorage only; they do not publish to public store or mutate POS data.
Store orders and reports are placeholders, showing no fabricated real orders.
Security: Existing POS authentication gate remains; browser/sessionStorage gate is NOT a secure authorization boundary. Before real deployment implement server-side roles/RLS and a dedicated published catalog/orders API.
