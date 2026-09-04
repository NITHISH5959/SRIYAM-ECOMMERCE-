-- =============================================
-- SRIYAM STORE - SUPABASE DATABASE SCHEMA
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. CATEGORIES TABLE
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null
);

-- 2. PRODUCTS TABLE
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  price numeric default 599,
  compare_at_price numeric default 649,
  images text[] default '{}',
  stock integer default 0,
  category_id uuid references categories(id) on delete set null,
  weight_grams integer default 300,
  is_active boolean default true,
  created_at timestamp with time zone default now()
);

-- 3. COUPONS TABLE
create table if not exists coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  type text not null check (type in ('percentage', 'flat', 'free_shipping')),
  value numeric,
  min_order_value numeric default 0,
  usage_limit integer,
  used_count integer default 0,
  expires_at timestamp with time zone,
  active boolean default true,
  created_at timestamp with time zone default now()
);

-- 4. PROFILES TABLE (linked to Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users primary key on delete cascade,
  full_name text,
  phone text,
  is_admin boolean default false
);

-- 5. ADDRESSES TABLE
create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null on delete cascade,
  name text,
  phone text,
  line1 text,
  line2 text,
  city text,
  state text,
  pincode text,
  is_default boolean default false
);

-- 6. ORDERS TABLE
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null on delete cascade,
  items jsonb not null,
  subtotal numeric,
  discount_amount numeric default 0,
  coupon_code text,
  shipping_fee numeric default 0,
  total numeric,
  status text default 'pending' check (status in ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  razorpay_order_id text,
  razorpay_payment_id text,
  shipping_address jsonb,
  created_at timestamp with time zone default now()
);

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

alter table categories enable row level security;
alter table products enable row level security;
alter table coupons enable row level security;
alter table profiles enable row level security;
alter table addresses enable row level security;
alter table orders enable row level security;

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  );
$$ language sql security definer;

-- Categories Policies
create policy "Categories public read" on categories
  for select using (true);

create policy "Categories admin insert" on categories
  for insert with check (public.is_admin());

create policy "Categories admin update" on categories
  for update using (public.is_admin());

create policy "Categories admin delete" on categories
  for delete using (public.is_admin());

-- Products Policies
create policy "Products public read active" on products
  for select using (is_active = true or public.is_admin());

create policy "Products admin insert" on products
  for insert with check (public.is_admin());

create policy "Products admin update" on products
  for update using (public.is_admin());

create policy "Products admin delete" on products
  for delete using (public.is_admin());

-- Coupons Policies
create policy "Coupons public read active" on coupons
  for select using ((active = true and (expires_at is null or expires_at > now())) or public.is_admin());

create policy "Coupons admin insert" on coupons
  for insert with check (public.is_admin());

create policy "Coupons admin update" on coupons
  for update using (public.is_admin());

create policy "Coupons admin delete" on coupons
  for delete using (public.is_admin());

-- Profiles Policies
create policy "Profiles user read own" on profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "Profiles user update own" on profiles
  for update using (id = auth.uid() or public.is_admin());

-- Addresses Policies
create policy "Addresses user full access" on addresses
  for all using (user_id = auth.uid() or public.is_admin());

-- Orders Policies
create policy "Orders user full access" on orders
  for all using (user_id = auth.uid() or public.is_admin());

-- =============================================
-- STORAGE BUCKET SETUP FOR PRODUCT IMAGES
-- =============================================
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Product images public read" on storage.objects
  for select using (bucket_id = 'product-images');

create policy "Product images admin write" on storage.objects
  for insert with check (bucket_id = 'product-images' and public.is_admin());

-- =============================================
-- PERFORMANCE INDEXES
-- =============================================
create index if not exists idx_products_slug on products(slug);
create index if not exists idx_products_category_id on products(category_id);
create index if not exists idx_products_is_active on products(is_active);
create index if not exists idx_orders_user_id on orders(user_id);
create index if not exists idx_coupons_code on coupons(code);

-- =============================================
-- STORED PROCEDURES (RPCs)
-- =============================================

-- Atomically decrements stock for a product, clamping at 0.
-- Called from verify-payment after a successful order is confirmed.
create or replace function public.decrement_stock(product_id uuid, qty integer)
returns void as $$
  update products
  set stock = greatest(0, stock - qty)
  where id = product_id;
$$ language sql security definer;

-- Atomically increments used_count for a coupon after a confirmed paid order.
-- Called from verify-payment so used_count only tracks real purchases.
create or replace function public.increment_coupon_usage(coupon_code text)
returns void as $$
  update coupons
  set used_count = used_count + 1
  where upper(code) = upper(coupon_code);
$$ language sql security definer;

-- =============================================
-- 7. PRODUCT VARIANTS TABLE (Frames A3 / A4)
-- =============================================

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references products(id) on delete cascade not null,
  size text not null,                  -- 'A3' | 'A4'
  price numeric not null,
  compare_at_price numeric,
  stock integer default 0,
  is_active boolean default true,
  created_at timestamp with time zone default now(),
  unique(product_id, size)
);

alter table product_variants enable row level security;

-- Public can read active variants for active products; admin sees all
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

-- Index for fast per-product variant lookup
create index if not exists idx_variants_product_id on product_variants(product_id);

-- Atomically decrements stock for a specific variant, clamping at 0.
-- Called from verify-payment for Frame orders after payment is confirmed.
create or replace function public.decrement_variant_stock(p_variant_id uuid, qty integer)
returns void as $$
  update product_variants
  set stock = greatest(0, stock - qty)
  where id = p_variant_id;
$$ language sql security definer;
