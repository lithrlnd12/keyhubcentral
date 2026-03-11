'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useAuth } from '@/lib/hooks';
import { useCustomerJobs } from '@/lib/hooks/useCustomerPortal';
import { TenantHeader } from '@/components/portal-wl/TenantHeader';
import { CustomerJobView } from '@/types/tenant-portal';
import { Job } from '@/types/job';
import { getCustomerJobsByEmail } from '@/lib/firebase/tenants';
import {
  ArrowLeft,
  Download,
  FileText,
  FolderOpen,
  Image,
  Shield,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';

interface DocumentItem {
  name: string;
  url: string;
  type: 'contract' | 'photo' | 'warranty' | 'completion' | 'payment';
  jobNumber: string;
  jobType: string;
  date?: string;
}

export default function TenantDocuments() {
  const router = useRouter();
  const { tenant } = useTenant();
  const { user, loading: authLoading, signOut } = useAuth();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const primaryColor = tenant.branding.primaryColor;

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/p/${tenant.slug}`);
    }
  }, [user, authLoading, router, tenant.slug]);

  // Fetch raw jobs to get document URLs
  useEffect(() => {
    if (!user?.email) return;

    async function fetchDocuments() {
      try {
        const rawJobs = await getCustomerJobsByEmail(user!.email, tenant.ownerId);
        const docs: DocumentItem[] = [];

        for (const job of rawJobs) {
          const formatTs = (ts: { toDate?: () => Date } | null | undefined) => {
            if (!ts?.toDate) return undefined;
            return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          };

          // Contract documents
          if (job.documents?.contract?.url) {
            docs.push({
              name: job.documents.contract.fileName || 'Contract',
              url: job.documents.contract.url,
              type: 'contract',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.documents.contract.uploadedAt),
            });
          }

          // Signed contracts
          if (job.documents?.signedContracts?.remodelingAgreement) {
            docs.push({
              name: 'Signed Remodeling Agreement',
              url: job.documents.signedContracts.remodelingAgreement.pdfUrl,
              type: 'contract',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.documents.signedContracts.remodelingAgreement.signedAt),
            });
          }
          if (job.documents?.signedContracts?.disclosureStatement) {
            docs.push({
              name: 'Signed Disclosure Statement',
              url: job.documents.signedContracts.disclosureStatement.pdfUrl,
              type: 'contract',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.documents.signedContracts.disclosureStatement.signedAt),
            });
          }

          // Completion certificate
          if (job.documents?.completionCert) {
            docs.push({
              name: 'Completion Certificate',
              url: job.documents.completionCert.customerSignatureUrl,
              type: 'completion',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.documents.completionCert.signedAt),
            });
          }

          // Down payment proof
          if (job.documents?.downPayment?.url) {
            docs.push({
              name: `Down Payment Receipt (${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(job.documents.downPayment.amount)})`,
              url: job.documents.downPayment.url,
              type: 'payment',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.documents.downPayment.uploadedAt),
            });
          }

          // Final payment proof
          if (job.finalPayment?.proofUrl) {
            docs.push({
              name: 'Final Payment Receipt',
              url: job.finalPayment.proofUrl,
              type: 'payment',
              jobNumber: job.jobNumber,
              jobType: job.type,
              date: formatTs(job.finalPayment.receivedAt),
            });
          }

          // Before/after photos
          if (job.photos?.before?.length) {
            job.photos.before.forEach((photo, i) => {
              docs.push({
                name: photo.caption || `Before Photo ${i + 1}`,
                url: photo.url,
                type: 'photo',
                jobNumber: job.jobNumber,
                jobType: job.type,
                date: formatTs(photo.uploadedAt),
              });
            });
          }
          if (job.photos?.after?.length) {
            job.photos.after.forEach((photo, i) => {
              docs.push({
                name: photo.caption || `After Photo ${i + 1}`,
                url: photo.url,
                type: 'photo',
                jobNumber: job.jobNumber,
                jobType: job.type,
                date: formatTs(photo.uploadedAt),
              });
            });
          }
        }

        setDocuments(docs);
      } catch (err) {
        console.error('Error fetching documents:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDocuments();
  }, [user?.email, tenant.ownerId]);

  const handleSignOut = async () => {
    await signOut();
    router.push(`/p/${tenant.slug}`);
  };

  if (authLoading || !user) return null;

  // Group by job
  const jobGroups = documents.reduce<Record<string, DocumentItem[]>>((acc, doc) => {
    const key = `${doc.jobType}-${doc.jobNumber}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(doc);
    return acc;
  }, {});

  const typeIcons = {
    contract: FileText,
    photo: Image,
    warranty: Shield,
    completion: FileText,
    payment: FileText,
  };

  const typeColors: Record<string, string> = {
    contract: '#3B82F6',
    photo: '#8B5CF6',
    warranty: '#F59E0B',
    completion: '#10B981',
    payment: '#10B981',
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: tenant.branding.backgroundColor || '#1A1A1A' }}>
      <TenantHeader tenant={tenant} customerName={user.displayName} onSignOut={handleSignOut} />

      <main className="max-w-5xl mx-auto px-4 py-6">
        <button
          onClick={() => router.push(`/p/${tenant.slug}/dashboard`)}
          className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors mb-6 text-sm"
        >
          <ArrowLeft size={16} />
          Dashboard
        </button>

        <h1 className="text-xl font-bold text-white flex items-center gap-2 mb-6">
          <FolderOpen size={22} style={{ color: primaryColor }} />
          Documents & Photos
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-6 w-6 border-2 border-t-transparent rounded-full mx-auto" style={{ borderColor: primaryColor }} />
          </div>
        ) : Object.keys(jobGroups).length === 0 ? (
          <div className="bg-[#2D2D2D] rounded-xl p-8 text-center">
            <FolderOpen size={40} className="mx-auto mb-3 text-gray-600" />
            <p className="text-gray-400">No documents yet.</p>
            <p className="text-gray-500 text-sm mt-1">
              Contracts, photos, and receipts will appear here as your projects progress.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(jobGroups).map(([key, docs]) => {
              const first = docs[0];
              const isExpanded = expandedJob === key;

              return (
                <div key={key} className="bg-[#2D2D2D] rounded-xl border border-gray-700/50 overflow-hidden">
                  <button
                    onClick={() => setExpandedJob(isExpanded ? null : key)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div>
                      <h3 className="text-white font-semibold capitalize">
                        {first.jobType} Project <span className="text-gray-500 font-normal">#{first.jobNumber}</span>
                      </h3>
                      <p className="text-gray-500 text-sm mt-0.5">
                        {docs.length} document{docs.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-4 space-y-2">
                      {docs.map((doc, i) => {
                        const Icon = typeIcons[doc.type] || FileText;
                        const color = typeColors[doc.type] || '#6B7280';

                        return (
                          <a
                            key={i}
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 p-3 rounded-lg bg-[#1A1A1A] hover:bg-[#252525] transition-colors"
                          >
                            <div
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${color}22` }}
                            >
                              <Icon size={18} style={{ color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white text-sm font-medium truncate">{doc.name}</p>
                              {doc.date && (
                                <p className="text-gray-500 text-xs mt-0.5">{doc.date}</p>
                              )}
                            </div>
                            <ExternalLink size={14} className="text-gray-500 flex-shrink-0" />
                          </a>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
