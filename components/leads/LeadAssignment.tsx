'use client';

import { useState } from 'react';
import { Lead, AssignedType } from '@/types/lead';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { assignLead } from '@/lib/firebase/leads';
import { UserPlus, Users, Building2, X } from 'lucide-react';

interface LeadAssignmentProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onAssigned?: () => void;
}

export function LeadAssignment({
  lead,
  isOpen,
  onClose,
  onAssigned,
}: LeadAssignmentProps) {
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedType, setAssignedType] = useState<AssignedType>('internal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!assignedTo.trim()) {
      setError('Please enter an assignee');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await assignLead(lead.id, assignedTo, assignedType);
      onAssigned?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-brand-gold" />
            Assign Lead
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Lead Info */}
          <div className="p-3 bg-gray-800/50 rounded-lg">
            <p className="text-white font-medium">{lead.customer.name}</p>
            <p className="text-sm text-gray-400">
              {lead.trade} • {lead.customer.address.city}
            </p>
          </div>

          {/* Assignment Type */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Assignment Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAssignedType('internal')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  assignedType === 'internal'
                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Users className="w-4 h-4" />
                Internal (KR)
              </button>
              <button
                type="button"
                onClick={() => setAssignedType('subscriber')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border transition-colors ${
                  assignedType === 'subscriber'
                    ? 'bg-brand-gold/20 border-brand-gold text-brand-gold'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Subscriber
              </button>
            </div>
          </div>

          {/* Assignee ID */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">
              {assignedType === 'internal' ? 'Sales Rep ID' : 'Subscriber ID'}
            </label>
            <Input
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              placeholder={
                assignedType === 'internal'
                  ? 'Enter sales rep user ID'
                  : 'Enter subscriber user ID'
              }
            />
          </div>

          {/* Error */}
          {error && <p className="text-red-400 text-sm">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleAssign} className="flex-1" disabled={loading}>
              {loading ? 'Assigning...' : 'Assign Lead'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
