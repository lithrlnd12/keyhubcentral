'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead } from '@/types/lead';
import { JobType } from '@/types/job';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { convertLeadToJob } from '@/lib/firebase/leads';
import { useAuth } from '@/lib/hooks';
import {
  ArrowRightCircle,
  X,
  Home,
  ChefHat,
  PaintBucket,
  Wrench,
  DollarSign,
  FileSignature,
} from 'lucide-react';

interface ConvertLeadDialogProps {
  lead: Lead;
  isOpen: boolean;
  onClose: () => void;
  onConverted?: (jobId: string) => void;
}

const JOB_TYPES: { value: JobType; label: string; icon: React.ReactNode }[] = [
  { value: 'bathroom', label: 'Bathroom', icon: <Home className="w-5 h-5" /> },
  { value: 'kitchen', label: 'Kitchen', icon: <ChefHat className="w-5 h-5" /> },
  { value: 'exterior', label: 'Exterior', icon: <PaintBucket className="w-5 h-5" /> },
  { value: 'other', label: 'Other', icon: <Wrench className="w-5 h-5" /> },
];

export function ConvertLeadDialog({
  lead,
  isOpen,
  onClose,
  onConverted,
}: ConvertLeadDialogProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [jobType, setJobType] = useState<JobType | ''>('');
  const [contractValue, setContractValue] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async () => {
    if (!jobType) {
      setError('Please select a job type');
      return;
    }

    if (!user) {
      setError('You must be logged in to convert leads');
      return;
    }

    const contractValueNum = parseFloat(contractValue);
    if (!contractValue || isNaN(contractValueNum) || contractValueNum <= 0) {
      setError('Please enter a valid contract value');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Converting lead:', {
        leadId: lead.id,
        jobType,
        userId: user.uid,
        contractValue: contractValueNum,
      });

      // Convert lead to job
      const jobId = await convertLeadToJob(lead.id, jobType, user.uid, {
        contractValue: contractValueNum,
      });

      console.log('Job created:', jobId);

      onConverted?.(jobId);
      onClose();

      // Redirect to contract signing page
      router.push(`/kr/${jobId}/sign`);
    } catch (err) {
      console.error('Convert lead error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to convert lead';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters except decimal
    const cleaned = value.replace(/[^\d.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return parts[0] + '.' + parts.slice(1).join('');
    }
    return cleaned;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-green-400" />
            Convert to Job
          </CardTitle>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={loading}
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

          {/* Job Type Selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Job Type *</label>
            <div className="grid grid-cols-2 gap-2">
              {JOB_TYPES.map((type) => (
                <label
                  key={type.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    jobType === type.value
                      ? 'bg-brand-gold/20 border-brand-gold'
                      : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <input
                    type="radio"
                    name="jobType"
                    value={type.value}
                    checked={jobType === type.value}
                    onChange={(e) => setJobType(e.target.value as JobType)}
                    className="sr-only"
                    disabled={loading}
                  />
                  <span className={jobType === type.value ? 'text-brand-gold' : 'text-gray-400'}>
                    {type.icon}
                  </span>
                  <span className={jobType === type.value ? 'text-white' : 'text-gray-400'}>
                    {type.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Contract Value */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Contract Value *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={contractValue}
                onChange={(e) => setContractValue(formatCurrency(e.target.value))}
                placeholder="0.00"
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-brand-gold"
                disabled={loading}
              />
            </div>
          </div>

          {/* Info Notice */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg flex items-start gap-3">
            <FileSignature className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-400">
              After creating the job, you&apos;ll be taken to the contract signing page to complete
              the Remodeling Agreement and Disclosure Statement with the customer.
            </p>
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
            <Button
              onClick={handleConvert}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              disabled={loading}
            >
              {loading ? 'Converting...' : 'Convert to Job'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
