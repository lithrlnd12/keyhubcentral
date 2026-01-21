'use client';

import { useState, useEffect } from 'react';
import { Job, CompletionCertificate as CompletionCertType } from '@/types/job';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SignaturePad } from './SignaturePad';
import {
  saveCompletionCertificate,
  getCompletionCertificate,
  checkCompletionRequirements,
  CompletionRequirements,
} from '@/lib/firebase/completionCert';
import { useAuth } from '@/lib/hooks';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  User,
  Calendar,
  Loader2,
  FileText,
  Camera,
  Package,
} from 'lucide-react';

interface CompletionCertificateProps {
  job: Job;
  onSaved?: () => void;
  readOnly?: boolean;
}

export function CompletionCertificate({
  job,
  onSaved,
  readOnly = false,
}: CompletionCertificateProps) {
  const { user } = useAuth();
  const [requirements, setRequirements] = useState<CompletionRequirements | null>(null);
  const [existingCert, setExistingCert] = useState<CompletionCertType | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [contractorSignature, setContractorSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [job.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqs, cert] = await Promise.all([
        checkCompletionRequirements(job.id),
        getCompletionCertificate(job.id),
      ]);
      setRequirements(reqs);
      setExistingCert(cert);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load completion certificate data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!customerSignature || !contractorSignature) {
      setError('Both signatures are required');
      return;
    }

    if (!user) {
      setError('You must be logged in');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCompletionCertificate(
        job.id,
        customerSignature,
        contractorSignature,
        user.uid,
        job.customer.name,
        notes || undefined
      );
      await loadData();
      onSaved?.();
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save completion certificate');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (timestamp: { seconds: number } | null | undefined) => {
    if (!timestamp) return '-';
    return new Date(timestamp.seconds * 1000).toLocaleString();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-brand-gold" />
        </CardContent>
      </Card>
    );
  }

  // Show existing certificate if already signed
  if (existingCert) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-green-400" />
            Completion Certificate
            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">
              Signed
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Summary */}
          <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-white">{job.customer.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">
                {job.customer.address.street}, {job.customer.address.city},{' '}
                {job.customer.address.state} {job.customer.address.zip}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">Job #{job.jobNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-300 text-sm">
                Signed: {formatDate(existingCert.signedAt)}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">Customer Signature</label>
              <div className="border border-gray-700 rounded-lg p-2 bg-white">
                <img
                  src={existingCert.customerSignatureUrl}
                  alt="Customer signature"
                  className="w-full h-[100px] object-contain"
                />
              </div>
              <p className="text-xs text-gray-500">{existingCert.customerName}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">Contractor Signature</label>
              <div className="border border-gray-700 rounded-lg p-2 bg-white">
                <img
                  src={existingCert.contractorSignatureUrl}
                  alt="Contractor signature"
                  className="w-full h-[100px] object-contain"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          {existingCert.notes && (
            <div>
              <label className="text-sm text-gray-400 font-medium">Notes</label>
              <p className="text-white text-sm mt-1">{existingCert.notes}</p>
            </div>
          )}

          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-sm text-green-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              Work completion has been acknowledged by both parties
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show signing form
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-brand-gold" />
          Completion Certificate
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Requirements Check */}
        {requirements && !requirements.isValid && (
          <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-2">
            <p className="text-sm text-yellow-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Requirements not met
            </p>
            <ul className="text-sm text-yellow-300 space-y-1 ml-6">
              {requirements.missingRequirements.map((req, i) => (
                <li key={i} className="list-disc">
                  {req}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Requirements Status */}
        {requirements && (
          <div className="grid grid-cols-3 gap-2">
            <div
              className={`p-2 rounded-lg flex items-center gap-2 ${
                requirements.hasBeforePhotos
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs">Before Photos</span>
              {requirements.hasBeforePhotos && <CheckCircle2 className="w-3 h-3 ml-auto" />}
            </div>
            <div
              className={`p-2 rounded-lg flex items-center gap-2 ${
                requirements.hasAfterPhotos
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span className="text-xs">After Photos</span>
              {requirements.hasAfterPhotos && <CheckCircle2 className="w-3 h-3 ml-auto" />}
            </div>
            <div
              className={`p-2 rounded-lg flex items-center gap-2 ${
                requirements.hasMaterialsCollected
                  ? 'bg-green-500/10 text-green-400'
                  : 'bg-red-500/10 text-red-400'
              }`}
            >
              <Package className="w-4 h-4" />
              <span className="text-xs">Materials</span>
              {requirements.hasMaterialsCollected && <CheckCircle2 className="w-3 h-3 ml-auto" />}
            </div>
          </div>
        )}

        {/* Job Summary */}
        <div className="p-3 bg-gray-800/50 rounded-lg space-y-2">
          <h4 className="text-sm font-medium text-white">Work Completed For:</h4>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-white">{job.customer.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">
              {job.customer.address.street}, {job.customer.address.city},{' '}
              {job.customer.address.state} {job.customer.address.zip}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-gray-300 text-sm">Job #{job.jobNumber}</span>
          </div>
        </div>

        {/* Agreement Text */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-400">
            By signing below, the customer acknowledges that the work described in the contract
            has been completed satisfactorily and accepts the job as complete.
          </p>
        </div>

        {/* Signatures */}
        {!readOnly && (
          <div className="space-y-4">
            <SignaturePad
              label="Customer Signature"
              onSave={setCustomerSignature}
              onClear={() => setCustomerSignature(null)}
              disabled={!requirements?.isValid}
            />

            <SignaturePad
              label="Contractor Signature"
              onSave={setContractorSignature}
              onClear={() => setContractorSignature(null)}
              disabled={!requirements?.isValid}
            />

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400 font-medium">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm resize-none"
                rows={3}
                placeholder="Any additional notes or comments..."
                disabled={!requirements?.isValid}
              />
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p className="text-red-400 text-sm">{error}</p>}

        {/* Actions */}
        {!readOnly && (
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={
                saving ||
                !customerSignature ||
                !contractorSignature ||
                !requirements?.isValid
              }
              className="bg-green-500 hover:bg-green-600 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Complete & Sign
                </>
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
