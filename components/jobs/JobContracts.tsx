'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Job } from '@/types/job';
import { SignedContract, CONTRACT_TYPE_LABELS, CONTRACT_STATUS_LABELS, ContractDocumentType, ContractAddendum, ADDENDUM_TYPE_LABELS } from '@/types/contract';
import { getJobContracts } from '@/lib/firebase/contracts';
import { getAddendums } from '@/lib/firebase/addendums';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { ContractUploadModal } from '@/components/contracts/ContractUploadModal';
import { AddendumForm } from '@/components/contracts/AddendumForm';
import {
  FileText,
  Download,
  Eye,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Upload,
  FilePlus2,
} from 'lucide-react';

interface JobContractsProps {
  job: Job;
  userId: string;
  userRole?: string;
}

export function JobContracts({ job, userId, userRole }: JobContractsProps) {
  const [contracts, setContracts] = useState<SignedContract[]>([]);
  const [addendums, setAddendums] = useState<ContractAddendum[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAddendumForm, setShowAddendumForm] = useState(false);

  const loadContracts = useCallback(async () => {
    try {
      setLoading(true);
      const [jobContracts, jobAddendums] = await Promise.all([
        getJobContracts(job.id),
        getAddendums(job.id),
      ]);
      setContracts(jobContracts);
      setAddendums(jobAddendums);
    } catch (err) {
      console.error('Failed to load contracts:', err);
      setError('Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [job.id]);

  useEffect(() => {
    loadContracts();
  }, [loadContracts]);

  const canSignContracts = () => {
    if (!userRole) return false;
    if (['owner', 'admin'].includes(userRole)) return true;
    if (userRole === 'sales_rep' && job.salesRepId === userId) return true;
    return false;
  };

  const handleDownload = async (contract: SignedContract) => {
    try {
      const response = await fetch(contract.pdfUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${CONTRACT_TYPE_LABELS[contract.documentType].replace(/\s+/g, '-')}-${job.jobNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
      window.open(contract.pdfUrl, '_blank');
    }
  };

  const handleView = (contract: SignedContract) => {
    window.open(contract.pdfUrl, '_blank');
  };

  const getStatusBadge = (status: SignedContract['status']) => {
    switch (status) {
      case 'signed':
        return <Badge variant="success">{CONTRACT_STATUS_LABELS[status]}</Badge>;
      case 'draft':
        return <Badge variant="warning">{CONTRACT_STATUS_LABELS[status]}</Badge>;
      case 'voided':
        return <Badge variant="error">{CONTRACT_STATUS_LABELS[status]}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (timestamp: { toDate: () => Date }) => {
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check which contracts exist
  const signedContracts = contracts.filter((c) => c.status === 'signed');
  const hasRemodelingAgreement = signedContracts.some(
    (c) => c.documentType === 'remodeling_agreement'
  );
  const hasDisclosureStatement = signedContracts.some(
    (c) => c.documentType === 'disclosure_statement'
  );
  const allContractsSigned = hasRemodelingAgreement && hasDisclosureStatement;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="py-6 text-center">
          <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
          <Button variant="outline" size="sm" onClick={loadContracts} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Contract Status
            </span>
            {canSignContracts() && !allContractsSigned && (
              <div className="flex gap-2">
                <Link href={`/kr/${job.id}/sign`}>
                  <Button size="sm">
                    <PenTool className="w-4 h-4 mr-2" />
                    Sign Digitally
                  </Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Remodeling Agreement Status */}
            <div
              className={`p-4 rounded-lg border ${
                hasRemodelingAgreement
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {hasRemodelingAgreement ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-500" />
                )}
                <div>
                  <p className="font-medium">Remodeling Agreement</p>
                  <p className="text-sm text-gray-400">
                    {hasRemodelingAgreement ? 'Signed' : 'Not signed'}
                  </p>
                </div>
              </div>
            </div>

            {/* Disclosure Statement Status */}
            <div
              className={`p-4 rounded-lg border ${
                hasDisclosureStatement
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-gray-700 bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-3">
                {hasDisclosureStatement ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Clock className="w-6 h-6 text-gray-500" />
                )}
                <div>
                  <p className="font-medium">Disclosure Statement</p>
                  <p className="text-sm text-gray-400">
                    {hasDisclosureStatement ? 'Signed' : 'Not signed'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {allContractsSigned && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-green-500 text-sm">All required contracts have been signed.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contracts List */}
      {signedContracts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Signed Contracts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {signedContracts.map((contract) => (
                <div
                  key={contract.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{CONTRACT_TYPE_LABELS[contract.documentType]}</p>
                        {contract.source === 'uploaded' && (
                          <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded text-gray-400">
                            Uploaded
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {contract.source === 'uploaded' ? 'Uploaded' : 'Signed'} {formatDate(contract.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Buyer: {contract.signatures.buyer?.name}
                        {contract.signatures.buyer2 && `, ${contract.signatures.buyer2.name}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(contract.status)}
                    <Button variant="ghost" size="sm" onClick={() => handleView(contract)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(contract)}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {contracts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Contracts Yet</h3>
            <p className="text-gray-400 mb-6">
              Contracts haven&apos;t been signed for this job yet.
            </p>
            {canSignContracts() && (
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={`/kr/${job.id}/sign`}>
                  <Button>
                    <PenTool className="w-4 h-4 mr-2" />
                    Sign Digitally
                  </Button>
                </Link>
                <Button variant="outline" onClick={() => setShowUploadModal(true)}>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Signed Contract
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      {canSignContracts() && !allContractsSigned && contracts.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={`/kr/${job.id}/sign`}>
            <Button variant="outline">
              <PenTool className="w-4 h-4 mr-2" />
              {hasRemodelingAgreement ? 'Sign Disclosure Statement' : 'Sign Remaining Contract'}
            </Button>
          </Link>
          <Button variant="ghost" onClick={() => setShowUploadModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Instead
          </Button>
        </div>
      )}

      {/* Addendums Section */}
      {(addendums.length > 0 || ['started', 'complete', 'paid_in_full'].includes(job.status)) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <FilePlus2 className="w-5 h-5" />
                Addendums
                {addendums.length > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-gray-700 rounded-full text-gray-300">
                    {addendums.length}
                  </span>
                )}
              </span>
              {['started', 'complete', 'paid_in_full'].includes(job.status) && (
                <Button size="sm" variant="outline" onClick={() => setShowAddendumForm(true)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Addendum
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {addendums.length > 0 ? (
              <div className="space-y-3">
                {addendums.map((addendum) => (
                  <div
                    key={addendum.id}
                    className={`p-4 rounded-lg border ${
                      addendum.status === 'voided'
                        ? 'border-red-500/30 bg-red-500/5 opacity-60'
                        : 'border-gray-700 bg-gray-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-white">
                            Addendum #{addendum.addendumNumber}
                          </p>
                          <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                            {ADDENDUM_TYPE_LABELS[addendum.type]}
                          </span>
                          {addendum.status === 'voided' && (
                            <Badge variant="error">Voided</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2">{addendum.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>
                            {addendum.signedAt?.toDate
                              ? addendum.signedAt.toDate().toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })
                              : '-'}
                          </span>
                          {addendum.costImpact !== 0 && (
                            <span className={addendum.costImpact > 0 ? 'text-red-400' : 'text-green-400'}>
                              {addendum.costImpact > 0 ? '+' : ''}
                              ${Math.abs(addendum.costImpact).toFixed(2)}
                            </span>
                          )}
                          {addendum.photoUrls.length > 0 && (
                            <span>{addendum.photoUrls.length} photo{addendum.photoUrls.length !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {addendum.pdfUrl && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => window.open(addendum.pdfUrl!, '_blank')}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const response = await fetch(addendum.pdfUrl!);
                                  const blob = await response.blob();
                                  const url = URL.createObjectURL(blob);
                                  const link = document.createElement('a');
                                  link.href = url;
                                  link.download = `Addendum-${addendum.addendumNumber}-${job.jobNumber}.pdf`;
                                  document.body.appendChild(link);
                                  link.click();
                                  document.body.removeChild(link);
                                  URL.revokeObjectURL(url);
                                } catch {
                                  window.open(addendum.pdfUrl!, '_blank');
                                }
                              }}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No addendums yet. Use &quot;Add Addendum&quot; to document changes in the field.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Addendum Form Modal */}
      {showAddendumForm && (
        <AddendumForm
          job={job}
          onClose={() => setShowAddendumForm(false)}
          onSaved={() => {
            setShowAddendumForm(false);
            loadContracts();
          }}
        />
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <ContractUploadModal
          jobId={job.id}
          userId={userId}
          buyerName={job.customer.name}
          existingTypes={signedContracts.map((c) => c.documentType)}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadContracts();
          }}
        />
      )}
    </div>
  );
}
