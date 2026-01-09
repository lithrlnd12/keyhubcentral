'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Calendar, Briefcase, DollarSign, Package, Clock, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks';
import { getContractorByUserId } from '@/lib/firebase/contractors';
import { Contractor } from '@/types/contractor';
import { formatCurrency } from '@/lib/utils/formatters';

// Mock data for dashboard stats - will be replaced with real data
const mockStats = {
  activeJobs: 3,
  upcomingJobs: 2,
  pendingEarnings: 2850,
  totalEarnings: 7540,
  lowStockItems: 2,
};

export default function PortalDashboardPage() {
  const { user } = useAuth();
  const [contractor, setContractor] = useState<Contractor | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContractor() {
      if (user?.uid) {
        try {
          const data = await getContractorByUserId(user.uid);
          setContractor(data);
        } catch (error) {
          console.error('Error loading contractor:', error);
        } finally {
          setLoading(false);
        }
      }
    }
    loadContractor();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-2 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">
          Welcome back{contractor?.businessName ? `, ${contractor.businessName}` : ''}!
        </h1>
        <p className="text-gray-400 mt-1">
          Here&apos;s an overview of your activity
        </p>
      </div>

      {/* Status Card */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <p className="text-white font-medium">Status</p>
              <p className="text-sm text-gray-400">
                {contractor?.status === 'active' ? 'Active & Available' : contractor?.status || 'Unknown'}
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
              <span className="text-sm text-gray-400">Active Jobs</span>
            </div>
            <p className="text-2xl font-bold text-white">{mockStats.activeJobs}</p>
            <p className="text-xs text-gray-500">{mockStats.upcomingJobs} upcoming</p>
          </Card>
        </Link>

        <Link href="/portal/earnings">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-400" />
              </div>
              <span className="text-sm text-gray-400">Earnings</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{formatCurrency(mockStats.totalEarnings)}</p>
            <p className="text-xs text-yellow-400">{formatCurrency(mockStats.pendingEarnings)} pending</p>
          </Card>
        </Link>

        <Link href="/portal/availability">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-gold/10 rounded-lg">
                <Calendar className="h-5 w-5 text-gold" />
              </div>
              <span className="text-sm text-gray-400">Availability</span>
            </div>
            <p className="text-lg font-bold text-white">Set Schedule</p>
            <p className="text-xs text-gray-500">Manage your calendar</p>
          </Card>
        </Link>

        <Link href="/portal/inventory">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer h-full">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Package className="h-5 w-5 text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Inventory</span>
            </div>
            <p className="text-lg font-bold text-white">Truck Stock</p>
            {mockStats.lowStockItems > 0 ? (
              <p className="text-xs text-red-400">{mockStats.lowStockItems} items low</p>
            ) : (
              <p className="text-xs text-gray-500">All stocked</p>
            )}
          </Card>
        </Link>
      </div>

      {/* Trades Section */}
      {contractor?.trades && contractor.trades.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Your Trades</h3>
          <div className="flex flex-wrap gap-2">
            {contractor.trades.map((trade) => (
              <span
                key={trade}
                className="px-3 py-1.5 bg-gray-800 text-white text-sm rounded-lg"
              >
                {trade}
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/portal/availability">
          <Card className="p-4 hover:border-gold/50 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gold/10 rounded-lg">
                <Clock className="h-6 w-6 text-gold" />
              </div>
              <div>
                <p className="text-white font-medium">Update Availability</p>
                <p className="text-sm text-gray-400">Set your schedule for upcoming days</p>
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
                <p className="text-white font-medium">Count Inventory</p>
                <p className="text-sm text-gray-400">Update your truck stock levels</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
}
