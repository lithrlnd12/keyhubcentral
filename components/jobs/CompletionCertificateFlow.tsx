'use client';

import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Job, CompletionCertificate as CompletionCertType } from '@/types/job';
import { CompletionCertPDFDocument } from '@/components/pdf/CompletionCertPDFDocument';
import { SignaturePad } from './SignaturePad';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  saveCompletionCertificate,
  getCompletionCertificate,
  checkCompletionRequirements,
  CompletionRequirements,
} from '@/lib/firebase/completionCert';
import { useAuth } from '@/lib/hooks';
import {
  ClipboardCheck,
  PenLine,
  CheckCircle,
  AlertCircle,
  FileCheck,
  Loader2,
  Download,
  Eye,
  Camera,
  Package,
  DollarSign,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';

type Step = 'review' | 'sign' | 'confirm';

interface CompletionCertificateFlowProps {
  job: Job;
  onComplete?: () => void;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

export function CompletionCertificateFlow({ job, onComplete }: CompletionCertificateFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('review');
  const [requirements, setRequirements] = useState<CompletionRequirements | null>(null);
  const [existingCert, setExistingCert] = useState<CompletionCertType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Signature state
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [contractorSignature, setContractorSignature] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Confirm state
  const [pdfUrl, setPdfUrl] = useState<string>('');

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'review', label: 'Review', icon: <ClipboardCheck className="w-4 h-4" /> },
    { key: 'sign', label: 'Sign', icon: <PenLine className="w-4 h-4" /> },
    { key: 'confirm', label: 'Complete', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const loadData = useCallback(async () => {
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
  }, [job.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSign = async () => {
    if (!customerSignature || !contractorSignature || !user) {
      setError('Both signatures are required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const signedDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      // Generate PDF
      const pdfDoc = (
        <CompletionCertPDFDocument
          job={job}
          customerName={job.customer.name}
          contractorName={user.displayName || 'Contractor'}
          notes={notes || undefined}
          signedDate={signedDate}
          customerSignatureUrl={customerSignature}
          contractorSignatureUrl={contractorSignature}
        />
      );
      const pdfBlob = await pdf(pdfDoc).toBlob();

      const costSnapshot = job.costs
        ? {
            materialProjected: job.costs.materialProjected,
            materialActual: job.costs.materialActual,
            laborProjected: job.costs.laborProjected,
            laborActual: job.costs.laborActual,
          }
        : undefined;

      const cert = await saveCompletionCertificate(
        job.id,
        customerSignature,
        contractorSignature,
        user.uid,
        job.customer.name,
        user.displayName || 'Contractor',
        notes || undefined,
        pdfBlob,
        costSnapshot
      );

      setPdfUrl(cert.pdfUrl || '');
      setExistingCert(cert);
      setStep('confirm');
    } catch (err) {
      console.error('Failed to save:', err);
      setError(err instanceof Error ? err.message : 'Failed to save completion certificate');
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = async () => {
    const url = pdfUrl || existingCert?.pdfUrl;
    if (!url) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `Completion-Certificate-${job.jobNumber || job.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const formatTimestamp = (ts: { seconds: number } | null | undefined) => {
    if (!ts) return '-';
    return new Date(ts.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  // Show existing certificate (read-only)
  if (existingCert && step !== 'confirm') {
    const costs = existingCert.costs;
    return (
      <div className="space-y-6">
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="py-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <FileCheck className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Completion Certificate Signed</h2>
                <p className="text-gray-400 text-sm">Signed on {formatTimestamp(existingCert.signedAt)}</p>
              </div>
            </div>

            {/* Cost snapshot */}
            {costs && (
              <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                <h3 className="text-sm font-medium text-gray-300 mb-3">Cost Summary at Signing</h3>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Materials</p>
                    <p className="text-white">{fmt(costs.materialActual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Labor</p>
                    <p className="text-white">{fmt(costs.laborActual)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total</p>
                    <p className="text-white font-medium">
                      {fmt(costs.materialActual + costs.laborActual)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingCert.customerSignatureUrl}
                  alt="Customer signature"
                  className="h-16 mx-auto bg-white rounded p-1"
                />
                <p className="text-sm text-gray-400 mt-1">{existingCert.customerName}</p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
              <div className="text-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={existingCert.contractorSignatureUrl}
                  alt="Contractor signature"
                  className="h-16 mx-auto bg-white rounded p-1"
                />
                <p className="text-sm text-gray-400 mt-1">{existingCert.contractorName || 'Contractor'}</p>
                <p className="text-xs text-gray-500">Contractor</p>
              </div>
            </div>

            {existingCert.notes && (
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-300">{existingCert.notes}</p>
              </div>
            )}

            {existingCert.pdfUrl && (
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleDownload} className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open(existingCert.pdfUrl!, '_blank')}
                  className="flex-1"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Saving overlay
  if (saving) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">Saving completion certificate...</p>
        <p className="text-sm text-gray-500">Uploading signatures and generating PDF</p>
      </div>
    );
  }

  const costs = job.costs;
  const totalProjected = (costs?.materialProjected || 0) + (costs?.laborProjected || 0);
  const totalActual = (costs?.materialActual || 0) + (costs?.laborActual || 0);
  const totalVariance = totalActual - totalProjected;

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-center max-w-md mx-auto">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                index === currentStepIndex
                  ? 'bg-blue-500/20 text-blue-500'
                  : index < currentStepIndex
                  ? 'bg-green-500/20 text-green-500'
                  : 'bg-gray-800 text-gray-500'
              }`}
            >
              {index < currentStepIndex ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                s.icon
              )}
              <span className="text-sm font-medium hidden sm:inline">{s.label}</span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-8 h-0.5 mx-2 ${
                  index < currentStepIndex ? 'bg-green-500' : 'bg-gray-700'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-sm text-red-500/80">{error}</p>
          </div>
        </div>
      )}

      {/* Step 1: Review */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Job Summary */}
          <Card>
            <CardContent className="py-6">
              <h3 className="text-lg font-medium text-white mb-4">Job Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Job Number</p>
                  <p className="text-white font-medium">{job.jobNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Project Type</p>
                  <p className="text-white font-medium capitalize">{job.type || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Customer</p>
                  <p className="text-white font-medium">{job.customer.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Address</p>
                  <p className="text-white font-medium">
                    {job.customer.address
                      ? `${job.customer.address.street}, ${job.customer.address.city}`
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cost Breakdown */}
          <Card>
            <CardContent className="py-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gold" />
                <h3 className="text-lg font-medium text-white">Cost Breakdown</h3>
              </div>

              {costs && (totalProjected > 0 || totalActual > 0) ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-2 pr-4">Category</th>
                        <th className="text-right text-gray-400 py-2 px-4">Projected</th>
                        <th className="text-right text-gray-400 py-2 px-4">Actual</th>
                        <th className="text-right text-gray-400 py-2 pl-4">Variance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pr-4 text-white">Materials</td>
                        <td className="text-right py-2 px-4 text-gray-300">{fmt(costs.materialProjected)}</td>
                        <td className="text-right py-2 px-4 text-white">{fmt(costs.materialActual)}</td>
                        <td className={`text-right py-2 pl-4 ${costs.materialActual - costs.materialProjected > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(costs.materialActual - costs.materialProjected)}
                        </td>
                      </tr>
                      <tr className="border-b border-gray-800">
                        <td className="py-2 pr-4 text-white">Labor</td>
                        <td className="text-right py-2 px-4 text-gray-300">{fmt(costs.laborProjected)}</td>
                        <td className="text-right py-2 px-4 text-white">{fmt(costs.laborActual)}</td>
                        <td className={`text-right py-2 pl-4 ${costs.laborActual - costs.laborProjected > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(costs.laborActual - costs.laborProjected)}
                        </td>
                      </tr>
                      <tr className="border-t-2 border-gray-600">
                        <td className="py-2 pr-4 text-white font-bold">Total</td>
                        <td className="text-right py-2 px-4 text-gray-300 font-bold">{fmt(totalProjected)}</td>
                        <td className="text-right py-2 px-4 text-white font-bold">{fmt(totalActual)}</td>
                        <td className={`text-right py-2 pl-4 font-bold ${totalVariance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {fmt(totalVariance)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No cost data entered for this job.</p>
              )}
            </CardContent>
          </Card>

          {/* Requirements Checklist */}
          <Card>
            <CardContent className="py-6">
              <h3 className="text-lg font-medium text-white mb-4">Completion Requirements</h3>
              {requirements && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {requirements.hasBeforePhotos ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" />
                      <span className={requirements.hasBeforePhotos ? 'text-white' : 'text-red-400'}>
                        Before photos uploaded
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {requirements.hasAfterPhotos ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4 text-gray-400" />
                      <span className={requirements.hasAfterPhotos ? 'text-white' : 'text-red-400'}>
                        After photos uploaded
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {requirements.hasMaterialsCollected ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-400" />
                    )}
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className={requirements.hasMaterialsCollected ? 'text-white' : 'text-red-400'}>
                        All materials collected/arrived
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-end">
            <Button
              onClick={() => setStep('sign')}
              disabled={!requirements?.isValid}
              className="gap-2"
            >
              Proceed to Signatures
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {!requirements?.isValid && requirements && (
            <p className="text-sm text-yellow-400 text-center">
              Complete all requirements above before proceeding.
            </p>
          )}
        </div>
      )}

      {/* Step 2: Sign */}
      {step === 'sign' && (
        <div className="space-y-6">
          {/* Agreement Text */}
          <Card>
            <CardContent className="py-6">
              <h3 className="text-lg font-medium text-white mb-3">Acknowledgment</h3>
              <div className="bg-gray-900/50 rounded-lg p-4 text-sm text-gray-300 leading-relaxed">
                I, <strong className="text-white">{job.customer.name}</strong>, hereby acknowledge that the work
                performed on job <strong className="text-white">#{job.jobNumber}</strong> at my property has been
                completed to my satisfaction. I have inspected the finished work and confirm that it meets the
                agreed-upon specifications. This Certificate of Completion serves as my formal acceptance of
                the completed project.
              </div>
            </CardContent>
          </Card>

          {/* Customer Signature */}
          <Card>
            <CardContent className="py-6">
              <SignaturePad
                label={`Customer Signature — ${job.customer.name}`}
                onSave={(dataUrl) => setCustomerSignature(dataUrl)}
                onClear={() => setCustomerSignature(null)}
              />
            </CardContent>
          </Card>

          {/* Contractor Signature */}
          <Card>
            <CardContent className="py-6">
              <SignaturePad
                label={`Contractor Signature — ${user?.displayName || 'Contractor'}`}
                onSave={(dataUrl) => setContractorSignature(dataUrl)}
                onClear={() => setContractorSignature(null)}
              />
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardContent className="py-6">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Additional Notes (optional)</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes about the completed work..."
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gold resize-none"
              />
            </CardContent>
          </Card>

          {/* Navigation */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep('review')} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
            <Button
              onClick={handleSign}
              disabled={!customerSignature || !contractorSignature}
              className="gap-2"
            >
              <PenLine className="w-4 h-4" />
              Sign & Complete
            </Button>
          </div>

          {(!customerSignature || !contractorSignature) && (
            <p className="text-sm text-gray-500 text-center">
              Both signatures are required to complete.
            </p>
          )}
        </div>
      )}

      {/* Step 3: Confirm */}
      {step === 'confirm' && (
        <div className="max-w-lg mx-auto space-y-6">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="py-8 text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Certificate Signed!</h2>
              <p className="text-gray-400">
                Job #{job.jobNumber} — {job.customer.name}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-6 space-y-4">
              <p className="text-sm text-gray-400 text-center">
                The completion certificate has been saved to the job record.
              </p>

              {(pdfUrl || existingCert?.pdfUrl) && (
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="outline" onClick={handleDownload} className="w-full">
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.open(pdfUrl || existingCert?.pdfUrl, '_blank')}
                    className="w-full"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View PDF
                  </Button>
                </div>
              )}

              <div className="border-t border-gray-800 pt-4 mt-4">
                <Button onClick={() => onComplete?.()} className="w-full">
                  Done
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
