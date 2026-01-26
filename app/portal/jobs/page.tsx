'use client';

import { useState } from 'react';
import { ArrowLeft, Search, Briefcase, MapPin, Calendar, Navigation } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth, useContractorJobs } from '@/lib/hooks';
import { formatCurrency } from '@/lib/utils/formatters';
import { Job, JobStatus } from '@/types/job';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'started', label: 'In Progress' },
  { value: 'complete', label: 'Completed' },
  { value: 'paid_in_full', label: 'Paid in Full' },
];

function getStatusBadge(status: JobStatus) {
  switch (status) {
    case 'lead':
    case 'sold':
    case 'front_end_hold':
    case 'production':
      return <Badge variant="default">{status.replace(/_/g, ' ')}</Badge>;
    case 'scheduled':
      return <Badge variant="info">Scheduled</Badge>;
    case 'started':
      return <Badge variant="warning">In Progress</Badge>;
    case 'complete':
      return <Badge variant="success">Completed</Badge>;
    case 'paid_in_full':
      return <Badge variant="success">Paid in Full</Badge>;
    default:
      return <Badge variant="default">{status}</Badge>;
  }
}

function formatDate(timestamp: any) {
  if (!timestamp) return 'TBD';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MyJobsPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { jobs, loading, error, activeJobs, completedJobs, totalJobValue } = useContractorJobs({
    contractorId: user?.uid || '',
    realtime: true,
  });

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !search ||
      job.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      job.customer?.address?.city?.toLowerCase().includes(search.toLowerCase()) ||
      job.jobNumber?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <p className="text-gray-400 mt-1">
            Jobs you are assigned to work on
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-blue-400">{activeJobs.length}</p>
          <p className="text-sm text-gray-500">Active</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-400">{completedJobs.length}</p>
          <p className="text-sm text-gray-500">Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-gold">{formatCurrency(totalJobValue)}</p>
          <p className="text-sm text-gray-500">Total Value</p>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={statusOptions}
            />
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <Card className="p-4 border-red-500/20 bg-red-500/10">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card className="p-8 text-center">
          <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">
            {search || statusFilter ? 'No jobs match your filters' : 'No jobs assigned yet'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((job: Job) => (
            <Card key={job.id} className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-sm text-gray-500">{job.jobNumber}</span>
                    {getStatusBadge(job.status)}
                  </div>
                  <h3 className="font-medium text-white mb-2">{job.customer?.name}</h3>

                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {job.customer?.address?.street}, {job.customer?.address?.city}
                    </span>
                    {job.customer?.address && (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                          `${job.customer.address.street}, ${job.customer.address.city}, ${job.customer.address.state} ${job.customer.address.zip}`
                        )}&travelmode=driving`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 rounded transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Navigation className="w-3 h-3" />
                        Navigate
                      </a>
                    )}
                  </div>

                  {job.dates?.scheduledStart && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Scheduled: {formatDate(job.dates.scheduledStart)}</span>
                    </div>
                  )}

                  {job.type && (
                    <p className="text-sm text-gray-500 mt-2 capitalize">
                      {job.type.replace(/_/g, ' ')} job
                    </p>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-lg font-bold text-gold">
                    {formatCurrency(job.costs?.laborActual || job.costs?.laborProjected || 0)}
                  </p>
                  <p className="text-xs text-gray-500">Labor value</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      {filteredJobs.length > 0 && (
        <div className="bg-gray-800/50 rounded-xl p-4 flex flex-wrap gap-6">
          <div>
            <p className="text-sm text-gray-400">Showing</p>
            <p className="text-xl font-bold text-white">{filteredJobs.length} jobs</p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Total Value</p>
            <p className="text-xl font-bold text-gold">
              {formatCurrency(
                filteredJobs.reduce(
                  (sum, job) => sum + (job.costs?.laborActual || job.costs?.laborProjected || 0),
                  0
                )
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
