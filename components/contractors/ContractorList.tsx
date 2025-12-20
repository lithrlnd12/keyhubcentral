'use client';

import { Users } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Contractor } from '@/types/contractor';
import { ContractorCard } from './ContractorCard';

interface ContractorListProps {
  contractors: Contractor[];
  loading: boolean;
  error: string | null;
}

export function ContractorList({ contractors, loading, error }: ContractorListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  if (contractors.length === 0) {
    return (
      <div className="bg-brand-charcoal rounded-xl p-8 border border-gray-800 text-center">
        <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-white mb-1">No contractors found</h3>
        <p className="text-gray-400 text-sm">
          Try adjusting your filters or add a new contractor.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {contractors.map((contractor) => (
        <ContractorCard key={contractor.id} contractor={contractor} />
      ))}
    </div>
  );
}
