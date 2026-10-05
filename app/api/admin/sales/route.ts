import { NextResponse, type NextRequest } from 'next/server';
import { checkIsAdmin, createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  INITIAL_PRODUCTS,
  INITIAL_CATEGORIES,
  getAllProductsAdmin,
  getCategories,
  memoryOrders,
} from '@/lib/data';
import { Order, OrderItem, Product, ProductVariant, Category } from '@/types';

export const dynamic = 'force-dynamic';

export interface SalesSummary {
  totalRevenue: number;
  ordersCount: number;
  unitsSold: number;
  averageOrderValue: number;
  inventoryValue: number;
  unitsInStock: number;
}

export interface CategorySales {
  id: string;
  name: string;
  revenue: number;
  unitsSold: number;
  revenueShare: number; // percentage (0 - 100)
}

export interface CategoryInventory {
  id: string;
  name: string;
  unitsInStock: number;
  inventoryValue: number;
}

export interface ProductSalesRow {
  id: string;
  name: string;
  slug: string;
  image?: string;
  categoryName: string;
  unitsSold: number;
  revenue: number;
  stockLeft: number;
  inventoryValue: number;
}

export interface SalesApiResponse {
  range: 'all' | 'today' | '7d' | '30d';
  rangeLabel: string;
  summary: SalesSummary;
  categorySales: CategorySales[];
  totalItemsRevenue: number;
  categoryInventory: CategoryInventory[];
  totalInventoryUnits: number;
  totalInventoryValue: number;
  productSales: ProductSalesRow[];
}

/**
 * Calculates date range boundaries according to Indian Standard Time (Asia/Kolkata, UTC+05:30).
 */
function getISTDateRange(range: 'all' | 'today' | '7d' | '30d'): {
  startDate: Date | null;
  endDate: Date;
  label: string;
} {
  const now = new Date();
  if (range === 'all') {
    return { startDate: null, endDate: now, label: 'All Time' };
  }

  // IST offset = +5:30 (19,800,000 ms)
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDay = istNow.getUTCDate();

  let daysBack = 0;
  let label = 'Today';

  if (range === 'today') {
    daysBack = 0;
    label = 'Today';
  } else if (range === '7d') {
    daysBack = 6; // 7 days total including today
    label = 'Last 7 Days';
  } else if (range === '30d') {
    daysBack = 29; // 30 days total including today
    label = 'Last 30 Days';
  }

  const startUtcMs = Date.UTC(istYear, istMonth, istDay - daysBack, 0, 0, 0, 0) - IST_OFFSET_MS;
  const startDate = new Date(startUtcMs);

  return { startDate, endDate: now, label };
}

export async function GET(request: NextRequest) {
  // ── 1. Strict Server-Side Admin Authorization Check ────────────────────────
  const isAdmin = await checkIsAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized. Admin access required.' },
      {
        status: 403,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  }

  // ── 2. Parse & Validate Date Range Filter ──────────────────────────────────
  const searchParams = request.nextUrl.searchParams;
  const rawRange = (searchParams.get('range') || 'all').toLowerCase();
  const range: 'all' | 'today' | '7d' | '30d' = ['all', 'today', '7d', '30d'].includes(rawRange)
    ? (rawRange as 'all' | 'today' | '7d' | '30d')
    : 'all';

  const { startDate, label: rangeLabel } = getISTDateRange(range);

  try {
    let orders: Order[] = [];
    let products: Product[] = [];
    let variants: ProductVariant[] = [];
    let categories: Category[] = [];

    // ── 3. Fetch authoritative data server-side ──────────────────────────────
    if (isSupabaseConfigured()) {
      const supabase = createAdminClient() || (await createClient());

      // Fetch all required datasets concurrently
      const [ordersRes, productsRes, variantsRes, categoriesRes] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, total, subtotal, discount_amount, shipping_fee, status, items, created_at')
          .in('status', ['paid', 'shipped', 'delivered'])
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('id, name, slug, price, compare_at_price, stock, category_id, images, is_active')
          .order('created_at', { ascending: false }),
        supabase
          .from('product_variants')
          .select('id, product_id, size, price, compare_at_price, stock, is_active')
          .order('size'),
        supabase
          .from('categories')
          .select('id, name, slug'),
      ]);

      if (ordersRes.data) orders = ordersRes.data as unknown as Order[];
      if (productsRes.data) products = productsRes.data as unknown as Product[];
      if (variantsRes.data) variants = variantsRes.data as unknown as ProductVariant[];
      if (categoriesRes.data) categories = categoriesRes.data as unknown as Category[];
    } else {
      // Demo / offline fallback
      orders = memoryOrders.filter((o) => ['paid', 'shipped', 'delivered'].includes(o.status));
      products = await getAllProductsAdmin();
      categories = await getCategories();
      variants = [];
    }

    // ── 4. Filter orders by IST date range ───────────────────────────────────
    const countedOrders = orders.filter((order) => {
      // Strict status check: only paid, shipped, delivered are sales
      // Pending, cancelled, and refunded orders are excluded.
      if (!['paid', 'shipped', 'delivered'].includes(order.status)) {
        return false;
      }
      if (startDate) {
        const orderCreatedAt = new Date(order.created_at);
        if (orderCreatedAt < startDate) {
          return false;
        }
      }
      return true;
    });

    // ── 5. Category Lookup Maps ──────────────────────────────────────────────
    const categoryById = new Map<string, Category>();
    categories.forEach((cat) => categoryById.set(cat.id, cat));

    const productById = new Map<string, Product>();
    const productByNameLower = new Map<string, Product>();
    products.forEach((prod) => {
      productById.set(prod.id, prod);
      if (prod.name) {
        productByNameLower.set(prod.name.trim().toLowerCase(), prod);
      }
    });

    // Active variants grouped by product_id
    const variantsByProductId = new Map<string, ProductVariant[]>();
    variants.forEach((v) => {
      if (v.is_active !== false) {
        const existing = variantsByProductId.get(v.product_id) || [];
        existing.push(v);
        variantsByProductId.set(v.product_id, existing);
      }
    });

    // ── 6. Live Inventory Metrics Calculation (Always live, not filtered by date) ─
    interface ProductStockCalc {
      unitsInStock: number;
      inventoryValue: number;
    }
    const productStockMap = new Map<string, ProductStockCalc>();

    let totalInventoryUnits = 0;
    let totalInventoryValue = 0;

    // Track inventory by category
    const categoryInventoryMap = new Map<string, { unitsInStock: number; inventoryValue: number }>();
    categories.forEach((cat) => {
      categoryInventoryMap.set(cat.id, { unitsInStock: 0, inventoryValue: 0 });
    });
    let otherInventoryUnits = 0;
    let otherInventoryValue = 0;

    products.forEach((prod) => {
      const prodVariants = variantsByProductId.get(prod.id);
      let prodUnits = 0;
      let prodValue = 0;

      if (prodVariants && prodVariants.length > 0) {
        // Product has variant sizing (e.g. Frames with A3 & A4)
        prodVariants.forEach((v) => {
          const vStock = Math.max(0, Number(v.stock) || 0);
          const vPrice = Math.max(0, Number(v.price) || 0);
          prodUnits += vStock;
          prodValue += vStock * vPrice;
        });
      } else {
        // Standard single product (e.g. Rack Posters)
        const pStock = Math.max(0, Number(prod.stock) || 0);
        const pPrice = Math.max(0, Number(prod.price) || 0);
        prodUnits = pStock;
        prodValue = pStock * pPrice;
      }

      productStockMap.set(prod.id, { unitsInStock: prodUnits, inventoryValue: prodValue });
      totalInventoryUnits += prodUnits;
      totalInventoryValue += prodValue;

      if (prod.category_id && categoryInventoryMap.has(prod.category_id)) {
        const entry = categoryInventoryMap.get(prod.category_id)!;
        entry.unitsInStock += prodUnits;
        entry.inventoryValue += prodValue;
      } else {
        otherInventoryUnits += prodUnits;
        otherInventoryValue += prodValue;
      }
    });

    const categoryInventoryList: CategoryInventory[] = categories.map((cat) => {
      const entry = categoryInventoryMap.get(cat.id) || { unitsInStock: 0, inventoryValue: 0 };
      return {
        id: cat.id,
        name: cat.name,
        unitsInStock: entry.unitsInStock,
        inventoryValue: entry.inventoryValue,
      };
    });

    if (otherInventoryUnits > 0 || otherInventoryValue > 0) {
      categoryInventoryList.push({
        id: 'other',
        name: 'Other',
        unitsInStock: otherInventoryUnits,
        inventoryValue: otherInventoryValue,
      });
    }

    // ── 7. Sales Metrics & Category Attribution ──────────────────────────────
    let totalRevenue = 0;
    let totalUnitsSold = 0;

    const categorySalesMap = new Map<string, { revenue: number; unitsSold: number }>();
    categories.forEach((cat) => {
      categorySalesMap.set(cat.id, { revenue: 0, unitsSold: 0 });
    });
    let otherSalesRevenue = 0;
    let otherSalesUnits = 0;

    // Map to track sales per product: key = product ID or fallback key
    const productSalesMap = new Map<
      string,
      { unitsSold: number; revenue: number; fallbackItem?: OrderItem }
    >();

    countedOrders.forEach((order) => {
      totalRevenue += Number(order.total) || 0;

      const rawItems: OrderItem[] = Array.isArray(order.items) ? order.items : [];

      rawItems.forEach((item) => {
        const qty = Math.max(0, Number(item.quantity) || 0);
        const price = Math.max(0, Number(item.price) || 0);
        const lineTotal = qty * price;

        totalUnitsSold += qty;

        // Try to match product by ID first, then by name
        let matchedProduct: Product | undefined = undefined;
        if (item.product_id && productById.has(item.product_id)) {
          matchedProduct = productById.get(item.product_id);
        } else if (item.name) {
          matchedProduct = productByNameLower.get(item.name.trim().toLowerCase());
        }

        // Attribute to category
        let categoryId: string | null = matchedProduct?.category_id || null;
        if (categoryId && categorySalesMap.has(categoryId)) {
          const catEntry = categorySalesMap.get(categoryId)!;
          catEntry.revenue += lineTotal;
          catEntry.unitsSold += qty;
        } else {
          otherSalesRevenue += lineTotal;
          otherSalesUnits += qty;
        }

        // Track per-product metrics
        const prodKey = matchedProduct?.id || item.product_id || `item_${item.name}`;
        const existing = productSalesMap.get(prodKey) || {
          unitsSold: 0,
          revenue: 0,
          fallbackItem: matchedProduct ? undefined : item,
        };
        existing.unitsSold += qty;
        existing.revenue += lineTotal;
        productSalesMap.set(prodKey, existing);
      });
    });

    const ordersCount = countedOrders.length;
    const averageOrderValue = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

    // Total items revenue for category revenue sharing
    let totalItemsRevenue = 0;
    categorySalesMap.forEach((entry) => {
      totalItemsRevenue += entry.revenue;
    });
    totalItemsRevenue += otherSalesRevenue;

    const categorySalesList: CategorySales[] = categories.map((cat) => {
      const entry = categorySalesMap.get(cat.id) || { revenue: 0, unitsSold: 0 };
      const share = totalItemsRevenue > 0 ? (entry.revenue / totalItemsRevenue) * 100 : 0;
      return {
        id: cat.id,
        name: cat.name,
        revenue: entry.revenue,
        unitsSold: entry.unitsSold,
        revenueShare: Math.round(share * 10) / 10,
      };
    });

    if (otherSalesRevenue > 0 || otherSalesUnits > 0) {
      const share = totalItemsRevenue > 0 ? (otherSalesRevenue / totalItemsRevenue) * 100 : 0;
      categorySalesList.push({
        id: 'other',
        name: 'Other',
        revenue: otherSalesRevenue,
        unitsSold: otherSalesUnits,
        revenueShare: Math.round(share * 10) / 10,
      });
    }

    // ── 8. Product-wise Performance Table ────────────────────────────────────
    const productSalesRows: ProductSalesRow[] = products.map((prod) => {
      const sales = productSalesMap.get(prod.id) || { unitsSold: 0, revenue: 0 };
      const stockInfo = productStockMap.get(prod.id) || { unitsInStock: 0, inventoryValue: 0 };
      const catName = prod.category_id && categoryById.has(prod.category_id)
        ? categoryById.get(prod.category_id)!.name
        : 'Other';

      return {
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        image: Array.isArray(prod.images) && prod.images.length > 0 ? prod.images[0] : undefined,
        categoryName: catName,
        unitsSold: sales.unitsSold,
        revenue: sales.revenue,
        stockLeft: stockInfo.unitsInStock,
        inventoryValue: stockInfo.inventoryValue,
      };
    });

    // Also include any historical sales from deleted products that don't match active catalog
    productSalesMap.forEach((sales, key) => {
      if (!productById.has(key) && sales.fallbackItem) {
        productSalesRows.push({
          id: key,
          name: sales.fallbackItem.name || 'Deleted Product',
          slug: '',
          image: sales.fallbackItem.image,
          categoryName: 'Other (Deleted)',
          unitsSold: sales.unitsSold,
          revenue: sales.revenue,
          stockLeft: 0,
          inventoryValue: 0,
        });
      }
    });

    // Default sort: highest revenue first, then highest units sold, then name
    productSalesRows.sort((a, b) => {
      if (b.revenue !== a.revenue) return b.revenue - a.revenue;
      if (b.unitsSold !== a.unitsSold) return b.unitsSold - a.unitsSold;
      return a.name.localeCompare(b.name);
    });

    const responsePayload: SalesApiResponse = {
      range,
      rangeLabel,
      summary: {
        totalRevenue,
        ordersCount,
        unitsSold: totalUnitsSold,
        averageOrderValue,
        inventoryValue: totalInventoryValue,
        unitsInStock: totalInventoryUnits,
      },
      categorySales: categorySalesList,
      totalItemsRevenue,
      categoryInventory: categoryInventoryList,
      totalInventoryUnits,
      totalInventoryValue,
      productSales: productSalesRows,
    };

    return NextResponse.json(responsePayload, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('[Admin Sales API Error]:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to calculate sales analytics' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          Pragma: 'no-cache',
        },
      }
    );
  }
}
