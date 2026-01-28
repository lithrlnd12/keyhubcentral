'use client';

import { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { ContractDocumentType, CONTRACT_TYPE_LABELS } from '@/types/contract';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { CheckCircle2, Download, Eye, ArrowRight, Mail, Send, AlertCircle } from 'lucide-react';

interface ContractConfirmationStepProps {
  documentType: ContractDocumentType;
  pdfUrl: string;
  contractId: string;
  customerEmail: string;
  customerName: string;
  onDone: () => void;
  onSignAnother?: () => void;
}

export function ContractConfirmationStep({
  documentType,
  pdfUrl,
  contractId,
  customerEmail,
  customerName,
  onDone,
  onSignAnother,
}: ContractConfirmationStepProps) {
  const [sendEmail, setSendEmail] = useState(true); // Default to sending email
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleSendEmail = async () => {
    if (!customerEmail) {
      setEmailError('No customer email address available');
      setEmailStatus('error');
      return;
    }

    setEmailStatus('sending');
    setEmailError(null);

    try {
      const functions = getFunctions();
      const sendContractEmail = httpsCallable(functions, 'sendContractEmail');
      await sendContractEmail({
        contractId,
        recipientEmail: customerEmail,
      });
      setEmailStatus('sent');
    } catch (error) {
      console.error('Failed to send email:', error);
      setEmailError(error instanceof Error ? error.message : 'Failed to send email');
      setEmailStatus('error');
    }
  };

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

          {/* Email Section */}
          <div className="border-t border-gray-800 pt-4 mt-4">
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <span className="font-medium">Send to Customer</span>
                </div>
                {emailStatus === 'sent' && (
                  <span className="flex items-center gap-1 text-green-500 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    Sent
                  </span>
                )}
              </div>

              {customerEmail ? (
                <>
                  <p className="text-sm text-gray-400 mb-3">
                    Send a copy of the signed contract to <strong>{customerName}</strong> at{' '}
                    <span className="text-blue-400">{customerEmail}</span>
                  </p>

                  {emailStatus === 'idle' && (
                    <Button
                      onClick={handleSendEmail}
                      className="w-full"
                      variant="secondary"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Send Contract to Customer
                    </Button>
                  )}

                  {emailStatus === 'sending' && (
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Spinner size="sm" />
                      <span className="text-sm text-gray-400">Sending email...</span>
                    </div>
                  )}

                  {emailStatus === 'sent' && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
                      <p className="text-sm text-green-500">
                        Contract sent successfully to {customerEmail}
                      </p>
                    </div>
                  )}

                  {emailStatus === 'error' && (
                    <div className="space-y-2">
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-500">{emailError}</p>
                      </div>
                      <Button
                        onClick={handleSendEmail}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        Try Again
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-yellow-500">
                  No email address available for this customer. You can share the PDF manually.
                </p>
              )}
            </div>
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
      </div>
    </div>
  );
}
