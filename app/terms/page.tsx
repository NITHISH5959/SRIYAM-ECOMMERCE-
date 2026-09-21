import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { ShieldCheck, Truck, RotateCcw, CreditCard, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Terms & Conditions — ${STORE_CONFIG.name}`,
  description: `Terms and conditions for orders, shipping, returns, and payments on ${STORE_CONFIG.name}.`,
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50/50 py-12 sm:py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Breadcrumb / Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 hover:text-amber-800 transition-colors uppercase tracking-wider"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Store</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white p-8 sm:p-10 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-50 text-amber-900 border border-amber-200/80 rounded-full text-xs font-semibold uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
            <span>Legal Agreement</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-900 tracking-tight">
            Terms & Conditions
          </h1>
          <p className="text-xs text-zinc-500">
            Last Updated: September 2026 · Effective for all orders placed on Sriyam Store
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">
          
          {/* Section 1: Introduction */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs flex items-center justify-center font-mono font-bold">1</span>
              <span>Introduction & Agreement</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                Welcome to <strong>{STORE_CONFIG.name}</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;). By accessing our website or purchasing our sacred art frames and heritage posters, you agree to be bound by these Terms & Conditions.
              </p>
              <p>
                Please read these terms carefully before placing an order. If you do not agree with any part of these terms, you should not access our website or place an order.
              </p>
            </div>
          </section>

          {/* Section 2: Product Accuracy & Pricing */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs flex items-center justify-center font-mono font-bold">2</span>
              <span>Product Specifications & Pricing</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                All prices listed on <strong>{STORE_CONFIG.name}</strong> are quoted in Indian Rupees (INR, ₹).
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                <li>Prices are subject to change without prior notice, but price changes will not affect orders that have already been confirmed.</li>
                <li>We make every effort to display product dimensions, colors, and spiritual iconography with the utmost fidelity. However, minor visual variations may occur due to screen calibration and handmade framing craft.</li>
                <li>Sizes for sacred frames are clearly listed (e.g. A3: 29.7 × 42 cm, A4: 21 × 29.7 cm).</li>
              </ul>
            </div>
          </section>

          {/* Section 3: Payments */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-amber-800" />
              <span>Payment Processing</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                Online payments are securely processed through <strong>Razorpay</strong>, an RBI-authorized and PCI-DSS compliant payment gateway.
              </p>
              <p>
                We accept UPI (Google Pay, PhonePe, Paytm, BHIM), Net Banking, Debit Cards, and Credit Cards. We do not store or have access to your sensitive banking or payment card details.
              </p>
            </div>
          </section>

          {/* Section 4: Shipping & Delivery */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-amber-800" />
              <span>Shipping & Delivery Policy</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                We deliver to all serviceable pincodes across India.
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                <li><strong>Standard Shipping Rates:</strong> Delivery fee is <strong>₹150 for Tamil Nadu</strong> and <strong>₹200 for all other states</strong> across India.</li>
                <li><strong>Dispatch Timeline:</strong> Orders are packaged and dispatched within <strong>2 to 4 business days</strong> following payment verification.</li>
                <li><strong>Delivery Timeline:</strong> Typical transit times range from <strong>4 to 7 business days</strong> depending on your destination city/state.</li>
                <li><strong>Protective Packaging:</strong> All frames and archival posters are shipped in reinforced, shock-absorbing protective packaging to safeguard the sacred art.</li>
              </ul>
            </div>
          </section>

          {/* Section 5: Returns & Refunds */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-800" />
              <span>Returns, Replacements & Cancellation Policy</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                Due to the sacred, devotional, and customized nature of temple frames and spiritual archival prints:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                <li><strong>General Returns:</strong> We do not accept returns or exchanges for change of mind after delivery.</li>
                <li><strong>Transit Damage Guarantee:</strong> If your order arrives damaged, broken, or defective, we provide a <strong>100% Free Replacement</strong> or full refund.</li>
                <li><strong>Claim Procedure:</strong> Please notify us on WhatsApp or email at <a href="mailto:srisridharguru@gmail.com" className="text-amber-800 font-semibold underline">srisridharguru@gmail.com</a> within <strong>48 hours of delivery</strong> with unboxing photos or a short video demonstrating the damage.</li>
                <li><strong>Order Cancellation:</strong> Orders can be cancelled prior to dispatch by contacting us immediately. Once an order is shipped, cancellation is no longer possible.</li>
              </ul>
            </div>
          </section>

          {/* Section 6: Contact Information */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h2 className="text-lg font-serif font-bold text-zinc-900">
              Contact & Grievance Officer
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              If you have any questions, clarifications, or concerns regarding our terms or an active order, please reach out directly:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wider">
                  <Mail className="w-3.5 h-3.5 text-amber-700" />
                  <span>Email</span>
                </div>
                <p className="text-zinc-600">{STORE_CONFIG.contact.email}</p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wider">
                  <Phone className="w-3.5 h-3.5 text-amber-700" />
                  <span>Phone / WhatsApp</span>
                </div>
                <p className="text-zinc-600">{STORE_CONFIG.contact.phone}</p>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-zinc-800 uppercase tracking-wider">
                  <MapPin className="w-3.5 h-3.5 text-amber-700" />
                  <span>Location</span>
                </div>
                <p className="text-zinc-600">{STORE_CONFIG.contact.location}</p>
              </div>
            </div>
          </section>

        </div>

      </div>
    </div>
  );
}
