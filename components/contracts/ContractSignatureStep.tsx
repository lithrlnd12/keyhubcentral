'use client';

import { useState, useEffect } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ContractFormData, ContractDocumentType } from '@/types/contract';
import { ContractPDFDocument } from '@/components/pdf/ContractPDFDocument';
import { DisclosurePDFDocument } from '@/components/pdf/DisclosurePDFDocument';
import { SignaturePad } from '@/components/jobs/SignaturePad';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import {
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

export interface SignatureCollectionData {
  salesRepSignature: string;
  salesRepName: string;
  buyerSignature: string;
  buyerName: string;
  buyer2Signature?: string;
  buyer2Name?: string;
  cancellationSignature?: string;
}

interface ContractSignatureStepProps {
  formData: ContractFormData;
  documentType: ContractDocumentType;
  salesRepName: string;
  onBack: () => void;
  onComplete: (signatures: SignatureCollectionData) => void;
}

export function ContractSignatureStep({
  formData,
  documentType,
  salesRepName,
  onBack,
  onComplete,
}: ContractSignatureStepProps) {
  const [signatures, setSignatures] = useState<{
    salesRep: string | null;
    buyer: string | null;
    buyer2: string | null;
    cancellation: string | null;
  }>({
    salesRep: null,
    buyer: null,
    buyer2: null,
    cancellation: null,
  });

  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [showDocument, setShowDocument] = useState(false);

  const hasBuyer2 = !!formData.buyerName2;
  const needsCancellation = documentType === 'remodeling_agreement';

  // Generate PDF for viewing
  useEffect(() => {
    const generatePdf = async () => {
      setPdfLoading(true);
      try {
        let doc;
        if (documentType === 'remodeling_agreement') {
          doc = (
            <ContractPDFDocument
              formData={formData}
              signatures={{}}
              salesRepName={salesRepName}
            />
          );
        } else {
          doc = (
            <DisclosurePDFDocument
              formData={formData}
              signatures={{}}
            />
          );
        }

        const blob = await pdf(doc).toBlob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err) {
        console.error('Failed to generate PDF:', err);
      } finally {
        setPdfLoading(false);
      }
    };

    generatePdf();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, []);

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleSignatureSave = (key: keyof typeof signatures, dataUrl: string) => {
    setSignatures((prev) => ({
      ...prev,
      [key]: dataUrl,
    }));
  };

  const handleSignatureClear = (key: keyof typeof signatures) => {
    setSignatures((prev) => ({
      ...prev,
      [key]: null,
    }));
  };

  const isComplete = (): boolean => {
    if (!signatures.salesRep || !signatures.buyer) return false;
    if (hasBuyer2 && !signatures.buyer2) return false;
    if (needsCancellation && !signatures.cancellation) return false;
    return true;
  };

  const getCompletionStatus = () => {
    const required = ['salesRep', 'buyer'];
    if (hasBuyer2) required.push('buyer2');
    if (needsCancellation) required.push('cancellation');

    const completed = required.filter(
      (key) => signatures[key as keyof typeof signatures] !== null
    );
    return { completed: completed.length, total: required.length };
  };

  const handleSubmit = () => {
    if (!isComplete()) return;

    const signatureData: SignatureCollectionData = {
      salesRepSignature: signatures.salesRep!,
      salesRepName,
      buyerSignature: signatures.buyer!,
      buyerName: formData.buyerName,
    };

    if (hasBuyer2 && signatures.buyer2) {
      signatureData.buyer2Signature = signatures.buyer2;
      signatureData.buyer2Name = formData.buyerName2;
    }

    if (needsCancellation && signatures.cancellation) {
      signatureData.cancellationSignature = signatures.cancellation;
    }

    onComplete(signatureData);
  };

  const status = getCompletionStatus();

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-semibold">Collect Signatures</h2>
              <p className="text-sm text-gray-400">
                {status.completed} of {status.total} signatures collected
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isComplete() ? (
                <span className="flex items-center gap-1 text-green-500 text-sm">
                  <CheckCircle2 className="w-4 h-4" />
                  All signatures collected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-500 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  Signatures pending
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Viewer - Collapsible */}
      <Card>
        <div
          className="cursor-pointer"
          onClick={() => setShowDocument(!showDocument)}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                View Document Before Signing
              </span>
              <div className="flex items-center gap-2">
                {pdfUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenInNewTab();
                    }}
                  >
                    <ExternalLink className="w-4 h-4 mr-1" />
                    <span className="hidden sm:inline">Open in New Tab</span>
                  </Button>
                )}
                {showDocument ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </CardTitle>
          </CardHeader>
        </div>
        {showDocument && (
          <CardContent>
            {pdfLoading ? (
              <div className="flex flex-col items-center justify-center py-8">
                <Spinner size="md" />
                <p className="mt-2 text-sm text-gray-400">Loading document...</p>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[400px] sm:h-[500px] md:h-[600px] border border-gray-700 rounded-lg"
                title="Contract Document"
              />
            ) : (
              <p className="text-gray-400 text-center py-8">
                Unable to load document preview. Use the button above to open in a new tab.
              </p>
            )}
          </CardContent>
        )}
        {!showDocument && (
          <CardContent className="pt-0">
            <p className="text-sm text-gray-500">
              Tap to expand and review the full{' '}
              {documentType === 'remodeling_agreement'
                ? 'Remodeling Agreement (5 pages)'
                : 'Disclosure Statement (4 pages)'}{' '}
              before signing.
            </p>
          </CardContent>
        )}
      </Card>

      {/* Sales Rep Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Sales Representative Signature
            {signatures.salesRep && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            {salesRepName} - Please sign to acknowledge the contract terms.
          </p>
          <SignaturePad
            label="Sales Rep Signature"
            onSave={(dataUrl) => handleSignatureSave('salesRep', dataUrl)}
            onClear={() => handleSignatureClear('salesRep')}
            initialSignature={signatures.salesRep || undefined}
          />
        </CardContent>
      </Card>

      {/* Buyer Signature */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Customer Signature
            {signatures.buyer && <CheckCircle2 className="w-5 h-5 text-green-500" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400 mb-4">
            {formData.buyerName} - Please sign to agree to the contract terms.
          </p>
          <SignaturePad
            label="Customer Signature"
            onSave={(dataUrl) => handleSignatureSave('buyer', dataUrl)}
            onClear={() => handleSignatureClear('buyer')}
            initialSignature={signatures.buyer || undefined}
          />
        </CardContent>
      </Card>

      {/* Buyer 2 Signature (if applicable) */}
      {hasBuyer2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Customer 2 Signature
              {signatures.buyer2 && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400 mb-4">
              {formData.buyerName2} - Please sign to agree to the contract terms.
            </p>
            <SignaturePad
              label="Customer 2 Signature"
              onSave={(dataUrl) => handleSignatureSave('buyer2', dataUrl)}
              onClear={() => handleSignatureClear('buyer2')}
              initialSignature={signatures.buyer2 || undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Cancellation Notice Signature (for Remodeling Agreement) */}
      {needsCancellation && (
        <Card className="border-yellow-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-500">
              Notice of Cancellation Acknowledgment
              {signatures.cancellation && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-yellow-500/10 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-500/90">
                <strong>Important:</strong> By signing below, the customer acknowledges receipt of
                the Notice of Cancellation form. This signature does NOT cancel the contract - it
                confirms the customer has received information about their cancellation rights.
              </p>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              {formData.buyerName} - Sign to acknowledge receipt of Notice of Cancellation.
            </p>
            <SignaturePad
              label="Cancellation Notice Acknowledgment"
              onSave={(dataUrl) => handleSignatureSave('cancellation', dataUrl)}
              onClear={() => handleSignatureClear('cancellation')}
              initialSignature={signatures.cancellation || undefined}
            />
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Preview
        </Button>
        <Button onClick={handleSubmit} disabled={!isComplete()}>
          <CheckCircle2 className="w-4 h-4 mr-2" />
          Complete Signing
        </Button>
      </div>
    </div>
  );
}
