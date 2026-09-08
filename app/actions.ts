'use server';

import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveProduct, saveVariants, deleteProduct } from '@/lib/data';
import { Product } from '@/types';

function isRealUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Triggers Next.js cache revalidation for storefront routes that consume
 * product, category, or coupon data. This ensures admin changes are reflected
 * instantly without waiting for ISR intervals.
 *
 * Guarded by a server-side is_admin check so this action cannot be called
 * directly by non-admin users to perform cache-flood attacks.
 */
export async function revalidateStorefront() {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    console.warn('[revalidateStorefront] Unauthorized call rejected.');
    return;
  }

  try {
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/sriyamadmin/products');
    revalidatePath('/product/[slug]', 'layout');
    revalidatePath('/product/[slug]', 'page');
  } catch (error) {
    console.error('Failed to revalidate cache paths:', error);
  }
}

/**
 * Server Action to save or update a product and its optional variants.
 * Strictly verifies server-side admin privileges via checkIsAdmin().
 * Uses service_role client when available to bypass client-side RLS glitches.
 */
export async function saveProductAction(
  productData: Partial<Product>,
  variantsData?: Array<{
    id?: string;
    size: string;
    price: number;
    compare_at_price: number;
    stock: number;
    is_active?: boolean;
  }>
): Promise<Product> {
  // 1. Strict server-side security check
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized. You must be logged in as an administrator to save products.');
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    // Fallback if service role key is not configured
    const saved = await saveProduct(productData);
    if (variantsData && variantsData.length > 0 && saved.id) {
      await saveVariants(saved.id, variantsData);
    }
    await revalidateStorefront();
    return saved;
  }

  let savedProduct: Product;

  // 2. Product Insert or Update via adminSupabase
  if (productData.id && isRealUuid(productData.id)) {
    const { data, error } = await adminSupabase
      .from('products')
      .update(productData)
      .eq('id', productData.id)
      .select('*, category:categories(*)')
      .single();

    if (error) {
      console.error('[saveProductAction update error]', error);
      throw new Error(`Failed to update product in Supabase: ${error.message}`);
    }
    savedProduct = data as Product;
  } else {
    // Clean id if it's a temp client ID or empty
    const { id, ...insertPayload } = productData;
    const { data, error } = await adminSupabase
      .from('products')
      .insert([insertPayload])
      .select('*, category:categories(*)')
      .single();

    if (error) {
      console.error('[saveProductAction insert error]', error);
      throw new Error(`Failed to save product to Supabase: ${error.message}`);
    }
    savedProduct = data as Product;
  }

  // 3. Variant rows upsert (e.g. A3 & A4 variants for Frames)
  if (variantsData && variantsData.length > 0 && savedProduct.id) {
    for (const v of variantsData) {
      const row = {
        product_id: savedProduct.id,
        size: v.size,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock: v.stock,
        is_active: v.is_active ?? true,
      };

      if (v.id && isRealUuid(v.id)) {
        const { error: vErr } = await adminSupabase
          .from('product_variants')
          .update(row)
          .eq('id', v.id);
        if (vErr) {
          console.error('[saveProductAction variant update error]', vErr);
          throw new Error(`Failed to update ${v.size} variant: ${vErr.message}`);
        }
      } else {
        const { error: vErr } = await adminSupabase
          .from('product_variants')
          .upsert(row, { onConflict: 'product_id,size' });
        if (vErr) {
          console.error('[saveProductAction variant upsert error]', vErr);
          throw new Error(`Failed to save ${v.size} variant: ${vErr.message}`);
        }
      }
    }

    // Sync products.price & compare_at_price to minimum variant price
    const minPrice = Math.min(...variantsData.map((v) => v.price));
    const minMrp = Math.min(...variantsData.map((v) => v.compare_at_price));
    await adminSupabase
      .from('products')
      .update({ price: minPrice, compare_at_price: minMrp })
      .eq('id', savedProduct.id);

    savedProduct.price = minPrice;
    savedProduct.compare_at_price = minMrp;
  }

  // 4. Instant cache revalidation
  try {
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/sriyamadmin/products');
    revalidatePath('/product/[slug]', 'layout');
    revalidatePath('/product/[slug]', 'page');
  } catch (err) {
    console.error('Failed to revalidate cache paths:', err);
  }

  return savedProduct;
}

/**
 * Server Action to delete a product.
 * Strictly verifies server-side admin privileges via checkIsAdmin().
 */
export async function deleteProductAction(id: string): Promise<boolean> {
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    throw new Error('Unauthorized. You must be logged in as an administrator to delete products.');
  }

  const adminSupabase = createAdminClient();
  if (!adminSupabase) {
    const ok = await deleteProduct(id);
    await revalidateStorefront();
    return ok;
  }

  const { error } = await adminSupabase.from('products').delete().eq('id', id);
  if (error) {
    console.error('[deleteProductAction error]', error);
    throw new Error(`Failed to delete product: ${error.message}`);
  }

  try {
    revalidatePath('/');
    revalidatePath('/shop');
    revalidatePath('/sriyamadmin/products');
    revalidatePath('/product/[slug]', 'layout');
    revalidatePath('/product/[slug]', 'page');
  } catch (err) {
    console.error('Failed to revalidate cache paths:', err);
  }

  return true;
}
