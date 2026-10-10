# V29 — Console fixes
- Fixes missing ShoppingBag import in App.tsx (fatal runtime ReferenceError).
- Bundles Tailwind CSS with PostCSS for production; `npm install` is required before building.
- Uses local PWA icons rather than an old Supabase project URL.
- Reports useful Supabase Auth error details on the login page.
- Does not change Supabase credentials or create admin users.

## Deploy
From the top-level `flyyti-mobile-pos-main` directory run `npm install`, `npm run build`, and deploy to Vercel. Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY target the same project as the user in Authentication > Users.

## If login still returns 400
Check Supabase > Authentication > Users for the exact email, confirmed status and password. The Auth account is separate from `settings` table. If login succeeds but admin permission fails, check `public.store_admins` membership and `public.is_store_admin()` RPC.
