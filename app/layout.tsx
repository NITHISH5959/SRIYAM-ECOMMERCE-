import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/context/CartContext';
import Script from 'next/script';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import { STORE_CONFIG } from '@/lib/config';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: `${STORE_CONFIG.name} — ${STORE_CONFIG.tagline}`,
    template: `%s | ${STORE_CONFIG.name}`,
  },
  description: STORE_CONFIG.description,
  keywords: [
    'Sriyam Store',
    'Spiritual Art Frames',
    'Paadal Petra Sthalam',
    'Divya Desam Posters',
    'Sakthi Peedam Poster',
    'Tamil Spiritual Art',
    'Heritage Wall Art',
  ],
  metadataBase: new URL('https://sriyamstore.com'),
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: STORE_CONFIG.name,
    description: STORE_CONFIG.description,
    type: 'website',
    locale: 'en_IN',
    images: [{ url: '/logo.png', width: 1024, height: 1024, alt: 'Sriyam Store Logo' }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} scroll-smooth`}>
      <body className="min-h-screen flex flex-col justify-between bg-surface-50 text-zinc-900 font-sans">
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
          <CartDrawer />
        </CartProvider>
      </body>
    </html>
  );
}
