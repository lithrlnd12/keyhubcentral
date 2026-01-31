'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { InboundCallDetail, InboundCallActions } from '@/components/inboundCalls';
import { useInboundCall } from '@/lib/hooks';

export default function CallDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { call, loading, error } = useInboundCall(id, { realtime: true });

  const handleConvertSuccess = (leadId: string) => {
    // Navigate to the new lead
    router.push(`/kr/leads/${leadId}`);
  };

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
        <Link href="/kts/calls">
          <Button variant="outline" className="mt-4">
            Back to Calls
          </Button>
        </Link>
      </div>
    );
  }

  if (!call) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Call not found</p>
        <Link href="/kts/calls">
          <Button variant="outline" className="mt-4">
            Back to Calls
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Link
        href="/kts/calls"
        className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Calls
      </Link>

      {/* Actions */}
      <div className="bg-brand-charcoal rounded-xl p-4 border border-gray-800">
        <h3 className="text-white font-medium mb-3">Actions</h3>
        <InboundCallActions call={call} onConvertSuccess={handleConvertSuccess} />
      </div>

      {/* Call details */}
      <InboundCallDetail call={call} />
    </div>
  );
}
