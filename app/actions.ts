'use server';

import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveProduct, saveVariants, deleteProduct } from '@/lib/data';
import { Product } from '@/types';

export interface ActionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

function isRealUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Triggers Next.js cache revalidation for storefront routes that consume
 * product, category, or coupon data. This ensures admin changes are reflected
 * instantly without waiting for ISR intervals.
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
  } catch (error) {
    console.error('Failed to revalidate cache paths:', error);
  }
}

/**
 * Server Action to save or update a product and its optional variants.
 * Strictly verifies server-side admin privileges via checkIsAdmin().
 * Uses service_role client when available to bypass client-side RLS glitches.
 * Returns an ActionResponse object to avoid Next.js masking server action errors in production.
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
): Promise<ActionResponse<Product>> {
  try {
    // 1. Strict server-side security check
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to save products. Please sign in at /sriyamadmin/login.',
      };
    }

    // 2. Prepare clean sanitized payload matching PostgreSQL products table schema
    const name = (productData.name || '').trim();
    if (!name) {
      return { success: false, error: 'Product name is required.' };
    }

    const rawSlug = (productData.slug || name).toLowerCase().trim();
    const cleanSlug = rawSlug
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `product-${Date.now()}`;

    const cleanPayload: Record<string, any> = {
      name,
      slug: cleanSlug,
      description: productData.description?.trim() || null,
      price: Math.max(0, Number(productData.price) || 0),
      compare_at_price: Math.max(0, Number(productData.compare_at_price) || 0),
      images: Array.isArray(productData.images) ? productData.images.filter(Boolean) : [],
      stock: Math.max(0, Number(productData.stock) || 0),
      category_id: productData.category_id && isRealUuid(productData.category_id) ? productData.category_id : null,
      weight_grams: Math.max(0, Number(productData.weight_grams) || 300),
      is_active: productData.is_active ?? true,
      is_featured: productData.is_featured ?? false,
    };

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      // Fallback if service role key is not configured
      try {
        const saved = await saveProduct({ ...cleanPayload, id: productData.id });
        if (variantsData && variantsData.length > 0 && saved.id) {
          await saveVariants(saved.id, variantsData);
        }
        await revalidateStorefront();
        return { success: true, data: saved };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to save product in fallback mode.' };
      }
    }

    let savedProduct: Product;

    // Helper to perform upsert/insert with graceful retry if is_featured column is not yet migrated
    async function executeSave(payload: Record<string, any>): Promise<{ data: Product | null; error: any }> {
      if (productData.id && isRealUuid(productData.id)) {
        const res = await adminSupabase!
          .from('products')
          .update(payload)
          .eq('id', productData.id)
          .select('*, category:categories(*)')
          .single();
        return { data: res.data as Product, error: res.error };
      } else {
        const res = await adminSupabase!
          .from('products')
          .insert([payload])
          .select('*, category:categories(*)')
          .single();
        return { data: res.data as Product, error: res.error };
      }
    }

    // 3. Product Insert or Update via adminSupabase
    let { data, error } = await executeSave(cleanPayload);

    // If is_featured column is not yet created in the DB, retry without is_featured
    if (error && (error.message?.includes('is_featured') || error.code === 'PGRST204' || error.code === '42703')) {
      console.warn('[saveProductAction] is_featured column not found in database, falling back without is_featured');
      const { is_featured, ...fallbackPayload } = cleanPayload;
      const retry = await executeSave(fallbackPayload);
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      console.error('[saveProductAction error]', error);
      return { success: false, error: `Failed to save product to database: ${error?.message || 'Unknown database error'}` };
    }
    savedProduct = data;

    // 4. Variant rows upsert (e.g. A3 & A4 variants for Frames)
    if (variantsData && variantsData.length > 0 && savedProduct.id) {
      for (const v of variantsData) {
        const row = {
          product_id: savedProduct.id,
          size: v.size,
          price: Math.max(0, Number(v.price) || 0),
          compare_at_price: Math.max(0, Number(v.compare_at_price) || 0),
          stock: Math.max(0, Number(v.stock) || 0),
          is_active: v.is_active ?? true,
        };

        if (v.id && isRealUuid(v.id)) {
          const { error: vErr } = await adminSupabase
            .from('product_variants')
            .update(row)
            .eq('id', v.id);
          if (vErr) {
            console.error('[saveProductAction variant update error]', vErr);
            return { success: false, error: `Failed to update ${v.size} variant: ${vErr.message}` };
          }
        } else {
          const { error: vErr } = await adminSupabase
            .from('product_variants')
            .upsert(row, { onConflict: 'product_id,size' });
          if (vErr) {
            console.error('[saveProductAction variant upsert error]', vErr);
            return { success: false, error: `Failed to save ${v.size} variant: ${vErr.message}` };
          }
        }
      }

      // Sync products.price & compare_at_price to minimum variant price
      const minPrice = Math.min(...variantsData.map((v) => Number(v.price) || 0));
      const minMrp = Math.min(...variantsData.map((v) => Number(v.compare_at_price) || 0));
      await adminSupabase
        .from('products')
        .update({ price: minPrice, compare_at_price: minMrp })
        .eq('id', savedProduct.id);

      savedProduct.price = minPrice;
      savedProduct.compare_at_price = minMrp;
    }

    // 5. Instant cache revalidation
    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath('/sriyamadmin/products');
    } catch (err) {
      console.error('Failed to revalidate cache paths:', err);
    }

    return { success: true, data: savedProduct };
  } catch (err: any) {
    console.error('[saveProductAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while saving product.' };
  }
}

/**
 * Server Action to delete a product.
 * Strictly verifies server-side admin privileges via checkIsAdmin().
 */
export async function deleteProductAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to delete products. Please sign in at /sriyamadmin/login.',
      };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      try {
        const ok = await deleteProduct(id);
        await revalidateStorefront();
        return { success: true, data: ok };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to delete product in fallback mode.' };
      }
    }

    const { error } = await adminSupabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('[deleteProductAction error]', error);
      return { success: false, error: `Failed to delete product from database: ${error.message}` };
    }

    try {
      await deleteProduct(id);
    } catch {}

    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath('/cart');
      revalidatePath('/sriyamadmin/products');
    } catch (err) {
      console.error('Failed to revalidate cache paths:', err);
    }

    return { success: true, data: true };
  } catch (err: any) {
    console.error('[deleteProductAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while deleting product.' };
  }
}
