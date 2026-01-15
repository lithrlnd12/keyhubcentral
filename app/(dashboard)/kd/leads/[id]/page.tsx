'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLead } from '@/lib/hooks/useLead';
import { useAuth } from '@/lib/hooks/useAuth';
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

  const canEdit = user?.role && ['owner', 'admin'].includes(user.role);
  const canAssign = user?.role && ['owner', 'admin'].includes(user.role);

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
        onReturn={() => setShowReturn(true)}
        onConvert={handleConvert}
        onMarkLost={handleMarkLost}
      />

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
