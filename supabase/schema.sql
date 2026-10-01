-- =============================================
-- SRIYAM STORE - FIX SCRIPT
-- Safely drops old policies to avoid "already exists" errors,
-- then recreates everything including the signup trigger.
-- Safe to run even if some of this already exists.
-- =============================================

-- ---- Drop existing policies (ignore errors if they don't exist) ----
drop policy if exists "Categories public read" on categories;
drop policy if exists "Categories admin insert" on categories;
drop policy if exists "Categories admin update" on categories;
drop policy if exists "Categories admin delete" on categories;

drop policy if exists "Products public read active" on products;
drop policy if exists "Products admin insert" on products;
drop policy if exists "Products admin update" on products;
drop policy if exists "Products admin delete" on products;

drop policy if exists "Coupons public read active" on coupons;
drop policy if exists "Coupons admin insert" on coupons;
drop policy if exists "Coupons admin update" on coupons;
drop policy if exists "Coupons admin delete" on coupons;

drop policy if exists "Profiles user read own" on profiles;
drop policy if exists "Profiles user insert own" on profiles;
drop policy if exists "Profiles user update own" on profiles;

drop policy if exists "Addresses user full access" on addresses;
drop policy if exists "Orders user full access" on orders;

drop policy if exists "Variants public read active" on product_variants;
drop policy if exists "Variants admin insert" on product_variants;
drop policy if exists "Variants admin update" on product_variants;
drop policy if exists "Variants admin delete" on product_variants;

drop policy if exists "Product images public read" on storage.objects;
drop policy if exists "Product images admin write" on storage.objects;

-- ---- Recreate helper function ----
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- ---- Recreate all policies ----
create policy "Categories public read" on categories
  for select using (true);
create policy "Categories admin insert" on categories
  for insert with check (public.is_admin());
create policy "Categories admin update" on categories
  for update using (public.is_admin());
create policy "Categories admin delete" on categories
  for delete using (public.is_admin());

create policy "Products public read active" on products
  for select using (is_active = true or public.is_admin());
create policy "Products admin insert" on products
  for insert with check (public.is_admin());
create policy "Products admin update" on products
  for update using (public.is_admin());
create policy "Products admin delete" on products
  for delete using (public.is_admin());

create policy "Coupons public read active" on coupons
  for select using ((active = true and (expires_at is null or expires_at > now())) or public.is_admin());
create policy "Coupons admin insert" on coupons
  for insert with check (public.is_admin());
create policy "Coupons admin update" on coupons
  for update using (public.is_admin());
create policy "Coupons admin delete" on coupons
  for delete using (public.is_admin());

create policy "Profiles user read own" on profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "Profiles user insert own" on profiles
  for insert with check (id = auth.uid() or public.is_admin());
create policy "Profiles user update own" on profiles
  for update using (id = auth.uid() or public.is_admin());

create policy "Addresses user full access" on addresses
  for all using (user_id = auth.uid() or public.is_admin());

create policy "Orders user full access" on orders
  for all using (user_id = auth.uid() or public.is_admin());

create policy "Variants public read active" on product_variants
  for select using (
    (is_active = true
      and exists (
        select 1 from products p where p.id = product_id and p.is_active = true
      )
    ) or public.is_admin()
  );
create policy "Variants admin insert" on product_variants
  for insert with check (public.is_admin());
create policy "Variants admin update" on product_variants
  for update using (public.is_admin());
create policy "Variants admin delete" on product_variants
  for delete using (public.is_admin());

create policy "Product images public read" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "Product images admin write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

-- ---- THE CRITICAL FIX: recreate the signup trigger ----
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    false
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    phone = excluded.phone;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---- Verify ----
select 'Trigger installed:' as check, count(*) as result
from pg_trigger where tgname = 'on_auth_user_created';

-- =============================================
-- MIGRATION: Featured products & Manual pricing
-- Run this in Supabase SQL Editor:
-- =============================================
alter table public.products add column if not exists is_featured boolean not null default false;
alter table public.products alter column price drop default;
alter table public.products alter column compare_at_price drop default;

-- =============================================
-- MIGRATION: Sequential Order IDs (SRI001, SRI002, ...)
-- =============================================
create sequence if not exists public.order_number_seq start with 1 increment by 1;

create or replace function public.generate_order_number()
returns text as $$
declare
  next_val bigint;
begin
  next_val := nextval('public.order_number_seq');
  return 'SRI' || lpad(next_val::text, greatest(3, length(next_val::text)), '0');
end;
$$ language plpgsql;

alter table public.orders 
  add column if not exists order_number text unique default public.generate_order_number();

create or replace function public.set_order_number()
returns trigger as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.generate_order_number();
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trigger_set_order_number on public.orders;
create trigger trigger_set_order_number
  before insert on public.orders
  for each row
  execute function public.set_order_number();

create unique index if not exists orders_order_number_idx on public.orders(order_number);

-- =============================================
-- MIGRATION: Guest Account Auto-Creation & Linking
-- Run this in Supabase SQL Editor:
-- =============================================
alter table public.profiles add column if not exists email text;
alter table public.addresses add column if not exists email text;
alter table public.orders add column if not exists contact_email text;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, phone, email, is_admin)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    new.email,
    false
  )
  on conflict (id) do update set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    phone = coalesce(excluded.phone, public.profiles.phone),
    email = coalesce(excluded.email, public.profiles.email);
  return new;
end;
$$ language plpgsql security definer;

-- =============================================
-- MIGRATION: Atomic Stock Reduction Functions
-- Run this in Supabase SQL Editor:
-- =============================================
create or replace function public.decrement_stock(product_id uuid, qty int)
returns void as $$
begin
  update public.products
  set stock = greatest(0, stock - qty)
  where id = product_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_stock(product_id text, qty int)
returns void as $$
begin
  update public.products
  set stock = greatest(0, stock - qty)
  where id = product_id::uuid;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_variant_stock(p_variant_id uuid, qty int)
returns void as $$
begin
  update public.product_variants
  set stock = greatest(0, stock - qty)
  where id = p_variant_id;
end;
$$ language plpgsql security definer;

create or replace function public.decrement_variant_stock(p_variant_id text, qty int)
returns void as $$
begin
  update public.product_variants
  set stock = greatest(0, stock - qty)
  where id = p_variant_id::uuid;
end;
$$ language plpgsql security definer;

-- =============================================
-- MIGRATION: Search Performance Indexes
-- Run this in Supabase SQL Editor:
-- =============================================
create extension if not exists pg_trgm;

create index if not exists idx_products_is_active on public.products(is_active);
create index if not exists idx_products_name_trgm on public.products using gin (name gin_trgm_ops);
create index if not exists idx_products_description_trgm on public.products using gin (description gin_trgm_ops);
create index if not exists idx_categories_name_trgm on public.categories using gin (name gin_trgm_ops);

-- =============================================
-- MIGRATION: Guest Order Claim Performance Indexes
-- Run this in Supabase SQL Editor:
-- =============================================
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_contact_email on public.orders(lower(contact_email));
create index if not exists idx_addresses_user_id on public.addresses(user_id);

-- =============================================
-- MIGRATION: Atomic Conditional Stock Deduction Functions
-- Run this in Supabase SQL Editor:
-- =============================================

-- 1. Atomic Product Stock Deduction (Posters / standard items)
create or replace function public.deduct_product_stock_atomic(p_id uuid, p_qty int)
returns boolean as $$
declare
  rows_updated int;
begin
  update public.products
  set stock = stock - p_qty
  where id = p_id and is_active = true and stock >= p_qty;
  
  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$ language plpgsql security definer;

create or replace function public.deduct_product_stock_atomic(p_id text, p_qty int)
returns boolean as $$
begin
  return public.deduct_product_stock_atomic(p_id::uuid, p_qty);
end;
$$ language plpgsql security definer;

-- 2. Atomic Variant Stock Deduction (Frames / sized items)
create or replace function public.deduct_variant_stock_atomic(p_variant_id uuid, p_qty int)
returns boolean as $$
declare
  rows_updated int;
begin
  update public.product_variants
  set stock = stock - p_qty
  where id = p_variant_id and is_active = true and stock >= p_qty;
  
  get diagnostics rows_updated = row_count;
  return rows_updated > 0;
end;
$$ language plpgsql security definer;

create or replace function public.deduct_variant_stock_atomic(p_variant_id text, p_qty int)
returns boolean as $$
begin
  return public.deduct_variant_stock_atomic(p_variant_id::uuid, p_qty);
end;
$$ language plpgsql security definer;