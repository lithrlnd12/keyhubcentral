'use client';

import { useState } from 'react';
import { Loader2, MapPin, Calendar, Briefcase, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useAvailableLeads } from '@/lib/hooks/useAvailableLeads';

export default function PortalLeadsPage() {
  const { leads, loading, accepting, error, clearError, acceptLead } = useAvailableLeads();
  const [successId, setSuccessId] = useState<string | null>(null);

  const handleAccept = async (leadId: string) => {
    try {
      await acceptLead(leadId);
      setSuccessId(leadId);
      setTimeout(() => setSuccessId(null), 3000);
    } catch {
      // Error is handled by the hook
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Available Jobs</h1>
        <p className="text-gray-400 mt-1">
          Customer projects near you — first to accept wins
        </p>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400 text-sm flex-1">{error}</p>
          <button onClick={clearError} className="text-red-400 text-sm font-medium hover:text-red-300">
            Dismiss
          </button>
        </div>
      )}

      {/* Success Toast */}
      {successId && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-400" />
          <p className="text-green-400 text-sm">Job accepted! Check your calendar for details.</p>
        </div>
      )}

      {/* Lead Cards */}
      {leads.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-brand-gold" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No available jobs right now</h3>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            New customer requests will appear here when they match your specialties and service area. Check back soon!
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Card key={lead.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Targeted / Specialties */}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {lead.targetedContractorId && (
                      <Badge variant="success">Direct Request</Badge>
                    )}
                    {lead.specialties && lead.specialties.length > 0 && lead.specialties.map((s) => (
                      <Badge key={s} variant="info">{s}</Badge>
                    ))}
                  </div>

                  {/* Description */}
                  {lead.customer?.notes && (
                    <p className="text-white text-sm mb-2 line-clamp-2">
                      {lead.customer.notes}
                    </p>
                  )}

                  {/* Meta info */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                    {lead.distance !== null && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {lead.distance.toFixed(1)} mi
                      </span>
                    )}
                    {lead.customer?.address?.city && lead.customer?.address?.state && (
                      <span>
                        {lead.customer.address.city}, {lead.customer.address.state}
                      </span>
                    )}
                    {lead.preferredDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {lead.preferredDate}
                      </span>
                    )}
                  </div>
                </div>

                {/* Accept Button */}
                <Button
                  onClick={() => handleAccept(lead.id)}
                  disabled={accepting === lead.id}
                  className="flex-shrink-0"
                >
                  {accepting === lead.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Accept Job'
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
