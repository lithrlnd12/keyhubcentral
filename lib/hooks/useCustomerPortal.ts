'use client';

import { useState, useEffect } from 'react';
import { Job } from '@/types/job';
import { Lead } from '@/types/lead';
import { CustomerJobView, CUSTOMER_STATUS_MAP, CUSTOMER_STATUS_STEPS } from '@/types/tenant-portal';
import { getCustomerJobsByEmail, getCustomerLeadsByEmail } from '@/lib/firebase/tenants';

function formatDate(timestamp: { toDate?: () => Date } | null | undefined): string | null {
  if (!timestamp || !timestamp.toDate) return null;
  return timestamp.toDate().toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}

function jobToCustomerView(job: Job): CustomerJobView {
  const statusInfo = CUSTOMER_STATUS_MAP[job.status] || {
    label: job.status,
    step: 0,
    description: '',
  };

  const addressParts = [
    job.customer?.address?.street,
    job.customer?.address?.city,
    job.customer?.address?.state,
    job.customer?.address?.zip,
  ].filter(Boolean);

  return {
    id: job.id,
    jobNumber: job.jobNumber,
    type: job.type,
    status: job.status,
    statusLabel: statusInfo.label,
    statusStep: statusInfo.step,
    totalSteps: CUSTOMER_STATUS_STEPS.length,
    address: addressParts.join(', ') || 'Address on file',
    scheduledStart: formatDate(job.dates?.scheduledStart),
    targetCompletion: formatDate(job.dates?.targetCompletion),
    photosBefore: job.photos?.before?.map((p) => ({ url: p.url, caption: p.caption })) || [],
    photosAfter: job.photos?.after?.map((p) => ({ url: p.url, caption: p.caption })) || [],
    warranty: job.warranty
      ? {
          status: job.warranty.status,
          endDate: formatDate(job.warranty.endDate),
        }
      : undefined,
    updatedAt: formatDate(job.updatedAt) || '',
  };
}

export function useCustomerJobs(email: string | null, tenantOwnerId?: string) {
  const [jobs, setJobs] = useState<CustomerJobView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setJobs([]);
      setLoading(false);
      return;
    }

    async function fetchJobs() {
      try {
        setLoading(true);
        const rawJobs = await getCustomerJobsByEmail(email!, tenantOwnerId);
        const views = rawJobs.map(jobToCustomerView);
        // Sort by most recent first
        views.sort((a, b) => (a.statusStep > b.statusStep ? -1 : 1));
        setJobs(views);
      } catch (err) {
        console.error('Error fetching customer jobs:', err);
        setError('Failed to load your projects');
      } finally {
        setLoading(false);
      }
    }

    fetchJobs();
  }, [email, tenantOwnerId]);

  return { jobs, loading, error };
}

export function useCustomerLeads(email: string | null) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setLeads([]);
      setLoading(false);
      return;
    }

    async function fetchLeads() {
      try {
        setLoading(true);
        const results = await getCustomerLeadsByEmail(email!);
        setLeads(results);
      } catch (err) {
        console.error('Error fetching customer leads:', err);
        setError('Failed to load your requests');
      } finally {
        setLoading(false);
      }
    }

    fetchLeads();
  }, [email]);

  return { leads, loading, error };
}
