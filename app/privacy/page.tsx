import React from 'react';
import Link from 'next/link';
import { STORE_CONFIG } from '@/lib/config';
import { Lock, Shield, EyeOff, Smartphone, Mail, Phone, MapPin, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: `Privacy Policy — ${STORE_CONFIG.name}`,
  description: `How ${STORE_CONFIG.name} collects, protects, and handles your personal information.`,
};

export default function PrivacyPolicyPage() {
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
            <Lock className="w-3.5 h-3.5 text-amber-700" />
            <span>Data Protection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-zinc-900 tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-zinc-500">
            Last Updated: September 2026 · Committed to protecting your personal information
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-6">

          {/* Section 1: Introduction */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-800" />
              <span>Our Commitment to Privacy</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                At <strong>{STORE_CONFIG.name}</strong>, we deeply respect your trust and are dedicated to preserving the confidentiality of your personal information.
              </p>
              <p>
                This Privacy Policy outlines what information we collect when you visit our store or make a purchase, and how we handle and protect that information.
              </p>
            </div>
          </section>

          {/* Section 2: What Data We Collect */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs flex items-center justify-center font-mono font-bold">1</span>
              <span>Information We Collect</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                When you create an account, browse our catalog, or place an order, we collect only the necessary details required to deliver your spiritual items:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                <li><strong>Contact Details:</strong> Your full name, email address, and phone number.</li>
                <li><strong>Delivery Address:</strong> Street address, city, state, and postal code for shipping your order.</li>
                <li><strong>Order History:</strong> Details of the sacred frames and heritage posters purchased, timestamps, and payment status.</li>
                <li><strong>Technical Data:</strong> Essential session cookies to maintain your shopping cart and authenticated login state.</li>
              </ul>
            </div>
          </section>

          {/* Section 3: How We Use Your Data */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-800" />
              <span>How We Use Your Information</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                We use your information strictly for legitimate e-commerce operations:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-zinc-600">
                <li>To package and ship your order to your verified address.</li>
                <li>To send order confirmation receipts, payment verifications, and delivery tracking details via WhatsApp and email.</li>
                <li>To assist you through customer care with custom framing inquiries, sizing, or transit questions.</li>
                <li><strong>Strict No-Spam / No-Sale Policy:</strong> We do <strong>NOT</strong> sell, rent, trade, or share your personal data with any third-party marketing companies or data brokers.</li>
              </ul>
            </div>
          </section>

          {/* Section 4: Payment Security */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <EyeOff className="w-5 h-5 text-amber-800" />
              <span>Payment Security & Non-Storage</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                All online transactions are processed through <strong>Razorpay</strong>, India&apos;s leading RBI-authorized and PCI-DSS Level 1 certified payment gateway.
              </p>
              <p>
                Your card numbers, CVVs, UPI PINs, and banking credentials are transmitted through bank-grade 256-bit SSL encryption. <strong>{STORE_CONFIG.name} never stores, sees, or retains your financial credentials.</strong>
              </p>
            </div>
          </section>

          {/* Section 5: Cookies & Local Storage */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-3">
            <h2 className="text-lg font-serif font-bold text-zinc-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-900 text-xs flex items-center justify-center font-mono font-bold">2</span>
              <span>Cookies & Session Storage</span>
            </h2>
            <div className="text-xs sm:text-sm text-zinc-600 leading-relaxed space-y-2">
              <p>
                We use strictly functional cookies and local browser storage to provide core website functionality:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                <li>Remembering items in your shopping cart between visits.</li>
                <li>Preserving your authenticated customer or administrative login session securely.</li>
              </ul>
              <p>
                You can manage or disable cookies through your browser settings; however, disabling cookies may prevent you from adding items to your cart or completing checkout.
              </p>
            </div>
          </section>

          {/* Section 6: Contact for Privacy */}
          <section className="bg-white p-6 sm:p-8 rounded-2xl border border-zinc-200 shadow-sm space-y-4">
            <h2 className="text-lg font-serif font-bold text-zinc-900">
              Privacy Inquiries & Data Rights
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
              If you wish to review, update, or request the deletion of your personal account details, please contact us:
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
                  <span>Phone</span>
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
