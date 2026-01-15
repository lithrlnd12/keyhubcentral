'use client';

import { useState } from 'react';
import { Lead } from '@/types/lead';
import { JobType } from '@/types/job';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { convertLeadToJob } from '@/lib/firebase/leads';
import { ArrowRightCircle, X, Home, ChefHat, PaintBucket, Wrench } from 'lucide-react';

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
  const [jobType, setJobType] = useState<JobType | ''>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleConvert = async () => {
    if (!jobType) {
      setError('Please select a job type');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const jobId = await convertLeadToJob(lead.id, jobType);
      onConverted?.(jobId);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to convert lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ArrowRightCircle className="w-5 h-5 text-green-400" />
            Convert to Job
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

          {/* Info Notice */}
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400">
              Converting this lead will create a new job in Key Renovations and
              link it to this lead for tracking.
            </p>
          </div>

          {/* Job Type Selection */}
          <div className="space-y-2">
            <label className="text-sm text-gray-400 font-medium">Job Type</label>
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
