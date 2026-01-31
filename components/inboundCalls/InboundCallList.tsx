'use client';

import { Phone } from 'lucide-react';
import { InboundCall } from '@/types/inboundCall';
import { InboundCallCard } from './InboundCallCard';
import { Spinner } from '@/components/ui/Spinner';

interface InboundCallListProps {
  calls: InboundCall[];
  loading?: boolean;
  error?: string | null;
}

export function InboundCallList({ calls, loading, error }: InboundCallListProps) {
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

  if (calls.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <Phone className="w-6 h-6 text-gray-500" />
        </div>
        <h3 className="text-white font-medium mb-1">No calls found</h3>
        <p className="text-gray-400 text-sm">
          Inbound calls will appear here when customers call your Vapi number.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {calls.map((call) => (
        <InboundCallCard key={call.id} call={call} />
      ))}
    </div>
  );
}
