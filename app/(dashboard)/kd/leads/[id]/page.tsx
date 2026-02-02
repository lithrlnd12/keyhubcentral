'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLead } from '@/lib/hooks/useLead';
import { useAuth } from '@/lib/hooks/useAuth';
import { useClaimLead } from '@/lib/hooks/useLeads';
import { updateLead } from '@/lib/firebase/leads';
import {
  LeadHeader,
  LeadInfo,
  LeadAssignment,
  LeadReturnModal,
  ConvertLeadDialog,
} from '@/components/leads';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { UserPlus } from 'lucide-react';

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();

  const { lead, loading, error } = useLead(id);

  const [showAssignment, setShowAssignment] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [localClaimError, setLocalClaimError] = useState<string | null>(null);

  const { claimLead, loading: claimLoading, error: claimError } = useClaimLead();

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);
  const canAssign = user?.role && ['owner', 'admin'].includes(user.role);

  // Sales reps can claim unassigned leads
  const canClaim =
    user?.role === 'sales_rep' &&
    lead?.status === 'new' &&
    !lead?.assignedTo;

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

  if (!lead) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Lead not found</p>
      </div>
    );
  }

  const handleClaim = async () => {
    if (!user?.uid || !lead) return;

    // Check if user has base location set (coordinates or zip code)
    if (!user?.baseCoordinates && !user?.baseZipCode) {
      setLocalClaimError('Please set your base zip code in your profile to claim leads.');
      return;
    }

    setLocalClaimError(null);
    try {
      await claimLead(
        lead.id,
        user.uid,
        user.baseCoordinates || null,
        user.baseZipCode || null
      );
    } catch (err) {
      console.error('Failed to claim lead:', err);
    }
  };

  const handleConvert = () => {
    setShowConvert(true);
  };

  const handleConvertSuccess = (jobId: string) => {
    router.push(`/kr/${jobId}`);
  };

  const handleMarkLost = async () => {
    try {
      setActionLoading(true);
      await updateLead(lead.id, { status: 'lost' });
    } catch (err) {
      console.error('Failed to mark lead as lost:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <LeadHeader
        lead={lead}
        canEdit={canEdit}
        canClaim={!!canClaim}
        claimLoading={claimLoading}
        onClaim={handleClaim}
        onReturn={() => setShowReturn(true)}
        onConvert={handleConvert}
        onMarkLost={handleMarkLost}
      />

      {/* Claim Error */}
      {(claimError || localClaimError) && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400">{claimError || localClaimError}</p>
        </div>
      )}

      {/* Assign Button for new leads */}
      {lead.status === 'new' && canAssign && (
        <div className="flex justify-end">
          <Button onClick={() => setShowAssignment(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Lead
          </Button>
        </div>
      )}

      {/* Lead Info */}
      <LeadInfo lead={lead} />

      {/* Assignment Modal */}
      {canAssign && (
        <LeadAssignment
          lead={lead}
          isOpen={showAssignment}
          onClose={() => setShowAssignment(false)}
        />
      )}

      {/* Return Modal */}
      <LeadReturnModal
        lead={lead}
        isOpen={showReturn}
        onClose={() => setShowReturn(false)}
      />

      {/* Convert Dialog */}
      <ConvertLeadDialog
        lead={lead}
        isOpen={showConvert}
        onClose={() => setShowConvert(false)}
        onConverted={handleConvertSuccess}
      />
    </div>
  );
}
