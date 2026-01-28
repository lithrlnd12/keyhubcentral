'use client';

import { useState, useEffect } from 'react';
import { PDFViewer } from '@react-pdf/renderer';
import { ContractFormData, ContractDocumentType } from '@/types/contract';
import { ContractPDFDocument } from '@/components/pdf/ContractPDFDocument';
import { DisclosurePDFDocument } from '@/components/pdf/DisclosurePDFDocument';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ArrowLeft, ArrowRight, FileText, AlertCircle } from 'lucide-react';

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
  const [isClient, setIsClient] = useState(false);
  const [showMobileWarning, setShowMobileWarning] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Check if mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    setShowMobileWarning(isMobile);
  }, []);

  const renderDocument = () => {
    if (documentType === 'remodeling_agreement') {
      return (
        <ContractPDFDocument
          formData={formData}
          signatures={{}}
          salesRepName={salesRepName}
        />
      );
    }
    return (
      <DisclosurePDFDocument
        formData={formData}
        signatures={{}}
      />
    );
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-500" />
              <div>
                <h2 className="text-lg font-semibold">Preview Contract</h2>
                <p className="text-sm text-gray-400">
                  Review the document before proceeding to signatures
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Warning */}
      {showMobileWarning && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-500 font-medium">Mobile Device Detected</p>
            <p className="text-sm text-yellow-500/80 mt-1">
              PDF preview may not display properly on mobile devices. You can proceed to sign the
              contract, and a full PDF will be generated after signing.
            </p>
          </div>
        </div>
      )}

      {/* PDF Preview */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {!showMobileWarning ? (
          <div className="h-[600px]">
            <PDFViewer width="100%" height="100%" showToolbar={true}>
              {renderDocument()}
            </PDFViewer>
          </div>
        ) : (
          <div className="p-8 text-center">
            <FileText className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Document Preview</h3>
            <p className="text-gray-400 text-sm mb-4">
              {documentType === 'remodeling_agreement'
                ? 'Custom Remodeling Agreement (5 pages)'
                : 'Disclosure Statement (4 pages)'}
            </p>
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
                <li>
                  <span className="text-gray-500">Contract Date:</span>{' '}
                  <span className="text-white">
                    {formData.contractDate
                      ? new Date(formData.contractDate).toLocaleDateString()
                      : 'Not set'}
                  </span>
                </li>
                {documentType === 'remodeling_agreement' && (
                  <>
                    <li>
                      <span className="text-gray-500">Purchase Price:</span>{' '}
                      <span className="text-white">
                        ${formData.purchasePrice.toLocaleString()}
                      </span>
                    </li>
                    <li>
                      <span className="text-gray-500">Down Payment:</span>{' '}
                      <span className="text-white">
                        ${formData.downPayment.toLocaleString()}
                      </span>
                    </li>
                    <li>
                      <span className="text-gray-500">Balance Due:</span>{' '}
                      <span className="text-white">${formData.balanceDue.toLocaleString()}</span>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>

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
