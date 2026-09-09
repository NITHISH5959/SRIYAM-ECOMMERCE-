export interface Category {
  id: string;
  name: string;
  slug: string;
}

// ── Size variant (Frames only) ─────────────────────────────────────────────────
export interface ProductVariant {
  id: string;
  product_id: string;
  size: string;           // 'A3' | 'A4'
  price: number;
  compare_at_price: number;
  stock: number;
  is_active: boolean;
  created_at?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compare_at_price: number;
  images: string[];
  stock: number;
  category_id: string | null;
  weight_grams?: number;
  is_active: boolean;
  is_featured?: boolean;
  created_at?: string;
  category?: Category;
  // Attached on product-detail fetch for Frame products
  variants?: ProductVariant[];
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percentage' | 'flat' | 'free_shipping';
  value: number;
  min_order_value: number;
  usage_limit: number | null;
  used_count: number;
  expires_at: string | null;
  active: boolean;
  created_at?: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
}

export interface Address {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
}

export interface OrderItem {
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  // Variant fields (Frames only)
  variant_id?: string;
  size?: string;
}

export interface Order {
  id: string;
  user_id: string;
  items: OrderItem[];
  subtotal: number;
  discount_amount: number;
  coupon_code?: string;
  shipping_fee: number;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  shipping_address: Address;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  // Variant fields (Frames only)
  size?: string;
  variantId?: string;
}
