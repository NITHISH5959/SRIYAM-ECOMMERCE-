-- =============================================
-- SRIYAM STORE - SEED DATA
-- =============================================

-- Clear existing data (optional for clean re-seed)
-- truncate categories, products, coupons cascade;

-- Insert Categories
insert into categories (id, name, slug)
values
  ('11111111-1111-1111-1111-111111111111', 'Frames', 'frames'),
  ('22222222-2222-2222-2222-222222222222', 'Rack Posters', 'rack-posters')
on conflict (slug) do update set name = excluded.name;

-- Insert 12 Products
insert into products (name, slug, description, price, compare_at_price, images, stock, category_id, weight_grams, is_active)
values
  -- Frames Category Products
  ('3 Rajas', '3-rajas', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Natarajar with Naalvar', 'natarajar-with-naalvar', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Uthiraapathiyaar', 'uthiraapathiyaar', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Thiruvaarur Thiyagarajar', 'thiruvaarur-thiyagarajar', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Panja Sabai', 'panja-sabai', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Aaru Padai Veedu', 'aaru-padai-veedu', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Pancha Bootham', 'pancha-bootham', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('Pancha Bootham Map', 'pancha-bootham-map', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),
  ('3 Sakthi', '3-sakthi', '', 599, 649, '{}', 10, '11111111-1111-1111-1111-111111111111', 300, true),

  -- Rack Posters Category Products
  ('276 Paadal Petra Sthalam', '276-paadal-petra-sthalam', '', 599, 649, '{}', 10, '22222222-2222-2222-2222-222222222222', 200, true),
  ('108 Divya Desam', '108-divya-desam', '', 599, 649, '{}', 10, '22222222-2222-2222-2222-222222222222', 200, true),
  ('51 Sakthi Peedam', '51-sakthi-peedam', '', 599, 649, '{}', 10, '22222222-2222-2222-2222-222222222222', 200, true)
on conflict (slug) do update set
  name = excluded.name,
  price = excluded.price,
  compare_at_price = excluded.compare_at_price,
  category_id = excluded.category_id;

-- Seed Sample Coupons
insert into coupons (code, type, value, min_order_value, usage_limit, active)
values
  ('SRIYAM10', 'percentage', 10, 500, 100, true),
  ('FLAT50', 'flat', 50, 500, 50, true),
  ('FREESHIP', 'free_shipping', 0, 0, 200, true)
on conflict (code) do nothing;

-- =============================================
-- Seed Frame Product Variants (A3 + A4)
-- Placeholder prices — update in admin panel.
-- ON CONFLICT DO NOTHING = safe to re-run.
-- =============================================

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = '3-rajas'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = '3-rajas'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'natarajar-with-naalvar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'natarajar-with-naalvar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'uthiraapathiyaar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'uthiraapathiyaar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'thiruvaarur-thiyagarajar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'thiruvaarur-thiyagarajar'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'panja-sabai'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'panja-sabai'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'aaru-padai-veedu'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'aaru-padai-veedu'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'pancha-bootham'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'pancha-bootham'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = 'pancha-bootham-map'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = 'pancha-bootham-map'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A3', 599, 649, 10, true from products where slug = '3-sakthi'
on conflict (product_id, size) do nothing;

insert into product_variants (product_id, size, price, compare_at_price, stock, is_active)
select id, 'A4', 799, 899, 10, true from products where slug = '3-sakthi'
on conflict (product_id, size) do nothing;

