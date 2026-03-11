'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { Invoice } from '@/types/invoice';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { formatCurrency, formatDate } from '@/lib/utils/formatters';
import {
  ArrowLeft,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileText,
  DollarSign,
  ChevronRight,
} from 'lucide-react';

export default function TenantInvoices() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const primaryColor = tenant.branding.primaryColor;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  // Fetch invoices where the customer email matches
  useEffect(() => {
    if (!user?.email) return;

    async function fetchInvoices() {
      try {
        // Query invoices sent TO this customer's email
        const q = query(
          collection(db, 'invoices'),
          where('to.email', '==', user!.email)
        );
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invoice[];

        // Sort by date, newest first
        results.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate.getTime() - aDate.getTime();
        });

        setInvoices(results);
      } catch (err) {
        console.error('Error fetching invoices:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchInvoices();
  }, [user?.email]);

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  if (authLoading || !user) return null;

  const totalOwed = invoices
    .filter((inv) => inv.status === 'sent' || inv.status === 'overdue')
    .reduce((sum, inv) => sum + inv.total, 0);

  const totalPaid = invoices
    .filter((inv) => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.total, 0);

  const statusConfig = {
    draft: { icon: FileText, color: '#6B7280', label: 'Draft' },
    sent: { icon: Clock, color: '#F59E0B', label: 'Due' },
    paid: { icon: CheckCircle, color: '#10B981', label: 'Paid' },
    overdue: { icon: AlertTriangle, color: '#EF4444', label: 'Overdue' },
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <DollarSign size={22} style={{ color: primaryColor }} />
          Invoices & Payments
        </h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1">Balance Due</p>
            <p className="text-2xl font-bold" style={{ color: totalOwed > 0 ? '#F59E0B' : '#10B981' }}>
              {formatCurrency(totalOwed)}
            </p>
          </div>
          <div className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50">
            <p className="text-xs text-gray-400 mb-1">Total Paid</p>
            <p className="text-2xl font-bold text-green-400">
              {formatCurrency(totalPaid)}
            </p>
          </div>
        </div>

        {/* Invoice list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: primaryColor }} />
          </div>
        ) : invoices.length === 0 ? (
          <div className="bg-[#2D2D2D] rounded-xl p-8 text-center">
            <FileText size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No invoices yet.</p>
            <p className="text-gray-500 text-sm mt-1">
              Invoices from {tenant.companyName} will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {invoices.map((invoice) => {
              const config = statusConfig[invoice.status];
              const Icon = config.icon;

              return (
                <div
                  key={invoice.id}
                  className="bg-[#2D2D2D] rounded-xl p-4 border border-gray-700/50 flex items-center gap-4"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.color}22` }}
                  >
                    <Icon size={20} style={{ color: config.color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium text-sm">
                        Invoice #{invoice.invoiceNumber}
                      </p>
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{
                          backgroundColor: `${config.color}22`,
                          color: config.color,
                        }}
                      >
                        {config.label}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {invoice.lineItems?.length || 0} item{(invoice.lineItems?.length || 0) !== 1 ? 's' : ''}
                      {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate.toDate())}`}
                    </p>
                  </div>

                  <p className="text-white font-semibold text-sm">
                    {formatCurrency(invoice.total)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
