'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Briefcase, Loader2, Clock, CheckCircle, User, MessageSquare } from 'lucide-react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks';
import { Lead } from '@/types/lead';

function getStatusDisplay(status: string) {
  switch (status) {
    case 'new':
      return { label: 'Searching for a pro...', variant: 'warning' as const, icon: Clock };
    case 'assigned':
      return { label: 'Pro matched!', variant: 'success' as const, icon: CheckCircle };
    case 'contacted':
      return { label: 'In progress', variant: 'info' as const, icon: MessageSquare };
    case 'qualified':
      return { label: 'Quote pending', variant: 'info' as const, icon: Clock };
    case 'converted':
      return { label: 'Project started', variant: 'success' as const, icon: CheckCircle };
    case 'lost':
    case 'returned':
      return { label: 'Closed', variant: 'default' as const, icon: Briefcase };
    default:
      return { label: status, variant: 'default' as const, icon: Clock };
  }
}

export default function CustomerProjectsPage() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<(Lead & { contractorName?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeads() {
      if (!user?.uid) return;
      try {
        const q = query(
          collection(db, 'leads'),
          where('customerId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const leadsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Lead));

        // Load contractor names for assigned leads
        const enriched = await Promise.all(
          leadsData.map(async (lead) => {
            if (lead.assignedTo && ['assigned', 'contacted', 'qualified'].includes(lead.status)) {
              try {
                const contractorQuery = query(
                  collection(db, 'contractors'),
                  where('userId', '==', lead.assignedTo)
                );
                const contractorSnap = await getDocs(contractorQuery);
                const contractorName = contractorSnap.docs[0]?.data()?.businessName;
                return { ...lead, contractorName };
              } catch {
                return lead;
              }
            }
            return lead;
          })
        );

        setLeads(enriched);
      } catch (err) {
        console.error('Error loading customer leads:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeads();
  }, [user?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <Link href="/customer/book">
          <Button size="sm">Book a Pro</Button>
        </Link>
      </div>

      {leads.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-brand-gold/10 flex items-center justify-center mb-4">
            <Briefcase className="h-8 w-8 text-brand-gold" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">No projects yet</h3>
          <p className="text-gray-400 text-sm mb-4 max-w-sm mx-auto">
            Once you book a service, your projects will appear here with real-time status updates.
          </p>
          <Link href="/customer/book">
            <Button>Book a Pro</Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => {
            const status = getStatusDisplay(lead.status);
            const StatusIcon = status.icon;
            const createdAt = lead.createdAt?.toDate?.();

            return (
              <Card key={lead.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* Specialties */}
                    {lead.specialties && lead.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {lead.specialties.map((s) => (
                          <Badge key={s} variant="info">{s}</Badge>
                        ))}
                      </div>
                    )}

                    {/* Description */}
                    {lead.customer?.notes && (
                      <p className="text-white text-sm mb-2 line-clamp-2">
                        {lead.customer.notes}
                      </p>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className={`w-4 h-4 ${
                        status.variant === 'success' ? 'text-green-400' :
                        status.variant === 'warning' ? 'text-yellow-400' :
                        status.variant === 'info' ? 'text-blue-400' :
                        'text-gray-400'
                      }`} />
                      <span className={`text-sm font-medium ${
                        status.variant === 'success' ? 'text-green-400' :
                        status.variant === 'warning' ? 'text-yellow-400' :
                        status.variant === 'info' ? 'text-blue-400' :
                        'text-gray-400'
                      }`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Contractor Name */}
                    {lead.contractorName && (
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <User className="w-3.5 h-3.5" />
                        <span>{lead.contractorName}</span>
                      </div>
                    )}

                    {/* Date */}
                    {createdAt && (
                      <p className="text-xs text-gray-600 mt-2">
                        Submitted {createdAt.toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
