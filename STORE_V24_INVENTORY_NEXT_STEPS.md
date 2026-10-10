# Flyyti V24 — Inventory preparation

The storefront still displays six **mock products** and **demo stock**. No real Supabase stock is fetched or changed; checkout remains a demo.

## Before connecting to real inventory
1. Confirm the POS products, variants, stock, prices and category tables/columns.
2. Confirm how stock is tracked for variants and multiple locations.
3. Decide which POS products may be published to the public storefront.
4. Create a server-controlled public catalog interface with restricted access; do not open POS tables to anonymous users.
5. Revalidate stock and prices server-side when placing a real order, and reserve/deduct stock transactionally.
6. Test product changes, out-of-stock items, concurrent checkouts and RLS permissions before production.

The V24 preview stock is only an interface preparation. It must not be represented as the actual POS inventory.
