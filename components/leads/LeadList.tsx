'use client';

import { Lead } from '@/types/lead';
import { LeadCard } from './LeadCard';
import { Spinner } from '@/components/ui/Spinner';
import { Users, Plus } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

interface LeadListProps {
  leads: Lead[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  showAddButton?: boolean;
  className?: string;
}

export function LeadList({
  leads,
  loading = false,
  error = null,
  emptyMessage = 'No leads found',
  showAddButton = true,
  className,
}: LeadListProps) {
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

  if (leads.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <p className="text-gray-400 mb-4">{emptyMessage}</p>
        {showAddButton && (
          <Link
            href="/kd/leads/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-gold text-black rounded-lg font-medium hover:bg-brand-gold/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Lead
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {leads.map((lead) => (
        <LeadCard key={lead.id} lead={lead} />
      ))}
    </div>
  );
}
