/**
 * TEMPORARY DIAGNOSTIC ENDPOINT — DELETE AFTER VERIFICATION
 * GET /api/verify-supabase
 * Tests: env vars, schema tables, seed data counts, RLS policies.
 */
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  const report: Record<string, any> = {};

  // ── 1. Env Vars ────────────────────────────────────────────────────────────
  report.env = {
    NEXT_PUBLIC_SUPABASE_URL: url
      ? (url.includes('your-supabase-project-id') || url.includes('placeholder')
        ? 'PLACEHOLDER — replace it' : `OK: ${url}`)
      : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anon
      ? (anon.includes('placeholder') ? 'PLACEHOLDER — replace it' : `OK (length=${anon.length})`)
      : 'MISSING',
    SUPABASE_SERVICE_ROLE_KEY: service
      ? (service.includes('placeholder') ? 'PLACEHOLDER — replace it' : `OK (length=${service.length})`)
      : 'MISSING',
  };

  if (!url || !anon || !service) {
    return NextResponse.json({ error: 'One or more required env vars are missing. See env section.', report }, { status: 500 });
  }

  // ── 2. Anon client — basic connectivity ────────────────────────────────────
  const anonClient = createClient(url, anon);
  const serviceClient = createClient(url, service, {
    auth: { persistSession: false },
  });

  // ── 3. Table existence & row counts (service role bypasses RLS) ────────────
  const tables = ['categories', 'products', 'product_variants', 'coupons', 'profiles', 'addresses', 'orders'];
  const tableResults: Record<string, any> = {};

  for (const table of tables) {
    const { count, error } = await serviceClient
      .from(table)
      .select('*', { count: 'exact', head: true });
    tableResults[table] = error
      ? `ERROR: ${error.message}`
      : `EXISTS — ${count ?? 0} rows`;
  }
  report.tables = tableResults;

  // ── 4. Seed data spot-checks ───────────────────────────────────────────────
  const { data: cats, error: catErr } = await serviceClient
    .from('categories').select('id, name, slug');
  report.seed_categories = catErr
    ? `ERROR: ${catErr.message}`
    : (cats?.length === 2
      ? `OK: ${cats.map((c: any) => c.name).join(', ')}`
      : `WARN: expected 2, got ${cats?.length ?? 0} — ${cats?.map((c: any) => c.name).join(', ')}`);

  const { data: prods, error: prodErr } = await serviceClient
    .from('products').select('id, name, slug');
  report.seed_products = prodErr
    ? `ERROR: ${prodErr.message}`
    : (prods?.length === 12
      ? `OK: 12 products found`
      : `WARN: expected 12, got ${prods?.length ?? 0}`);

  if (prods && prods.length > 0) {
    report.product_names = prods.map((p: any) => p.name);
  }

  // Check variants for the 9 frame products
  const { data: variantData, error: varErr } = await serviceClient
    .from('product_variants')
    .select('id, product_id, size, price, stock');
  report.seed_variants = varErr
    ? `ERROR: ${varErr.message}`
    : (variantData && variantData.length >= 18
      ? `OK: ${variantData.length} variant rows (expected 18 for 9 frames x 2 sizes)`
      : `WARN: expected 18, got ${variantData?.length ?? 0}`);

  // ── 5. Anon public read check (RLS) ───────────────────────────────────────
  const { data: anonProds, error: anonProdErr } = await anonClient
    .from('products').select('id, name, price').eq('is_active', true).limit(5);
  report.rls_anon_read_products = anonProdErr
    ? `ERROR (RLS blocking or table missing): ${anonProdErr.message}`
    : `OK — anon can read ${anonProds?.length ?? 0} active products`;

  const { data: anonCats, error: anonCatErr } = await anonClient
    .from('categories').select('id, name').limit(5);
  report.rls_anon_read_categories = anonCatErr
    ? `ERROR: ${anonCatErr.message}`
    : `OK — anon can read ${anonCats?.length ?? 0} categories`;

  const { data: anonVars, error: anonVarErr } = await anonClient
    .from('product_variants').select('id, size, price').limit(5);
  report.rls_anon_read_variants = anonVarErr
    ? `ERROR: ${anonVarErr.message}`
    : `OK — anon can read ${anonVars?.length ?? 0} variants`;

  // ── 6. Anon should NOT be able to write products ───────────────────────────
  const { error: anonWriteErr } = await anonClient
    .from('products')
    .insert([{ name: '__rls_test__', slug: `__rls_test_${Date.now()}__`, price: 1 }]);
  report.rls_anon_write_blocked = anonWriteErr
    ? `OK — write correctly blocked: ${anonWriteErr.message}`
    : 'WARN — anon was able to insert a product! RLS may be disabled or misconfigured.';

  // ── 7. Sample product detail with variants ─────────────────────────────────
  const { data: sampleProd, error: sampleErr } = await anonClient
    .from('products')
    .select('id, name, price')
    .eq('slug', '3-rajas')
    .single();

  if (!sampleErr && sampleProd) {
    const { data: sampleVars, error: sampleVarErr } = await anonClient
      .from('product_variants')
      .select('size, price, stock')
      .eq('product_id', sampleProd.id)
      .eq('is_active', true)
      .order('size');
    report.sample_product = {
      name: sampleProd.name,
      price: sampleProd.price,
      variants: sampleVarErr ? `ERROR: ${sampleVarErr.message}` : sampleVars,
    };
  } else {
    report.sample_product = sampleErr
      ? `ERROR: ${sampleErr.message}`
      : 'Product "3-rajas" not found — seed data may be missing';
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const hasErrors = JSON.stringify(report).includes('ERROR') || JSON.stringify(report).includes('MISSING');
  report._summary = hasErrors
    ? 'ISSUES FOUND — review each section above'
    : 'ALL CHECKS PASSED — live Supabase connection verified';

  return NextResponse.json(report, { status: hasErrors ? 207 : 200 });
}
