'use client';

import { useAuth } from '@/lib/hooks/useAuth';
import { useLeads } from '@/lib/hooks/useLeads';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { LeadList } from '@/components/leads';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getLeadCountSummary } from '@/lib/utils/leads';
import { Users, Flame, ThermometerSun, CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function SubscriberDashboard() {
  const { user, loading: authLoading } = useAuth();

  // Get leads assigned to this subscriber
  const { leads, loading, error } = useLeads({
    realtime: true,
    initialFilters: { assignedTo: user?.uid },
  });

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    redirect('/login');
  }

  const summary = getLeadCountSummary(leads);
  const recentLeads = leads.slice(0, 6);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-gray-400 mt-1">Your lead portal dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-brand-gold" />
              <div>
                <p className="text-2xl font-bold text-white">{summary.total}</p>
                <p className="text-sm text-gray-400">Total Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Flame className="w-8 h-8 text-red-400" />
              <div>
                <p className="text-2xl font-bold text-red-400">{summary.hot}</p>
                <p className="text-sm text-gray-400">Hot Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ThermometerSun className="w-8 h-8 text-orange-400" />
              <div>
                <p className="text-2xl font-bold text-orange-400">{summary.warm}</p>
                <p className="text-sm text-gray-400">Warm Leads</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-400" />
              <div>
                <p className="text-2xl font-bold text-green-400">{summary.converted}</p>
                <p className="text-sm text-gray-400">Converted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/subscriber/leads">
          <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Users className="w-6 h-6 text-brand-gold" />
                <div>
                  <p className="text-white font-medium">View All Leads</p>
                  <p className="text-sm text-gray-400">Manage your assigned leads</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500" />
            </CardContent>
          </Card>
        </Link>

        <Link href="/subscriber/subscription">
          <Card className="hover:border-brand-gold/50 transition-colors cursor-pointer">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-brand-gold" />
                <div>
                  <p className="text-white font-medium">Subscription</p>
                  <p className="text-sm text-gray-400">View your plan details</p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-500" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Leads</CardTitle>
          <Link href="/subscriber/leads">
            <Button variant="ghost" size="sm">
              View All
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <LeadList
            leads={recentLeads}
            loading={loading}
            error={error}
            showAddButton={false}
            emptyMessage="No leads assigned yet. Check back soon!"
          />
        </CardContent>
      </Card>
    </div>
  );
}
