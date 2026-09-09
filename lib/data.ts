import { Category, Product, ProductVariant, Coupon, Address, Order } from '@/types';
import { createClient, isSupabaseConfigured } from './supabase/client';
import { createAdminClient } from './supabase/admin';
import { validateAddress } from './shipping';
import { formatOrderNumber, isValidOrderNumber } from './orders';

export const INITIAL_CATEGORIES: Category[] = [
  { id: '11111111-1111-1111-1111-111111111111', name: 'Frames', slug: 'frames' },
  { id: '22222222-2222-2222-2222-222222222222', name: 'Rack Posters', slug: 'rack-posters' },
];

export const INITIAL_PRODUCTS: Product[] = [
  { id: 'p1', name: '3 Rajas', slug: '3-rajas', description: 'Sacred artwork depicting the divine triad of celestial rulers in traditional gold foil framing.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p2', name: 'Natarajar with Naalvar', slug: 'natarajar-with-naalvar', description: 'Lord Natarajar in cosmic dance flanked by the revered Tamil Saivite saint poets (Naalvar).', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p3', name: 'Uthiraapathiyaar', slug: 'uthiraapathiyaar', description: 'Auspicious portrait of Lord Shiva as Uthiraapathiyaar from sacred temple iconography.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p4', name: 'Thiruvaarur Thiyagarajar', slug: 'thiruvaarur-thiyagarajar', description: 'Reverently framed representation of Thiruvaarur Lord Thiyagarajar in divine majesty.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p5', name: 'Panja Sabai', slug: 'panja-sabai', description: 'Heritage frame illustrating the five cosmic dance halls (Panja Sabai) of Lord Shiva.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p6', name: 'Aaru Padai Veedu', slug: 'aaru-padai-veedu', description: 'Grand frame capturing the six sacred abodes (Aaru Padai Veedu) of Lord Murugan.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p7', name: 'Pancha Bootham', slug: 'pancha-bootham', description: 'Sacred frame art representing the five elemental Shiva temples (Pancha Bootha Sthalangal).', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p8', name: 'Pancha Bootham Map', slug: 'pancha-bootham-map', description: 'Detailed geographic and spiritual mapping frame of the 5 elemental temples.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p9', name: '3 Sakthi', slug: '3-sakthi', description: 'Spiritual frame celebrating the divine triad of Goddesses Lakshmi, Saraswati, and Parvati.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '11111111-1111-1111-1111-111111111111', weight_grams: 300, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[0] },
  { id: 'p10', name: '276 Paadal Petra Sthalam', slug: '276-paadal-petra-sthalam', description: 'Comprehensive archival poster listing all 276 Paadal Petra Shiva Sthalams with temple details.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '22222222-2222-2222-2222-222222222222', weight_grams: 200, is_active: true, is_featured: true, category: INITIAL_CATEGORIES[1] },
  { id: 'p11', name: '108 Divya Desam', slug: '108-divya-desam', description: 'Sacred poster enumerating the 108 Divya Desams glorified in the Naalayira Divya Prabandham.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '22222222-2222-2222-2222-222222222222', weight_grams: 200, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[1] },
  { id: 'p12', name: '51 Sakthi Peedam', slug: '51-sakthi-peedam', description: 'Detailed heritage poster mapping the 51 Shakti Peethas with pilgrimage reference details.', price: 599, compare_at_price: 649, images: [], stock: 10, category_id: '22222222-2222-2222-2222-222222222222', weight_grams: 200, is_active: true, is_featured: false, category: INITIAL_CATEGORIES[1] },
];

export const INITIAL_COUPONS: Coupon[] = [
  { id: 'c1', code: 'SRIYAM10', type: 'percentage', value: 10, min_order_value: 500, usage_limit: 100, used_count: 14, expires_at: '2026-12-31T23:59:59Z', active: true },
  { id: 'c2', code: 'FLAT50', type: 'flat', value: 50, min_order_value: 500, usage_limit: 50, used_count: 8, expires_at: '2026-12-31T23:59:59Z', active: true },
  { id: 'c3', code: 'FREESHIP', type: 'free_shipping', value: 0, min_order_value: 999, usage_limit: 200, used_count: 32, expires_at: null, active: true },
];

// ── In-memory demo variants for all 9 Frame products ──────────────────────────
const FRAME_SLUGS = ['p1','p2','p3','p4','p5','p6','p7','p8','p9'];
const INITIAL_VARIANTS: ProductVariant[] = FRAME_SLUGS.flatMap((pid, i) => [
  { id: `v${i*2+1}`, product_id: pid, size: 'A3', price: 599, compare_at_price: 649, stock: 10, is_active: true },
  { id: `v${i*2+2}`, product_id: pid, size: 'A4', price: 799, compare_at_price: 899, stock: 10, is_active: true },
]);

// In-memory stores
let memoryProducts: Product[] = [...INITIAL_PRODUCTS];
let memoryCoupons: Coupon[] = [...INITIAL_COUPONS];
let memoryCategories: Category[] = [...INITIAL_CATEGORIES];
let memoryVariants: ProductVariant[] = [...INITIAL_VARIANTS];
let memoryAddresses: Address[] = [
  { id: 'addr_1', user_id: 'demo_user_id', name: 'Sriram Ramanathan', phone: '+91 98765 43210', line1: '42 South Mada Street, Mylapore', line2: 'Near Kapaleeshwarar Temple', city: 'Chennai', state: 'Tamil Nadu', pincode: '600004', is_default: true },
];
export let memoryOrders: Order[] = [];
let memoryOrderSeq = 0;

export function getNextMemoryOrderNumber(): string {
  memoryOrderSeq += 1;
  return formatOrderNumber(memoryOrderSeq);
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function getCategories(): Promise<Category[]> {
  try {
    if (!isSupabaseConfigured()) return memoryCategories;
    const supabase = createClient();
    const { data, error } = await supabase.from('categories').select('id, name, slug');
    if (!error && data && data.length > 0) return data;

    // If Supabase table is empty, auto-seed default categories
    const { data: seeded } = await supabase.from('categories').upsert(INITIAL_CATEGORIES).select('id, name, slug');
    if (seeded && seeded.length > 0) return seeded;
  } catch (err) {
    console.error('[getCategories error]', err);
  }
  return memoryCategories;
}

// ─── Products ─────────────────────────────────────────────────────────────

export async function getProducts(categorySlug?: string): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    const isFiltered = categorySlug && categorySlug !== 'all';
    const selectClause = isFiltered
      ? '*, category:categories!inner(*)'
      : '*, category:categories(*)';
    let query = supabase.from('products').select(selectClause).eq('is_active', true);
    if (isFiltered) {
      query = query.eq('category.slug', categorySlug);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) return data as unknown as Product[];
  } catch {}
  let result = memoryProducts.filter(p => p.is_active);
  if (categorySlug && categorySlug !== 'all') {
    const cat = memoryCategories.find(c => c.slug === categorySlug);
    if (cat) result = result.filter(p => p.category_id === cat.id);
  }
  return result;
}

export async function getFeaturedProducts(): Promise<Product[]> {
  try {
    const all = await getProducts();
    const featured = all.filter((p) => p.is_featured === true);
    return featured;
  } catch (err) {
    console.error('[getFeaturedProducts error]', err);
    return [];
  }
}

export async function getAllProductsAdmin(): Promise<Product[]> {
  try {
    if (!isSupabaseConfigured()) return memoryProducts;
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*)')
      .order('created_at', { ascending: false });
    if (!error && data && data.length > 0) return data as unknown as Product[];
  } catch {}
  return memoryProducts;
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  try {
    if (!isSupabaseConfigured()) {
      const p = memoryProducts.find(p => p.slug === slug) || null;
      if (p) {
        const variants = memoryVariants.filter(v => v.product_id === p.id && v.is_active);
        return { ...p, variants: variants.length > 0 ? variants : undefined };
      }
      return null;
    }
    const supabase = createClient();
    const { data, error } = await supabase
      .from('products')
      .select('*, category:categories(*), variants:product_variants(*)')
      .eq('slug', slug)
      .single();

    if (!error && data) {
      const product = data as unknown as Product;
      if ((data as any).variants && Array.isArray((data as any).variants)) {
        const activeVars = ((data as any).variants as ProductVariant[]).filter(v => v.is_active);
        if (activeVars.length > 0) {
          product.variants = activeVars.sort((a, b) => a.size.localeCompare(b.size));
        }
      }
      return product;
    }
  } catch {}
  const p = memoryProducts.find(p => p.slug === slug) || null;
  if (p) {
    const variants = memoryVariants.filter(v => v.product_id === p.id && v.is_active);
    return { ...p, variants: variants.length > 0 ? variants : undefined };
  }
  return null;
}

/** Returns true if the string looks like a real Supabase UUID (not a local demo ID). */
function isRealUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

export async function saveProduct(product: Partial<Product>): Promise<Product> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    if (product.id && isRealUuid(product.id)) {
      // Update existing row
      const { data, error } = await supabase.from('products').update(product).eq('id', product.id).select('*, category:categories(*)').single();
      if (error) {
        console.error('[saveProduct update error]', error);
        throw new Error(error.message || 'Failed to update product in Supabase database');
      }
      if (data) return data as Product;
    } else {
      // Insert new row
      const { data, error } = await supabase.from('products').insert([product]).select('*, category:categories(*)').single();
      if (error) {
        console.error('[saveProduct insert error]', error);
        throw new Error(error.message || 'Failed to insert product into Supabase database');
      }
      if (data) return data as Product;
    }
  }

  // Fallback for local demo mode without Supabase credentials
  if (product.id) {
    const idx = memoryProducts.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      const cat = memoryCategories.find(c => c.id === product.category_id);
      memoryProducts[idx] = { ...memoryProducts[idx], ...product, category: cat } as Product;
      return memoryProducts[idx];
    }
  }
  const cat = memoryCategories.find(c => c.id === product.category_id);
  const newProduct: Product = {
    id: `p_${Date.now()}`, name: product.name || 'Untitled', slug: product.slug || `product-${Date.now()}`,
    description: product.description || '', price: Number(product.price) || 0,
    compare_at_price: Number(product.compare_at_price) || 0, images: product.images || [],
    stock: Number(product.stock) || 0, category_id: product.category_id || null,
    weight_grams: Number(product.weight_grams) || 300, is_active: product.is_active ?? true,
    is_featured: product.is_featured ?? false, category: cat,
  };
  memoryProducts = [newProduct, ...memoryProducts];
  return newProduct;
}

export async function deleteProduct(id: string): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) {
      console.error('[deleteProduct error]', error);
      throw new Error(error.message || 'Failed to delete product from Supabase database');
    }
    memoryProducts = memoryProducts.filter(p => p.id !== id);
    return true;
  }
  memoryProducts = memoryProducts.filter(p => p.id !== id);
  return true;
}

// ─── Product Variants ────────────────────────────────────────────────────────

export async function getVariantsByProductId(productId: string): Promise<ProductVariant[]> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, size, price, compare_at_price, stock, is_active')
      .eq('product_id', productId)
      .order('size');
    if (!error && data) return data as ProductVariant[];
  } catch {}
  return memoryVariants.filter(v => v.product_id === productId);
}

/**
 * Upserts A3 and A4 variant rows for a product.
 * `variants` should be an array of at most 2 items with size, price, compare_at_price, stock.
 * Also updates products.price to the minimum variant price so ProductCard shows the right "From ₹" price.
 */
export async function saveVariants(productId: string, variants: Array<{
  id?: string;
  size: string;
  price: number;
  compare_at_price: number;
  stock: number;
  is_active?: boolean;
}>): Promise<boolean> {
  if (isSupabaseConfigured()) {
    const supabase = createClient();
    for (const v of variants) {
      const row = {
        product_id: productId,
        size: v.size,
        price: v.price,
        compare_at_price: v.compare_at_price,
        stock: v.stock,
        is_active: v.is_active ?? true,
      };
      if (v.id && isRealUuid(v.id)) {
        const { error } = await supabase.from('product_variants').update(row).eq('id', v.id);
        if (error) {
          console.error('[saveVariants update error]', error);
          throw new Error(error.message || `Failed to update ${v.size} variant in Supabase database`);
        }
      } else {
        const { error } = await supabase.from('product_variants')
          .upsert(row, { onConflict: 'product_id,size' });
        if (error) {
          console.error('[saveVariants upsert error]', error);
          throw new Error(error.message || `Failed to save ${v.size} variant in Supabase database`);
        }
      }
    }
    // Keep products.price synced to minimum variant price for ProductCard "From ₹" display
    const minPrice = Math.min(...variants.map(v => v.price));
    const minMrp = Math.min(...variants.map(v => v.compare_at_price));
    const { error: syncError } = await supabase.from('products').update({ price: minPrice, compare_at_price: minMrp }).eq('id', productId);
    if (syncError) {
      console.error('[saveVariants product price sync error]', syncError);
    }
    return true;
  }
  // Demo mode fallback
  memoryVariants = memoryVariants.filter(v => v.product_id !== productId);
  variants.forEach((v, i) => {
    memoryVariants.push({
      id: v.id || `v_${Date.now()}_${i}`,
      product_id: productId,
      size: v.size,
      price: v.price,
      compare_at_price: v.compare_at_price,
      stock: v.stock,
      is_active: v.is_active ?? true,
    });
  });
  const minPrice = Math.min(...variants.map(v => v.price));
  const minMrp = Math.min(...variants.map(v => v.compare_at_price));
  const idx = memoryProducts.findIndex(p => p.id === productId);
  if (idx !== -1) {
    memoryProducts[idx] = { ...memoryProducts[idx], price: minPrice, compare_at_price: minMrp };
  }
  return true;
}

/** Fetch specific variants by their UUIDs — used in payment verification. */
export async function getVariantsByIds(variantIds: string[]): Promise<ProductVariant[]> {
  if (variantIds.length === 0) return [];
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    const { data, error } = await supabase
      .from('product_variants')
      .select('id, product_id, size, price, compare_at_price, stock, is_active')
      .in('id', variantIds);
    if (!error && data) return data as ProductVariant[];
  } catch {}
  return memoryVariants.filter(v => variantIds.includes(v.id));
}

/**
 * Decrement stock for variant items (Frames).
 * Mirrors deductStock but targets product_variants table.
 */
export async function deductVariantStock(
  items: Array<{ variant_id: string; quantity: number; name: string }>
): Promise<string | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const ids = items.map(i => i.variant_id);
      const { data: liveVariants, error } = await supabase
        .from('product_variants')
        .select('id, stock')
        .in('id', ids);

      if (!error && liveVariants) {
        for (const item of items) {
          const lv = liveVariants.find(v => v.id === item.variant_id);
          if (!lv) return `"${item.name}" could not be found.`;
          if (lv.stock < item.quantity) {
            return `"${item.name}" only has ${lv.stock} unit(s) left in stock.`;
          }
        }
        for (const item of items) {
          await supabase.rpc('decrement_variant_stock', { p_variant_id: item.variant_id, qty: item.quantity });
        }
        // Sync memory
        for (const item of items) {
          const lv = liveVariants.find(v => v.id === item.variant_id);
          const idx = memoryVariants.findIndex(v => v.id === item.variant_id);
          if (idx !== -1 && lv) {
            memoryVariants[idx] = { ...memoryVariants[idx], stock: Math.max(0, lv.stock - item.quantity) };
          }
        }
        return null;
      }
    } catch (err) {
      console.warn('[deductVariantStock] Live check failed, falling back to memory store:', err);
    }
  }

  // Fallback: memory store
  for (const item of items) {
    const v = memoryVariants.find(v => v.id === item.variant_id);
    if (v && v.stock < item.quantity) {
      return `"${item.name}" only has ${v.stock} unit(s) left in stock.`;
    }
  }
  for (const item of items) {
    const idx = memoryVariants.findIndex(v => v.id === item.variant_id);
    if (idx !== -1) {
      memoryVariants[idx] = { ...memoryVariants[idx], stock: Math.max(0, memoryVariants[idx].stock - item.quantity) };
    }
  }
  return null;
}

/**
 * Decrement stock for purchased items.
 * When Supabase is configured, fetches live stock values from the DB so the
 * pre-check is not based on a potentially-stale in-memory snapshot.
 * Returns an error string if any item is out of stock, or null on success.
 */
export async function deductStock(items: Array<{ product_id: string; quantity: number; name: string }>): Promise<string | null> {
  if (isSupabaseConfigured()) {
    // Fetch current live stock from Supabase for authoritative check
    try {
      const supabase = createClient();
      const ids = items.map(i => i.product_id);
      const { data: liveProducts, error } = await supabase
        .from('products')
        .select('id, stock, name')
        .in('id', ids);

      if (!error && liveProducts) {
        for (const item of items) {
          const liveProduct = liveProducts.find(p => p.id === item.product_id);
          if (!liveProduct) {
            return `"${item.name}" could not be found.`;
          }
          if (liveProduct.stock < item.quantity) {
            return `"${item.name}" only has ${liveProduct.stock} unit(s) left in stock.`;
          }
        }
        // All checks passed — deduct via RPC
        for (const item of items) {
          await supabase.rpc('decrement_stock', { product_id: item.product_id, qty: item.quantity });
        }
        // Sync memory store
        for (const item of items) {
          const idx = memoryProducts.findIndex(p => p.id === item.product_id);
          const live = liveProducts.find(p => p.id === item.product_id);
          if (idx !== -1 && live) {
            memoryProducts[idx] = { ...memoryProducts[idx], stock: Math.max(0, live.stock - item.quantity) };
          }
        }
        return null;
      }
    } catch (err) {
      console.warn('[deductStock] Live stock check failed, falling back to memory store:', err);
    }
  }

  // Fallback: memory-store check (demo mode / Supabase not configured)
  for (const item of items) {
    const product = memoryProducts.find(p => p.id === item.product_id);
    if (product) {
      if (product.stock < item.quantity) {
        return `"${item.name}" only has ${product.stock} unit(s) left in stock.`;
      }
    }
  }
  // Deduct from memory store
  for (const item of items) {
    const idx = memoryProducts.findIndex(p => p.id === item.product_id);
    if (idx !== -1) {
      memoryProducts[idx] = { ...memoryProducts[idx], stock: Math.max(0, memoryProducts[idx].stock - item.quantity) };
    }
  }
  return null;
}

// ─── Coupons ─────────────────────────────────────────────────────────────────

export async function getCoupons(): Promise<Coupon[]> {
  try {
    if (!isSupabaseConfigured()) return memoryCoupons;
    const supabase = createClient();
    const { data, error } = await supabase.from('coupons').select('id, code, type, value, min_order_value, usage_limit, used_count, expires_at, active, created_at').order('created_at', { ascending: false });
    if (!error && data && data.length > 0) return data as Coupon[];
  } catch {}
  return memoryCoupons;
}

export async function validateCouponCode(code: string, subtotal: number): Promise<{ success: boolean; coupon?: Coupon; discountAmount: number; isFreeShipping: boolean; message: string }> {
  const cleanCode = code.trim().toUpperCase();
  const allCoupons = await getCoupons();
  const coupon = allCoupons.find(c => c.code.toUpperCase() === cleanCode);
  if (!coupon) return { success: false, discountAmount: 0, isFreeShipping: false, message: `Coupon "${cleanCode}" does not exist.` };
  if (!coupon.active) return { success: false, discountAmount: 0, isFreeShipping: false, message: `Coupon "${cleanCode}" is currently inactive.` };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) return { success: false, discountAmount: 0, isFreeShipping: false, message: `Coupon "${cleanCode}" has expired.` };
  if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) return { success: false, discountAmount: 0, isFreeShipping: false, message: `Coupon "${cleanCode}" usage limit reached.` };
  if (subtotal < coupon.min_order_value) return { success: false, discountAmount: 0, isFreeShipping: false, message: `Coupon "${cleanCode}" requires min order ₹${coupon.min_order_value}. (Current: ₹${subtotal})` };
  let discountAmount = 0, isFreeShipping = false;
  if (coupon.type === 'percentage') discountAmount = Math.round((subtotal * (coupon.value || 0)) / 100);
  else if (coupon.type === 'flat') discountAmount = Math.min(subtotal, coupon.value || 0);
  else if (coupon.type === 'free_shipping') isFreeShipping = true;
  return { success: true, coupon, discountAmount, isFreeShipping, message: isFreeShipping ? 'Free shipping applied!' : `Discount: ₹${discountAmount}` };
}

export async function saveCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    if (coupon.id && isRealUuid(coupon.id)) {
      // Update existing row (real Supabase UUID)
      const { data, error } = await supabase.from('coupons').update(coupon).eq('id', coupon.id).select().single();
      if (!error && data) return data as Coupon;
    } else {
      // Insert new row
      const { data, error } = await supabase.from('coupons').insert([coupon]).select().single();
      if (!error && data) return data as Coupon;
    }
  } catch {}
  if (coupon.id) {
    const idx = memoryCoupons.findIndex(c => c.id === coupon.id);
    if (idx !== -1) { memoryCoupons[idx] = { ...memoryCoupons[idx], ...coupon } as Coupon; return memoryCoupons[idx]; }
  }
  const newCoupon: Coupon = {
    id: `c_${Date.now()}`, code: (coupon.code || 'COUPON').toUpperCase(), type: coupon.type || 'percentage',
    value: Number(coupon.value) || 0, min_order_value: Number(coupon.min_order_value) || 0,
    usage_limit: coupon.usage_limit ? Number(coupon.usage_limit) : null, used_count: 0,
    expires_at: coupon.expires_at || null, active: coupon.active ?? true,
  };
  memoryCoupons = [newCoupon, ...memoryCoupons];
  return newCoupon;
}

/**
 * Increment a coupon's used_count by 1 after a successful paid order.
 * Called from the verify-payment API route so the increment only happens
 * when payment is confirmed — never when the customer merely types the code.
 */
export async function incrementCouponUsageCount(code: string): Promise<void> {
  if (!code) return;
  const cleanCode = code.trim().toUpperCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // Atomically increment used_count directly in the DB
      await supabase.rpc('increment_coupon_usage', { coupon_code: cleanCode });
    } catch (err) {
      console.warn('[incrementCouponUsageCount] Supabase RPC failed, updating memory store only:', err);
    }
  }

  // Always update the memory store so getCoupons() reflects the change in demo mode
  const idx = memoryCoupons.findIndex(c => c.code.toUpperCase() === cleanCode);
  if (idx !== -1) {
    memoryCoupons[idx] = { ...memoryCoupons[idx], used_count: memoryCoupons[idx].used_count + 1 };
  }
}

export async function deleteCoupon(id: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    await supabase.from('coupons').delete().eq('id', id);
  } catch {}
  memoryCoupons = memoryCoupons.filter(c => c.id !== id);
  return true;
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function getAddresses(userId: string): Promise<Address[]> {
  try {
    if (!isSupabaseConfigured()) return memoryAddresses.filter(a => a.user_id === userId);
    const supabase = createClient();
    const { data, error } = await supabase.from('addresses').select('id, user_id, name, phone, line1, line2, city, state, pincode, is_default').eq('user_id', userId);
    if (!error && data && data.length > 0) return data as Address[];
  } catch {}
  return memoryAddresses.filter(a => a.user_id === userId);
}

export async function saveAddress(address: Partial<Address>): Promise<Address> {
  const validation = validateAddress(address);
  if (!validation.valid) {
    const firstErr = Object.values(validation.errors)[0];
    throw new Error(`Address validation failed: ${firstErr}`);
  }

  const cleanAddress: Partial<Address> = {
    ...address,
    name: (address.name || '').trim(),
    phone: (address.phone || '').replace(/\D/g, ''),
    line1: (address.line1 || '').trim(),
    line2: (address.line2 || '').trim(),
    city: (address.city || '').trim(),
    state: (address.state || '').trim(),
    pincode: (address.pincode || '').trim(),
  };

  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    if (cleanAddress.id && !cleanAddress.id.startsWith('addr')) {
      const { data, error } = await supabase.from('addresses').update(cleanAddress).eq('id', cleanAddress.id).select().single();
      if (!error && data) return data as Address;
      if (error) console.error('[saveAddress update error]', error);
    } else {
      const { data, error } = await supabase.from('addresses').insert([cleanAddress]).select().single();
      if (!error && data) return data as Address;
      if (error) console.error('[saveAddress insert error]', error);
    }
  } catch (err) {
    console.error('[saveAddress catch]', err);
  }
  const existing = cleanAddress.id ? memoryAddresses.find(a => a.id === cleanAddress.id) : null;
  if (existing) {
    const idx = memoryAddresses.findIndex(a => a.id === cleanAddress.id);
    memoryAddresses[idx] = { ...existing, ...cleanAddress } as Address;
    return memoryAddresses[idx];
  }
  const newAddr: Address = {
    id: cleanAddress.id || `addr_${Date.now()}`,
    user_id: cleanAddress.user_id || 'demo_user_id',
    name: cleanAddress.name || '',
    phone: cleanAddress.phone || '',
    line1: cleanAddress.line1 || '',
    line2: cleanAddress.line2 || '',
    city: cleanAddress.city || '',
    state: cleanAddress.state || 'Tamil Nadu',
    pincode: cleanAddress.pincode || '',
    is_default: cleanAddress.is_default || false,
  };
  if (newAddr.is_default) memoryAddresses = memoryAddresses.map(a => ({ ...a, is_default: false }));
  memoryAddresses = [newAddr, ...memoryAddresses];
  return newAddr;
}

export async function deleteAddress(id: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    await supabase.from('addresses').delete().eq('id', id);
  } catch {}
  memoryAddresses = memoryAddresses.filter(a => a.id !== id);
  return true;
}

export async function setDefaultAddress(id: string, userId: string): Promise<boolean> {
  try {
    if (!isSupabaseConfigured()) throw new Error('not configured');
    const supabase = createClient();
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
    await supabase.from('addresses').update({ is_default: true }).eq('id', id);
  } catch {}
  memoryAddresses = memoryAddresses.map(a => ({ ...a, is_default: a.id === id && a.user_id === userId }));
  return true;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

const ORDER_SELECT_FIELDS = 'id, order_number, user_id, items, subtotal, discount_amount, coupon_code, shipping_fee, total, status, razorpay_order_id, razorpay_payment_id, shipping_address, created_at';

export async function createOrder(order: Partial<Order>): Promise<Order> {
  if (isSupabaseConfigured()) {
    // Trusted server action: use admin service_role client if available to bypass RLS, fallback to standard client
    const supabase = createAdminClient() || createClient();
    console.info('[createOrder] Inserting order into Supabase:', {
      user_id: order.user_id,
      items_count: order.items?.length,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount,
      shipping_fee: order.shipping_fee,
      total: order.total,
      status: order.status,
      razorpay_order_id: order.razorpay_order_id,
      razorpay_payment_id: order.razorpay_payment_id,
    });

    const { data, error } = await supabase.from('orders').insert([order]).select(ORDER_SELECT_FIELDS).single();
    if (error) {
      console.error('[createOrder] Supabase insert ERROR:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
        orderPayload: order,
      });
      throw new Error(`Failed to save order to Supabase: ${error.message}`);
    }
    if (data) {
      const persistedOrder: Order = {
        ...(data as any),
        order_number: data.order_number || order.order_number || 'SRI001',
      };
      console.info('[createOrder] Order successfully created in Supabase with ID:', persistedOrder.id, 'and Order Number:', persistedOrder.order_number);
      memoryOrders.push(persistedOrder);
      return persistedOrder;
    }
  }

  // Fallback ONLY for local demo mode without Supabase credentials
  console.warn('[createOrder] Supabase not configured, saving to in-memory store');
  const generatedOrderNumber = order.order_number || getNextMemoryOrderNumber();
  const newOrder: Order = {
    id: `ord_${Date.now()}`,
    order_number: generatedOrderNumber,
    user_id: order.user_id || 'demo_user_id',
    items: order.items || [],
    subtotal: order.subtotal || 0,
    discount_amount: order.discount_amount || 0,
    coupon_code: order.coupon_code || '',
    shipping_fee: order.shipping_fee || 0,
    total: order.total || 0,
    status: order.status || 'paid',
    razorpay_order_id: order.razorpay_order_id || '',
    razorpay_payment_id: order.razorpay_payment_id || '',
    shipping_address: order.shipping_address as Address,
    created_at: new Date().toISOString(),
  };
  memoryOrders.push(newOrder);
  return newOrder;
}

export async function getOrderById(orderIdOrNumber: string): Promise<Order | null> {
  if (!orderIdOrNumber) return null;
  const cleanId = orderIdOrNumber.trim();
  const isOrderNum = isValidOrderNumber(cleanId);

  try {
    if (!isSupabaseConfigured()) {
      return (
        memoryOrders.find(
          (o) =>
            o.id === cleanId ||
            (o.order_number && o.order_number.toUpperCase() === cleanId.toUpperCase())
        ) || null
      );
    }
    const supabase = createAdminClient() || createClient();

    if (isOrderNum) {
      // 1. Try order_number lookup first
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT_FIELDS)
        .eq('order_number', cleanId.toUpperCase())
        .maybeSingle();
      if (!error && data) return data as Order;

      // 2. Fallback to id lookup just in case
      const { data: byId } = await supabase
        .from('orders')
        .select(ORDER_SELECT_FIELDS)
        .eq('id', cleanId)
        .maybeSingle();
      if (byId) return byId as Order;
    } else {
      // 1. Try id lookup first
      const { data, error } = await supabase
        .from('orders')
        .select(ORDER_SELECT_FIELDS)
        .eq('id', cleanId)
        .maybeSingle();
      if (!error && data) return data as Order;

      // 2. Fallback to order_number lookup
      const { data: byNum } = await supabase
        .from('orders')
        .select(ORDER_SELECT_FIELDS)
        .eq('order_number', cleanId.toUpperCase())
        .maybeSingle();
      if (byNum) return byNum as Order;
    }
  } catch (err: any) {
    console.error('[getOrderById catch]', err?.message || err);
  }
  return (
    memoryOrders.find(
      (o) =>
        o.id === cleanId ||
        (o.order_number && o.order_number.toUpperCase() === cleanId.toUpperCase())
    ) || null
  );
}

/** Look up an order by its Razorpay order ID — used in the payment.captured webhook. */
export async function getOrderByRazorpayOrderId(razorpayOrderId: string): Promise<Order | null> {
  try {
    if (!isSupabaseConfigured()) return memoryOrders.find(o => o.razorpay_order_id === razorpayOrderId) || null;
    const supabase = createAdminClient() || createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT_FIELDS)
      .eq('razorpay_order_id', razorpayOrderId)
      .maybeSingle();
    if (error) {
      console.warn('[getOrderByRazorpayOrderId] Supabase query notice for razorpayOrderId:', razorpayOrderId, error.message);
    }
    if (!error && data) return data as Order;
  } catch (err: any) {
    console.error('[getOrderByRazorpayOrderId catch]', err?.message || err);
  }
  return memoryOrders.find(o => o.razorpay_order_id === razorpayOrderId) || null;
}

export async function getOrdersByUser(userId: string): Promise<Order[]> {
  try {
    if (!isSupabaseConfigured()) {
      return memoryOrders
        .filter(o => o.user_id === userId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const supabase = createAdminClient() || createClient();
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_SELECT_FIELDS)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('[getOrdersByUser error]', error);
    }
    if (!error && data) return data as Order[];
  } catch (err: any) {
    console.error('[getOrdersByUser catch]', err?.message || err);
  }
  return memoryOrders
    .filter(o => o.user_id === userId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getAllOrders(statusFilter?: string): Promise<Order[]> {
  try {
    if (!isSupabaseConfigured()) {
      let orders = [...memoryOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      if (statusFilter && statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
      return orders;
    }
    const supabase = createAdminClient() || createClient();
    let query = supabase
      .from('orders')
      .select(ORDER_SELECT_FIELDS)
      .order('created_at', { ascending: false });
    if (statusFilter && statusFilter !== 'all') query = query.eq('status', statusFilter);
    const { data, error } = await query;
    if (error) {
      console.error('[getAllOrders error]', error);
    }
    if (!error && data) return data as Order[];
  } catch (err: any) {
    console.error('[getAllOrders catch]', err?.message || err);
  }
  let orders = [...memoryOrders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  if (statusFilter && statusFilter !== 'all') orders = orders.filter(o => o.status === statusFilter);
  return orders;
}

export async function updateOrderStatus(orderIdOrNumber: string, status: Order['status']): Promise<boolean> {
  const cleanId = (orderIdOrNumber || '').trim();
  const isOrderNum = isValidOrderNumber(cleanId);

  if (isSupabaseConfigured()) {
    const supabase = createAdminClient() || createClient();
    let res = isOrderNum
      ? await supabase.from('orders').update({ status }).eq('order_number', cleanId.toUpperCase())
      : await supabase.from('orders').update({ status }).eq('id', cleanId);

    if (res.error) {
      // Fallback try the other identifier
      res = isOrderNum
        ? await supabase.from('orders').update({ status }).eq('id', cleanId)
        : await supabase.from('orders').update({ status }).eq('order_number', cleanId.toUpperCase());
    }

    if (res.error) {
      console.error('[updateOrderStatus error]', res.error);
      throw new Error(`Failed to update order status: ${res.error.message}`);
    }
  }

  const idx = memoryOrders.findIndex(
    (o) => o.id === cleanId || (o.order_number && o.order_number.toUpperCase() === cleanId.toUpperCase())
  );
  if (idx !== -1) memoryOrders[idx] = { ...memoryOrders[idx], status };
  return true;
}
