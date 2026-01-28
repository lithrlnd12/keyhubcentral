'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useJob } from '@/lib/hooks/useJob';
import { useAuth } from '@/lib/hooks/useAuth';
import { ContractSigningFlow } from '@/components/contracts';
import { ContractDocumentType, CONTRACT_TYPE_LABELS } from '@/types/contract';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { ArrowLeft, AlertCircle, FileText, CheckCircle2 } from 'lucide-react';

interface SignContractPageProps {
  params: { id: string };
}

export default function SignContractPage({ params }: SignContractPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { job, loading, error } = useJob(params.id);

  const [selectedType, setSelectedType] = useState<ContractDocumentType | null>(null);

  // Get document type from URL if provided
  useEffect(() => {
    const typeParam = searchParams.get('type');
    if (typeParam === 'remodeling_agreement' || typeParam === 'disclosure_statement') {
      setSelectedType(typeParam);
    }
  }, [searchParams]);

  // Permission check
  const canSign = () => {
    if (!user?.role) return false;
    if (['owner', 'admin'].includes(user.role)) return true;
    if (user.role === 'sales_rep' && job?.salesRepId === user.uid) return true;
    return false;
  };

  const handleBack = () => {
    if (selectedType) {
      setSelectedType(null);
    } else {
      router.push(`/kr/${params.id}`);
    }
  };

  const handleComplete = () => {
    router.push(`/kr/${params.id}?tab=contracts`);
  };

  const handleCancel = () => {
    router.push(`/kr/${params.id}`);
  };

  // Check which contracts are already signed
  const hasRemodelingAgreement = !!job?.documents?.signedContracts?.remodelingAgreement;
  const hasDisclosureStatement = !!job?.documents?.signedContracts?.disclosureStatement;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-500/30">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Job Not Found</h2>
            <p className="text-gray-400 mb-4">{error || 'The requested job could not be found.'}</p>
            <Button onClick={() => router.push('/kr')}>Return to Jobs</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canSign()) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <Card className="border-red-500/30">
          <CardContent className="py-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-gray-400 mb-4">
              You don&apos;t have permission to sign contracts for this job.
            </p>
            <Button onClick={() => router.push(`/kr/${params.id}`)}>Return to Job</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If no document type selected, show selection
  if (!selectedType) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => router.push(`/kr/${params.id}`)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Job
          </Button>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold mb-2">Sign Contract</h1>
          <p className="text-gray-400">
            Job #{job.jobNumber} - {job.customer.name}
          </p>
        </div>

        {/* Document Selection */}
        <div className="grid gap-4">
          {/* Remodeling Agreement */}
          <div
            className={`cursor-pointer transition-all ${!hasRemodelingAgreement ? 'hover:opacity-80' : ''}`}
            onClick={() => !hasRemodelingAgreement && setSelectedType('remodeling_agreement')}
          >
            <Card
              className={`${
                hasRemodelingAgreement
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'hover:border-blue-500/50'
              }`}
            >
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      hasRemodelingAgreement ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}
                  >
                    {hasRemodelingAgreement ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {CONTRACT_TYPE_LABELS.remodeling_agreement}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Main contract with customer information, pricing, payment terms, and signatures.
                      Includes Notice of Cancellation.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">5 pages</p>
                    {hasRemodelingAgreement && (
                      <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Already signed
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Disclosure Statement */}
          <div
            className={`cursor-pointer transition-all ${!hasDisclosureStatement ? 'hover:opacity-80' : ''}`}
            onClick={() => !hasDisclosureStatement && setSelectedType('disclosure_statement')}
          >
            <Card
              className={`${
                hasDisclosureStatement
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'hover:border-blue-500/50'
              }`}
            >
              <CardContent className="py-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      hasDisclosureStatement ? 'bg-green-500/20' : 'bg-blue-500/20'
                    }`}
                  >
                    {hasDisclosureStatement ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <FileText className="w-6 h-6 text-blue-500" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">
                      {CONTRACT_TYPE_LABELS.disclosure_statement}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Texas legal disclosure required by property code. Includes consumer protection
                      information and acknowledgment signatures.
                    </p>
                    <p className="text-xs text-gray-500 mt-2">4 pages</p>
                    {hasDisclosureStatement && (
                      <p className="text-sm text-green-500 mt-2 flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4" />
                        Already signed
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Status Summary */}
        {(hasRemodelingAgreement || hasDisclosureStatement) && (
          <div className="bg-gray-800 rounded-xl p-4 text-center">
            <p className="text-sm text-gray-400">
              {hasRemodelingAgreement && hasDisclosureStatement ? (
                <span className="text-green-500">All contracts have been signed.</span>
              ) : (
                <span>
                  {hasRemodelingAgreement ? 'Remodeling Agreement' : 'Disclosure Statement'} signed.
                  Click the other document to sign it.
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Show signing flow for selected document type
  return (
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
      </div>

      <ContractSigningFlow
        job={job}
        documentType={selectedType}
        salesRepId={user?.uid || ''}
        salesRepName={user?.displayName || 'Sales Rep'}
        onComplete={handleComplete}
        onCancel={handleCancel}
      />
    </div>
  );
}
