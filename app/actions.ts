'use server';

import { revalidatePath } from 'next/cache';
import { checkIsAdmin } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { saveProduct, saveVariants, deleteProduct, saveCoupon, deleteCoupon, getCoupons } from '@/lib/data';
import { Product, Coupon } from '@/types';

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
    revalidatePath('/cart');
    revalidatePath('/checkout');
    revalidatePath('/sriyamadmin/products');
    revalidatePath('/sriyamadmin/coupons');
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
    const isUpdate = Boolean(productData.id && isRealUuid(productData.id));

    // Product name validation: mandatory for new products; for updates, only validated if provided
    const rawName = productData.name !== undefined ? (productData.name || '').trim() : undefined;
    if (!isUpdate && !rawName) {
      return { success: false, error: 'Product name is required.' };
    }

    const cleanPayload: Record<string, any> = {};

    if (rawName !== undefined) {
      if (!rawName && !isUpdate) {
        return { success: false, error: 'Product name is required.' };
      }
      if (rawName) {
        cleanPayload.name = rawName;
      }
    }

    if (productData.slug !== undefined) {
      const rawSlug = (productData.slug || cleanPayload.name || '').toLowerCase().trim();
      const cleanSlug = rawSlug
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || `product-${Date.now()}`;
      cleanPayload.slug = cleanSlug;
    } else if (!isUpdate && cleanPayload.name) {
      const cleanSlug = cleanPayload.name.toLowerCase().trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '') || `product-${Date.now()}`;
      cleanPayload.slug = cleanSlug;
    }

    if (productData.description !== undefined) {
      cleanPayload.description = productData.description?.trim() || null;
    } else if (!isUpdate) {
      cleanPayload.description = null;
    }

    if (productData.price !== undefined) {
      cleanPayload.price = Math.max(0, Number(productData.price) || 0);
    } else if (!isUpdate) {
      cleanPayload.price = 0;
    }

    if (productData.compare_at_price !== undefined) {
      cleanPayload.compare_at_price = Math.max(0, Number(productData.compare_at_price) || 0);
    } else if (!isUpdate) {
      cleanPayload.compare_at_price = 0;
    }

    if (productData.images !== undefined) {
      cleanPayload.images = Array.isArray(productData.images) ? productData.images.filter(Boolean) : [];
    } else if (!isUpdate) {
      cleanPayload.images = [];
    }

    if (productData.stock !== undefined) {
      cleanPayload.stock = Math.max(0, Number(productData.stock) || 0);
    } else if (!isUpdate) {
      cleanPayload.stock = 0;
    }

    if (productData.category_id !== undefined) {
      cleanPayload.category_id = productData.category_id && isRealUuid(productData.category_id) ? productData.category_id : null;
    } else if (!isUpdate) {
      cleanPayload.category_id = null;
    }

    if (productData.weight_grams !== undefined) {
      cleanPayload.weight_grams = Math.max(0, Number(productData.weight_grams) || 300);
    } else if (!isUpdate) {
      cleanPayload.weight_grams = 300;
    }

    if (productData.is_active !== undefined) {
      cleanPayload.is_active = productData.is_active;
    } else if (!isUpdate) {
      cleanPayload.is_active = true;
    }

    if (productData.is_featured !== undefined) {
      cleanPayload.is_featured = productData.is_featured;
    } else if (!isUpdate) {
      cleanPayload.is_featured = false;
    }

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
      if (isUpdate) {
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

/**
 * Dedicated Server Action to toggle the is_featured flag for a product.
 * Atomically updates ONLY the is_featured column in PostgreSQL.
 * NEVER alters price, stock, images, description, or other fields!
 */
export async function toggleProductFeaturedAction(
  productId: string,
  isFeatured: boolean
): Promise<ActionResponse<Product>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to feature products. Please sign in at /sriyamadmin/login.',
      };
    }

    if (!productId || !isRealUuid(productId)) {
      return { success: false, error: 'Invalid product ID.' };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      try {
        const saved = await saveProduct({ id: productId, is_featured: isFeatured });
        await revalidateStorefront();
        return { success: true, data: saved };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to toggle featured status in fallback mode.' };
      }
    }

    const { data, error } = await adminSupabase
      .from('products')
      .update({ is_featured: isFeatured })
      .eq('id', productId)
      .select('*, category:categories(*)')
      .single();

    if (error || !data) {
      console.error('[toggleProductFeaturedAction error]', error);
      return {
        success: false,
        error: `Failed to update featured status: ${error?.message || 'Unknown database error'}`,
      };
    }

    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath('/sriyamadmin/products');
    } catch (err) {
      console.error('Failed to revalidate cache paths:', err);
    }

    return { success: true, data: data as Product };
  } catch (err: any) {
    console.error('[toggleProductFeaturedAction unexpected error]', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while toggling featured status.',
    };
  }
}

/**
 * Dedicated Server Action to toggle the is_active flag for a product.
 * Atomically updates ONLY the is_active column in PostgreSQL.
 * NEVER alters price, stock, images, description, or other fields!
 */
export async function toggleProductActiveAction(
  productId: string,
  isActive: boolean
): Promise<ActionResponse<Product>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to change product status. Please sign in at /sriyamadmin/login.',
      };
    }

    if (!productId || !isRealUuid(productId)) {
      return { success: false, error: 'Invalid product ID.' };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      try {
        const saved = await saveProduct({ id: productId, is_active: isActive });
        await revalidateStorefront();
        return { success: true, data: saved };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to update active status in fallback mode.' };
      }
    }

    const { data, error } = await adminSupabase
      .from('products')
      .update({ is_active: isActive })
      .eq('id', productId)
      .select('*, category:categories(*)')
      .single();

    if (error || !data) {
      console.error('[toggleProductActiveAction error]', error);
      return {
        success: false,
        error: `Failed to update active status: ${error?.message || 'Unknown database error'}`,
      };
    }

    try {
      revalidatePath('/');
      revalidatePath('/shop');
      revalidatePath('/cart');
      revalidatePath('/sriyamadmin/products');
    } catch (err) {
      console.error('Failed to revalidate cache paths:', err);
    }

    return { success: true, data: data as Product };
  } catch (err: any) {
    console.error('[toggleProductActiveAction unexpected error]', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while toggling product status.',
    };
  }
}

/**
 * Server Action to load all coupons for the admin dashboard.
 * Uses service role client to bypass RLS so both active and inactive coupons are returned.
 */
export async function getCouponsAdminAction(): Promise<ActionResponse<Coupon[]>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to view coupons.',
      };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      const data = await getCoupons();
      return { success: true, data };
    }

    const { data, error } = await adminSupabase
      .from('coupons')
      .select('id, code, type, value, min_order_value, usage_limit, used_count, expires_at, active, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getCouponsAdminAction error]', error);
      return { success: false, error: `Failed to load coupons: ${error.message}` };
    }

    return { success: true, data: (data as Coupon[]) || [] };
  } catch (err: any) {
    console.error('[getCouponsAdminAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while loading coupons.' };
  }
}

/**
 * Server Action to save or update a coupon.
 * Strictly verifies admin privileges via checkIsAdmin() and uses service_role client.
 */
export async function saveCouponAction(couponData: Partial<Coupon>): Promise<ActionResponse<Coupon>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to manage coupons. Please sign in at /sriyamadmin/login.',
      };
    }

    const rawCode = (couponData.code || '').trim().toUpperCase();
    if (!rawCode) {
      return { success: false, error: 'Coupon code is required.' };
    }

    const cleanPayload = {
      code: rawCode,
      type: couponData.type || 'percentage',
      value: Number(couponData.value) || 0,
      min_order_value: Math.max(0, Number(couponData.min_order_value) || 0),
      usage_limit: couponData.usage_limit ? Math.max(1, Number(couponData.usage_limit)) : null,
      expires_at: couponData.expires_at || null,
      active: couponData.active ?? true,
    };

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      try {
        const saved = await saveCoupon({ ...cleanPayload, id: couponData.id });
        await revalidateStorefront();
        return { success: true, data: saved };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to save coupon in fallback mode.' };
      }
    }

    const isUpdate = Boolean(couponData.id && isRealUuid(couponData.id));
    let savedCoupon: Coupon;

    if (isUpdate) {
      const { data, error } = await adminSupabase
        .from('coupons')
        .update(cleanPayload)
        .eq('id', couponData.id)
        .select()
        .single();

      if (error || !data) {
        console.error('[saveCouponAction update error]', error);
        return { success: false, error: `Failed to update coupon: ${error?.message || 'Database error'}` };
      }
      savedCoupon = data as Coupon;
    } else {
      // Check for duplicate code
      const { data: existing } = await adminSupabase
        .from('coupons')
        .select('id, code')
        .eq('code', rawCode)
        .maybeSingle();

      if (existing) {
        return { success: false, error: `Coupon code "${rawCode}" already exists. Please choose a different code.` };
      }

      const { data, error } = await adminSupabase
        .from('coupons')
        .insert([{ ...cleanPayload, used_count: 0 }])
        .select()
        .single();

      if (error || !data) {
        console.error('[saveCouponAction insert error]', error);
        return { success: false, error: `Failed to create coupon: ${error?.message || 'Database error'}` };
      }
      savedCoupon = data as Coupon;
    }

    // Sync memory store
    try {
      await saveCoupon(savedCoupon);
    } catch {}

    try {
      revalidatePath('/sriyamadmin/coupons');
      revalidatePath('/cart');
      revalidatePath('/checkout');
    } catch (err) {
      console.error('Failed to revalidate coupon paths:', err);
    }

    return { success: true, data: savedCoupon };
  } catch (err: any) {
    console.error('[saveCouponAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while saving coupon.' };
  }
}

/**
 * Server Action to delete a coupon.
 * Strictly verifies admin privileges via checkIsAdmin() and uses service_role client.
 */
export async function deleteCouponAction(id: string): Promise<ActionResponse<boolean>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to delete coupons. Please sign in at /sriyamadmin/login.',
      };
    }

    if (!id) {
      return { success: false, error: 'Invalid coupon identifier.' };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      try {
        const ok = await deleteCoupon(id);
        await revalidateStorefront();
        return { success: true, data: ok };
      } catch (fbErr: any) {
        return { success: false, error: fbErr?.message || 'Failed to delete coupon in fallback mode.' };
      }
    }

    let error = null;
    if (isRealUuid(id)) {
      const res = await adminSupabase.from('coupons').delete().eq('id', id);
      error = res.error;
    } else {
      // In case ID is code
      const res = await adminSupabase.from('coupons').delete().eq('code', id.toUpperCase());
      error = res.error;
    }

    if (error) {
      console.error('[deleteCouponAction error]', error);
      return { success: false, error: `Failed to delete coupon: ${error.message}` };
    }

    // Sync memory store
    try {
      await deleteCoupon(id);
    } catch {}

    try {
      revalidatePath('/sriyamadmin/coupons');
      revalidatePath('/cart');
      revalidatePath('/checkout');
    } catch (err) {
      console.error('Failed to revalidate coupon paths:', err);
    }

    return { success: true, data: true };
  } catch (err: any) {
    console.error('[deleteCouponAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while deleting coupon.' };
  }
}

/**
 * Server Action to toggle a coupon's active status.
 */
export async function toggleCouponActiveAction(
  id: string,
  active: boolean
): Promise<ActionResponse<Coupon>> {
  try {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) {
      return {
        success: false,
        error: 'Unauthorized: You must be logged in as an administrator to modify coupons.',
      };
    }

    if (!id) {
      return { success: false, error: 'Invalid coupon identifier.' };
    }

    const adminSupabase = createAdminClient();
    if (!adminSupabase) {
      const saved = await saveCoupon({ id, active });
      return { success: true, data: saved };
    }

    const { data, error } = await adminSupabase
      .from('coupons')
      .update({ active })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('[toggleCouponActiveAction error]', error);
      return { success: false, error: `Failed to update coupon status: ${error?.message || 'Database error'}` };
    }

    try {
      revalidatePath('/sriyamadmin/coupons');
      revalidatePath('/cart');
      revalidatePath('/checkout');
    } catch (err) {
      console.error('Failed to revalidate coupon paths:', err);
    }

    return { success: true, data: data as Coupon };
  } catch (err: any) {
    console.error('[toggleCouponActiveAction unexpected error]', err);
    return { success: false, error: err?.message || 'An unexpected error occurred while updating coupon status.' };
  }
}

