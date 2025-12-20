'use client';

import { Campaign } from '@/types/lead';
import { CampaignCard } from './CampaignCard';
import { Spinner } from '@/components/ui/Spinner';
import { Megaphone, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface CampaignListProps {
  campaigns: Campaign[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showAddButton?: boolean;
  className?: string;
}

export function CampaignList({
  campaigns,
  loading = false,
  error = null,
  emptyMessage = 'No campaigns found',
  showAddButton = true,
  className,
}: CampaignListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12">
        <Megaphone className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">{emptyMessage}</p>
        {showAddButton && (
          <Link
            href="/kd/campaigns/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg font-medium hover:bg-brand-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Campaign
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {campaigns.map((campaign) => (
        <CampaignCard key={campaign.id} campaign={campaign} />
      ))}
    </div>
  );
}
