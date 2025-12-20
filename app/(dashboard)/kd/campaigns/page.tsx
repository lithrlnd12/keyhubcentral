'use client';

import { useCampaigns } from '@/lib/hooks/useCampaigns';
import { useAuth } from '@/lib/hooks/useAuth';
import { CampaignList } from '@/components/campaigns';
import { Button } from '@/components/ui/Button';
import { getCampaignSummary } from '@/lib/utils/campaigns';
import { formatCurrency } from '@/lib/utils/formatters';
import { Plus, Megaphone, DollarSign, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function CampaignsPage() {
  const { user } = useAuth();
  const { campaigns, loading, error } = useCampaigns({ realtime: true });

  const summary = getCampaignSummary(campaigns);
  const canCreate = user?.role && ['owner', 'admin'].includes(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/kd"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to KD
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Campaigns</h1>
            <p className="text-gray-400 mt-1">Manage marketing campaigns and track performance</p>
          </div>
          {canCreate && (
            <Link href="/kd/campaigns/new">
              <Button className="w-full sm:w-auto">
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Megaphone className="w-8 h-8 text-brand-gold" />
            <div>
              <p className="text-2xl font-bold text-white">{summary.total}</p>
              <p className="text-sm text-gray-400">Total Campaigns</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-2xl font-bold text-green-400">
                {formatCurrency(summary.totalSpend)}
              </p>
              <p className="text-sm text-gray-400">Total Spend</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-2xl font-bold text-blue-400">{summary.totalLeads}</p>
              <p className="text-sm text-gray-400">Leads Generated</p>
            </div>
          </div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-purple-400" />
            <div>
              <p className="text-2xl font-bold text-purple-400">
                {formatCurrency(summary.avgCPL)}
              </p>
              <p className="text-sm text-gray-400">Avg CPL</p>
            </div>
          </div>
        </div>
      </div>

      {/* Campaign List */}
      <CampaignList
        campaigns={campaigns}
        loading={loading}
        error={error}
        showAddButton={canCreate}
        emptyMessage="No campaigns yet. Create your first campaign to start tracking performance."
      />
    </div>
  );
}
