/**
 * Admin Dashboard Layout — SERVER COMPONENT (no 'use client').
 *
 * Security contract:
 *  1. checkIsAdmin() runs entirely on the server before any HTML is sent.
 *  2. Unauthenticated or non-admin users are redirected to /sriyamadmin/login.
 *  3. This check cannot be bypassed by disabling JavaScript, because it runs
 *     in a Next.js Server Component before the response is streamed.
 */

import { redirect } from 'next/navigation';
import { checkIsAdmin } from '@/lib/supabase/server';
import AdminSidebar from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side admin gate
  const isAdmin = await checkIsAdmin();

  if (!isAdmin) {
    redirect('/sriyamadmin/login?error=no_access');
  }

  return (
    <div className="min-h-screen bg-zinc-100/70 flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
