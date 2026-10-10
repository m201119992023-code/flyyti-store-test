# Flyyti V27 — independent test Supabase
- Project: https://whrnkydylmyjximunncv.supabase.co
- Publishable key supplied by project owner. No service_role or secret keys are included.
- Old Supabase fallback and browser localStorage overrides removed from both copies of supabase.ts.
- Vercel variables (optional; included defaults already target test): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY.
- IMPORTANT: Supabase Auth admin role/RLS may block the legacy POS login. Database schema must match the app. Do not disable RLS to bypass errors.
- Before deploying, inspect duplicate nested folder flyyti-mobile-pos-main/flyyti-mobile-pos-main. Deploy the OUTER flyyti-mobile-pos-main as Vercel root.
- This change does not complete orders/reports or public catalog sync.
