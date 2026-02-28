'use client';

import { useState } from 'react';
import { Timestamp } from 'firebase/firestore';
import { Job, JobCommission as JobCommissionType, CommissionStatus } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency } from '@/lib/utils/formatters';
import { DollarSign, Check, Clock, Percent, Edit2, X } from 'lucide-react';

interface JobCommissionProps {
  job: Job;
  canEdit: boolean;
  canApprove: boolean;
  userId: string;
  onUpdate: (data: Partial<Job>) => Promise<void>;
}

const STATUS_COLORS: Record<CommissionStatus, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400',
  approved: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400',
};

const STATUS_LABELS: Record<CommissionStatus, string> = {
  pending: 'Pending Approval',
  approved: 'Approved',
  paid: 'Paid',
};

// Default commission rates per PRD
const DEFAULT_COMMISSION_RATES = [
  { label: 'Standard (8%)', value: 0.08 },
  { label: 'Pro (9%)', value: 0.09 },
  { label: 'Elite (10%)', value: 0.10 },
];

export function JobCommission({ job, canEdit, canApprove, userId, onUpdate }: JobCommissionProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contractValue, setContractValue] = useState(
    job.commission?.contractValue?.toString() || ''
  );
  const [rate, setRate] = useState(job.commission?.rate || 0.08);
  const [notes, setNotes] = useState(job.commission?.notes || '');

  const commission = job.commission;
  const calculatedAmount = parseFloat(contractValue || '0') * rate;

  const handleSave = async () => {
    if (!contractValue || parseFloat(contractValue) <= 0) return;

    setSaving(true);
    try {
      const newCommission: JobCommissionType = {
        contractValue: parseFloat(contractValue),
        rate,
        amount: parseFloat(contractValue) * rate,
        status: commission?.status || 'pending',
        approvedAt: commission?.approvedAt || null,
        approvedBy: commission?.approvedBy || null,
        paidAt: commission?.paidAt || null,
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      };

      await onUpdate({ commission: newCommission });
      setEditing(false);
    } catch (error) {
      console.error('Error saving commission:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!commission) return;

    setSaving(true);
    try {
      await onUpdate({
        commission: {
          ...commission,
          status: 'approved',
          approvedAt: Timestamp.now(),
          approvedBy: userId,
        },
      });
    } catch (error) {
      console.error('Error approving commission:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!commission) return;

    setSaving(true);
    try {
      await onUpdate({
        commission: {
          ...commission,
          status: 'paid',
          paidAt: Timestamp.now(),
        },
      });
    } catch (error) {
      console.error('Error marking commission paid:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'N/A';
    return timestamp.toDate().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // No commission set yet
  if (!commission && !editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-gold" />
            Sales Commission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-gray-500 mb-4">No commission set for this job</p>
            {canEdit && (
              <Button onClick={() => setEditing(true)}>
                Set Commission
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Editing mode
  if (editing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-gold" />
            Sales Commission
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Contract Value</label>
            <Input
              type="number"
              placeholder="0.00"
              value={contractValue}
              onChange={(e) => setContractValue(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Commission Rate</label>
            <div className="grid grid-cols-3 gap-2">
              {DEFAULT_COMMISSION_RATES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRate(r.value)}
                  className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                    rate === r.value
                      ? 'bg-brand-gold text-black font-medium'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Calculated Commission</span>
              <span className="text-2xl font-bold text-brand-gold">
                {formatCurrency(calculatedAmount)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
            <Input
              placeholder="Any notes about this commission..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !contractValue}>
              {saving ? <Spinner size="sm" /> : 'Save Commission'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setEditing(false);
                setContractValue(commission?.contractValue?.toString() || '');
                setRate(commission?.rate || 0.08);
                setNotes(commission?.notes || '');
              }}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Display mode
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-brand-gold" />
            Sales Commission
          </CardTitle>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm ${STATUS_COLORS[commission!.status]}`}>
              {STATUS_LABELS[commission!.status]}
            </span>
            {canEdit && commission!.status === 'pending' && (
              <button
                onClick={() => setEditing(true)}
                className="p-1 text-gray-400 hover:text-white transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-500">Contract Value</p>
            <p className="text-lg font-medium text-white">
              {formatCurrency(commission!.contractValue)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Rate</p>
            <p className="text-lg font-medium text-white flex items-center gap-1">
              <Percent className="w-4 h-4" />
              {(commission!.rate * 100).toFixed(0)}%
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Commission Amount</p>
            <p className="text-lg font-bold text-brand-gold">
              {formatCurrency(commission!.amount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Status</p>
            <p className="text-lg font-medium text-white">
              {STATUS_LABELS[commission!.status]}
            </p>
          </div>
        </div>

        {commission!.notes && (
          <div className="bg-gray-800 rounded-lg p-3">
            <p className="text-sm text-gray-400">Notes</p>
            <p className="text-white">{commission!.notes}</p>
          </div>
        )}

        {(commission!.approvedAt || commission!.paidAt) && (
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-700">
            {commission!.approvedAt && (
              <div>
                <p className="text-sm text-gray-500">Approved</p>
                <p className="text-white">{formatDate(commission!.approvedAt)}</p>
              </div>
            )}
            {commission!.paidAt && (
              <div>
                <p className="text-sm text-gray-500">Paid</p>
                <p className="text-white">{formatDate(commission!.paidAt)}</p>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {canApprove && (
          <div className="flex gap-2 pt-2">
            {commission!.status === 'pending' && (
              <Button onClick={handleApprove} disabled={saving}>
                {saving ? <Spinner size="sm" /> : (
                  <>
                    <Check className="w-4 h-4 mr-1" />
                    Approve Commission
                  </>
                )}
              </Button>
            )}
            {commission!.status === 'approved' && (
              <Button onClick={handleMarkPaid} disabled={saving}>
                {saving ? <Spinner size="sm" /> : (
                  <>
                    <DollarSign className="w-4 h-4 mr-1" />
                    Mark as Paid
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
