'use client';

import { ContractDocumentType, CONTRACT_TYPE_LABELS } from '@/types/contract';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, Download, Eye, ArrowRight } from 'lucide-react';

interface ContractConfirmationStepProps {
  documentType: ContractDocumentType;
  pdfUrl: string;
  onDone: () => void;
  onSignAnother?: () => void;
}

export function ContractConfirmationStep({
  documentType,
  pdfUrl,
  onDone,
  onSignAnother,
}: ContractConfirmationStepProps) {
  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentType === 'remodeling_agreement' ? 'Remodeling-Agreement' : 'Disclosure-Statement'}-Signed.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      // Fallback: open in new tab
      window.open(pdfUrl, '_blank');
    }
  };

  const handleView = () => {
    window.open(pdfUrl, '_blank');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Success Card */}
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-8 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Contract Signed Successfully</h2>
          <p className="text-gray-400">{CONTRACT_TYPE_LABELS[documentType]}</p>
        </CardContent>
      </Card>

      {/* Actions Card */}
      <Card>
        <CardContent className="py-6 space-y-4">
          <p className="text-sm text-gray-400 text-center mb-4">
            The signed contract has been saved to the job record. You can download or view the PDF
            below.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={handleDownload} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="outline" onClick={handleView} className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              View PDF
            </Button>
          </div>

          <div className="border-t border-gray-800 pt-4 mt-4">
            {onSignAnother && (
              <Button variant="secondary" onClick={onSignAnother} className="w-full mb-3">
                <ArrowRight className="w-4 h-4 mr-2" />
                Sign Another Document
              </Button>
            )}
            <Button onClick={onDone} className="w-full">
              Done
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info */}
      <div className="text-center text-sm text-gray-500">
        <p>A copy of this signed contract has been stored with the job record.</p>
        <p>The customer will receive a copy via email.</p>
      </div>
    </div>
  );
}
