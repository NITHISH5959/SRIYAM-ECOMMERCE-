import React from 'react';
import { getProductBySlug, getProducts } from '@/lib/data';
import ProductDetailClient from '@/components/products/ProductDetailClient';
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { STORE_CONFIG } from '@/lib/config';

export const revalidate = 3600; // Re-validate product pages at most once per hour

interface ProductPageProps {
  params: {
    slug: string;
  };
}

/**
 * Pre-build all product pages at deploy time so the first visitor to any
 * product page gets a fully static response with no cold-render delay.
 * New products added via the admin panel are picked up on the next
 * revalidation cycle (controlled by `revalidate` above).
 */
export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) {
    return {
      title: 'Product Not Found | Sriyam Store',
    };
  }

  return {
    title: `${product.name} — Buy Online at ${STORE_CONFIG.name}`,
    description: product.description || `Buy ${product.name} sacred spiritual frame and poster online for ${STORE_CONFIG.defaultPricing.currency}${product.price}.`,
    alternates: {
      canonical: `https://sriyamstore.com/product/${product.slug}`,
    },
    openGraph: {
      title: product.name,
      description: product.description || `Buy ${product.name} — authentic sacred art at ${STORE_CONFIG.defaultPricing.currency}${product.price}.`,
      type: 'website',
      url: `https://sriyamstore.com/product/${product.slug}`,
      images:
        product.images && product.images.length > 0
          ? [{ url: product.images[0], width: 800, height: 800, alt: product.name }]
          : [{ url: '/logo.png', width: 1024, height: 1024, alt: STORE_CONFIG.name }],
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const [product, allProducts] = await Promise.all([
    getProductBySlug(params.slug),
    getProducts(),
  ]);

  if (!product) {
    notFound();
  }

  const relatedProducts = allProducts
    .filter((p) => p.id !== product.id && p.category_id === product.category_id)
    .slice(0, 4);

  return <ProductDetailClient product={product} relatedProducts={relatedProducts} />;
}
