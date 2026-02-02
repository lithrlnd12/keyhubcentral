'use client';

import { useState, useEffect, useCallback } from 'react';
import { pdf } from '@react-pdf/renderer';
import { ContractFormData, ContractDocumentType } from '@/types/contract';
import { ContractPDFDocument } from '@/components/pdf/ContractPDFDocument';
import { DisclosurePDFDocument } from '@/components/pdf/DisclosurePDFDocument';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, ArrowRight, FileText, ExternalLink, RefreshCw } from 'lucide-react';

interface ContractPreviewStepProps {
  formData: ContractFormData;
  documentType: ContractDocumentType;
  salesRepName: string;
  onBack: () => void;
  onNext: () => void;
}

export function ContractPreviewStep({
  formData,
  documentType,
  salesRepName,
  onBack,
  onNext,
}: ContractPreviewStepProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generatePdf = useCallback(async () => {
    setLoading(true);
    setError(null);

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

      setPdfUrl((prevUrl) => {
        // Clean up previous URL if exists
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return url;
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      setError('Failed to generate PDF preview. You can still proceed to sign.');
    } finally {
      setLoading(false);
    }
  }, [documentType, formData, salesRepName]);

  useEffect(() => {
    generatePdf();
  }, [generatePdf]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      setPdfUrl((prevUrl) => {
        if (prevUrl) {
          URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, []);

  const handleOpenInNewTab = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold">Preview Contract</h2>
                <p className="text-sm text-gray-400">
                  Review the document before proceeding to signatures
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {pdfUrl && (
                <Button variant="outline" size="sm" onClick={handleOpenInNewTab}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              )}
              {error && (
                <Button variant="outline" size="sm" onClick={generatePdf}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PDF Preview */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-400">Generating preview...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Preview Unavailable</h3>
            <p className="text-gray-400 text-sm mb-4">{error}</p>
            <div className="text-left bg-gray-900 rounded-lg p-4 max-w-md mx-auto">
              <p className="text-sm text-gray-400 mb-2">Contract Summary:</p>
              <ul className="text-sm space-y-1">
                <li>
                  <span className="text-gray-500">Buyer:</span>{' '}
                  <span className="text-white">{formData.buyerName}</span>
                </li>
                {formData.buyerName2 && (
                  <li>
                    <span className="text-gray-500">Buyer 2:</span>{' '}
                    <span className="text-white">{formData.buyerName2}</span>
                  </li>
                )}
                <li>
                  <span className="text-gray-500">Address:</span>{' '}
                  <span className="text-white">
                    {formData.address.street}, {formData.address.city}
                  </span>
                </li>
                {documentType === 'remodeling_agreement' && (
                  <li>
                    <span className="text-gray-500">Purchase Price:</span>{' '}
                    <span className="text-white">
                      ${formData.purchasePrice.toLocaleString()}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        ) : pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-[500px] sm:h-[600px] md:h-[700px] border-0"
            title="Contract Preview"
          />
        ) : null}
      </div>

      {/* Mobile tip */}
      <p className="text-xs text-gray-500 text-center">
        Tip: If the preview doesn&apos;t load properly, tap &quot;Open in New Tab&quot; to view the full PDF.
      </p>

      {/* Actions */}
      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Edit
        </Button>
        <Button onClick={onNext}>
          Proceed to Sign
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
