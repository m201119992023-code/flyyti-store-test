-- V26: separate online-store catalog; no changes to POS tables or inventory.
-- Run in Supabase SQL Editor, then grant a store admin explicitly.
create table if not exists public.store_admins (
 user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.store_admins enable row level security;
revoke all on public.store_admins from anon, authenticated;
-- This function checks membership without granting direct table access.
create or replace function public.is_store_admin()
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.store_admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_store_admin() from public;
grant execute on function public.is_store_admin() to authenticated;
create table if not exists public.store_products (
 id uuid primary key default gen_random_uuid(),
 source_product_id uuid not null references public.products(id) on delete restrict,
 source_variant_id uuid not null unique references public.variants(id) on delete restrict,
 name text not null check(length(trim(name))>0),
 description text not null default '',
 image_url text not null default '',
 price numeric(12,2) not null check(price>=0),
 old_price numeric(12,2) check(old_price is null or old_price>price),
 warranty text not null default '',
 published boolean not null default false,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
alter table public.store_products enable row level security;
drop policy if exists store_products_public_read on public.store_products;
create policy store_products_public_read on public.store_products for select to anon,authenticated
 using (published = true or (select public.is_store_admin()));
drop policy if exists store_products_admin_insert on public.store_products;
create policy store_products_admin_insert on public.store_products for insert to authenticated
 with check ((select public.is_store_admin()) and exists
  (select 1 from public.variants v where v.id=source_variant_id and v.product_id=source_product_id));
drop policy if exists store_products_admin_update on public.store_products;
create policy store_products_admin_update on public.store_products for update to authenticated
 using ((select public.is_store_admin()))
 with check ((select public.is_store_admin()) and exists
  (select 1 from public.variants v where v.id=source_variant_id and v.product_id=source_product_id));
drop policy if exists store_products_admin_delete on public.store_products;
create policy store_products_admin_delete on public.store_products for delete to authenticated
 using ((select public.is_store_admin()));
grant select on public.store_products to anon, authenticated;
grant insert,update,delete on public.store_products to authenticated;
-- Grant one Supabase Auth user only, from SQL Editor after identifying their UUID:
-- insert into public.store_admins(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
-- IMPORTANT: POS password/page lock is not Supabase Auth and cannot authorize store writes.
