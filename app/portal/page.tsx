'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Briefcase, DollarSign, Package, Clock, CheckCircle, AlertTriangle, MapPin } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth, useContractorJobs, useContractorInvoices, useContractorExpenses, useLowStockCount, useContractorLocation, useTranslation } from '@/lib/hooks';
import { findAndLinkContractor } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { formatCurrency } from '@/lib/utils/formatters';

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  // Real data hooks
  const { activeJobs, completedJobs, loading: jobsLoading } = useContractorJobs({
    contractorId: user?.uid || '',
    realtime: true,
  });

  const { stats: invoiceStats, loading: invoicesLoading } = useContractorInvoices({
    contractorId: user?.uid || '',
    realtime: true,
  });

  const { stats: expenseStats } = useContractorExpenses({
    contractorId: user?.uid || '',
    realtime: true,
  });

  // Get contractor location for low stock alerts
  const { location } = useContractorLocation(user?.uid || '');
  const { count: lowStockCount } = useLowStockCount(location?.id);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid && user?.email) {
        try {
          const data = await findAndLinkContractor(user.uid, user.email);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      } else if (user?.uid) {
        setLoading(false);
      }
    }
    loadContractor();
  }, [user?.uid, user?.email]);

  const isLoading = loading || jobsLoading || invoicesLoading;

  // Calculate net profit
  const netProfit = invoiceStats.totalRevenue - expenseStats.totalExpenses;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          {t('Welcome back')}{contractor?.businessName ? `, ${contractor.businessName}` : ''}!
        </h1>
        <p className="text-gray-400 mt-1">
          {t("Here's an overview of your business")}
        </p>
      </div>

      {/* Profile Completion Banner */}
      {!loading && contractor && !contractor.address?.street && (
        <Link href="/portal/my-profile">
          <Card className="p-4 border-brand-gold/30 bg-brand-gold/5 hover:border-brand-gold/60 transition-colors cursor-pointer">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-brand-gold/10 rounded-lg shrink-0">
                <MapPin className="h-5 w-5 text-brand-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-brand-gold font-medium">{t('Complete your profile')}</p>
                <p className="text-sm text-gray-400">
                  {t('Add your address so you appear on the team map and get matched to nearby jobs.')}
                </p>
              </div>
              <span className="text-brand-gold text-sm font-medium shrink-0">Set up &rarr;</span>
            </div>
          </Card>
        </Link>
      )}

      {/* Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">{t('Status')}</p>
              <p className="text-sm text-gray-400">
                {contractor?.status === 'active' ? t('Active & Available') : contractor?.status || t('Unknown')}
              </p>
            </div>
          </div>
          <Badge variant={contractor?.status === 'active' ? 'success' : 'warning'}>
            {contractor?.status || 'Unknown'}
          </Badge>
        </div>
      </Card>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/portal/jobs">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">{t('Active Jobs')}</span>
            </div>
            <p className="text-2xl font-bold text-white">{activeJobs.length}</p>
            <p className="text-xs text-gray-500">{completedJobs.length} {t('completed')}</p>
          </Card>
        </Link>

        <Link href="/portal/financials">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">{t('Revenue')}</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(invoiceStats.totalRevenue)}</p>
            {invoiceStats.pendingRevenue > 0 && (
              <p className="text-xs text-yellow-400">{formatCurrency(invoiceStats.pendingRevenue)} {t('pending')}</p>
            )}
          </Card>
        </Link>

        <Link href="/portal/availability">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Calendar className="h-5 w-5 text-gold" />
              </div>
              <span className="text-sm text-gray-400">{t('Availability')}</span>
            </div>
            <p className="text-lg font-bold text-white">{t('Set Schedule')}</p>
            <p className="text-xs text-gray-500">{t('Manage your calendar')}</p>
          </Card>
        </Link>

        <Link href="/portal/inventory">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Package className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">{t('Inventory')}</span>
            </div>
            <p className="text-lg font-bold text-white">{t('Truck Stock')}</p>
            {lowStockCount > 0 ? (
              <p className="text-xs text-red-400">{lowStockCount} {t('items low')}</p>
            ) : (
              <p className="text-xs text-gray-500">{t('All stocked')}</p>
            )}
          </Card>
        </Link>
      </div>

      {/* Financial Summary */}
      <Card className="p-4">
        <h3 className="text-sm font-medium text-gray-400 mb-3">{t('Financial Summary')}</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500">{t('Revenue')}</p>
            <p className="text-lg font-bold text-green-400">{formatCurrency(invoiceStats.totalRevenue)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('Expenses')}</p>
            <p className="text-lg font-bold text-red-400">{formatCurrency(expenseStats.totalExpenses)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('Net Profit')}</p>
            <p className={`text-lg font-bold ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(netProfit)}
            </p>
          </div>
        </div>
      </Card>

      {/* Pending Invoices Alert */}
      {invoiceStats.sentCount > 0 && (
        <Card className="p-4 border-yellow-500/20 bg-yellow-500/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400" />
            <div>
              <p className="text-yellow-400 font-medium">{t('Pending Payments')}</p>
              <p className="text-sm text-gray-400">
                You have {invoiceStats.sentCount} invoice{invoiceStats.sentCount > 1 ? 's' : ''} awaiting payment
                ({formatCurrency(invoiceStats.pendingRevenue)})
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Trades Section */}
      {contractor?.trades && contractor.trades.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">{t('Your Trades')}</h3>
          <div className="flex flex-wrap gap-2">
            {contractor.trades.map((trade) => (
              <span
                key={trade}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg capitalize"
              >
                {trade.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/portal/financials/invoices/new">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-white font-medium">{t('Create Invoice')}</p>
                <p className="text-sm text-gray-400">{t('Bill for your services')}</p>
              </div>
            </div>
          </Card>
        </Link>

        <Link href="/portal/inventory/count">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <Package className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-white font-medium">{t('Count Inventory')}</p>
                <p className="text-sm text-gray-400">{t('Update your truck stock levels')}</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
