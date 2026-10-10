# V26 — Product catalog database foundation

1. Review and run `sql/store_catalog_v26.sql` in Supabase SQL Editor.
2. Use Supabase Authentication to create/sign in a trusted store-admin user. POS's own password is not Supabase Auth.
3. In SQL Editor, grant that specific Auth user: `insert into public.store_admins(user_id) values ('USER_UUID');`
4. In `/#/store-products`, click `اتصال بكتالوج Supabase`, import stock variant, edit, and explicitly save.
5. A listing's published flag is stored in Supabase, **but the customer-facing store still uses demo products**. Do not deploy as live until the storefront reads the published catalog through a safe public view that checks inventory availability.
6. Image upload is not implemented; provide a hosted HTTPS URL. Local image drafts cannot be saved remotely.
7. Orders, reports and settings remain nonfunctional prototypes. No POS schema changes or stock mutations.
8. Validate existing POS `products/variants` RLS separately. Store admin policies protect `store_products`, not existing POS tables.
