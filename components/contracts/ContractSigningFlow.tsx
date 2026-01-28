'use client';

import { useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { Job } from '@/types/job';
import { ContractFormData, ContractDocumentType, CONTRACT_TYPE_LABELS } from '@/types/contract';
import { ContractPDFDocument } from '@/components/pdf/ContractPDFDocument';
import { DisclosurePDFDocument } from '@/components/pdf/DisclosurePDFDocument';
import { ContractFormStep } from './ContractFormStep';
import { ContractPreviewStep } from './ContractPreviewStep';
import { ContractSignatureStep, SignatureCollectionData } from './ContractSignatureStep';
import { ContractConfirmationStep } from './ContractConfirmationStep';
import { createContract, saveContractSignatures } from '@/lib/firebase/contracts';
import { Spinner } from '@/components/ui/Spinner';
import { AlertCircle, FileText, Eye, Edit3, CheckCircle } from 'lucide-react';

type Step = 'form' | 'preview' | 'sign' | 'confirm';

interface ContractSigningFlowProps {
  job: Job;
  documentType: ContractDocumentType;
  salesRepId: string;
  salesRepName: string;
  onComplete: () => void;
  onCancel: () => void;
}

export function ContractSigningFlow({
  job,
  documentType,
  salesRepId,
  salesRepName,
  onComplete,
  onCancel,
}: ContractSigningFlowProps) {
  const [step, setStep] = useState<Step>('form');
  const [formData, setFormData] = useState<ContractFormData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [contractId, setContractId] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'form', label: 'Fill Details', icon: <Edit3 className="w-4 h-4" /> },
    { key: 'preview', label: 'Preview', icon: <Eye className="w-4 h-4" /> },
    { key: 'sign', label: 'Sign', icon: <FileText className="w-4 h-4" /> },
    { key: 'confirm', label: 'Complete', icon: <CheckCircle className="w-4 h-4" /> },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === step);

  const handleFormComplete = (data: ContractFormData) => {
    setFormData(data);
    setStep('preview');
  };

  const handlePreviewBack = () => {
    setStep('form');
  };

  const handlePreviewNext = () => {
    setStep('sign');
  };

  const handleSignBack = () => {
    setStep('preview');
  };

  const handleSignComplete = async (signatures: SignatureCollectionData) => {
    if (!formData) return;

    setSaving(true);
    setError(null);

    try {
      // Create contract record
      const newContractId = await createContract(job.id, documentType, formData, salesRepId);
      setContractId(newContractId);
      const contractId = newContractId;

      // Generate PDF with signatures
      const signatureUrls = {
        salesRepUrl: signatures.salesRepSignature,
        salesRepName: signatures.salesRepName,
        buyerUrl: signatures.buyerSignature,
        buyerName: signatures.buyerName,
        buyer2Url: signatures.buyer2Signature,
        buyer2Name: signatures.buyer2Name,
        cancellationUrl: signatures.cancellationSignature,
      };

      // Initials URLs (for remodeling agreement)
      const initialsUrls = {
        leadHazardUrl: signatures.leadHazardInitials,
        termsAcknowledgmentUrl: signatures.termsAcknowledgmentInitials,
      };

      let pdfBlob: Blob;

      if (documentType === 'remodeling_agreement') {
        const doc = (
          <ContractPDFDocument
            formData={formData}
            signatures={signatureUrls}
            initials={initialsUrls}
            salesRepName={salesRepName}
          />
        );
        pdfBlob = await pdf(doc).toBlob();
      } else {
        const doc = (
          <DisclosurePDFDocument
            formData={formData}
            signatures={{
              buyerUrl: signatures.buyerSignature,
              buyerName: signatures.buyerName,
              buyer2Url: signatures.buyer2Signature,
              buyer2Name: signatures.buyer2Name,
            }}
          />
        );
        pdfBlob = await pdf(doc).toBlob();
      }

      // Save signatures and PDF
      const result = await saveContractSignatures(
        job.id,
        contractId,
        signatures,
        pdfBlob,
        documentType
      );

      setPdfUrl(result.pdfUrl);
      setStep('confirm');
    } catch (err) {
      console.error('Failed to save contract:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to save contract. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (saving) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-400">Saving contract...</p>
        <p className="text-sm text-gray-500">Uploading signatures and generating PDF</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h1 className="text-xl font-bold">{CONTRACT_TYPE_LABELS[documentType]}</h1>
        <p className="text-sm text-gray-400 mt-1">
          Job #{job.jobNumber} - {job.customer.name}
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between max-w-2xl mx-auto">
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

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-500 font-medium">Error</p>
            <p className="text-sm text-red-500/80">{error}</p>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="min-h-[400px]">
        {step === 'form' && (
          <ContractFormStep
            job={job}
            initialData={formData || undefined}
            onNext={handleFormComplete}
            onCancel={onCancel}
          />
        )}

        {step === 'preview' && formData && (
          <ContractPreviewStep
            formData={formData}
            documentType={documentType}
            salesRepName={salesRepName}
            onBack={handlePreviewBack}
            onNext={handlePreviewNext}
          />
        )}

        {step === 'sign' && formData && (
          <ContractSignatureStep
            formData={formData}
            documentType={documentType}
            salesRepName={salesRepName}
            onBack={handleSignBack}
            onComplete={handleSignComplete}
          />
        )}

        {step === 'confirm' && formData && (
          <ContractConfirmationStep
            documentType={documentType}
            pdfUrl={pdfUrl}
            contractId={contractId}
            customerEmail={formData.email}
            customerName={formData.buyerName}
            onDone={onComplete}
          />
        )}
      </div>
    </div>
  );
}
