'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatCurrency } from '@/lib/utils/formatters';

interface Job {
  id: string;
  customerName: string;
  address: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  amount: number;
  description: string;
}

// Mock data - will be replaced with real data in Phase 3
const mockJobs: Job[] = [
  {
    id: '1',
    customerName: 'John Smith',
    address: '123 Oak Street, Dallas, TX 75201',
    scheduledDate: '2024-12-20',
    status: 'scheduled',
    amount: 450,
    description: 'Window installation - 3 windows',
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    address: '456 Pine Ave, Fort Worth, TX 76102',
    scheduledDate: '2024-12-21',
    status: 'scheduled',
    amount: 680,
    description: 'Door replacement - Front entry door',
  },
  {
    id: '3',
    customerName: 'Mike Williams',
    address: '789 Elm Blvd, Arlington, TX 76010',
    scheduledDate: '2024-12-18',
    status: 'in_progress',
    amount: 520,
    description: 'Siding repair - South facing wall',
  },
  {
    id: '4',
    customerName: 'Emily Brown',
    address: '321 Maple Dr, Plano, TX 75074',
    scheduledDate: '2024-12-15',
    status: 'completed',
    amount: 890,
    description: 'Roof repair - Shingle replacement',
  },
  {
    id: '5',
    customerName: 'David Lee',
    address: '654 Cedar Ln, Irving, TX 75039',
    scheduledDate: '2024-12-12',
    status: 'completed',
    amount: 1250,
    description: 'Gutter installation - Full house',
  },
];

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

function getStatusBadge(status: Job['status']) {
  switch (status) {
    case 'scheduled':
      return <Badge variant="info">Scheduled</Badge>;
    case 'in_progress':
      return <Badge variant="warning">In Progress</Badge>;
    case 'completed':
      return <Badge variant="success">Completed</Badge>;
  }
}

export default function MyJobsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Only contractors can access this page
  useEffect(() => {
    if (!authLoading && user && user.role !== 'contractor') {
      router.push('/overview');
    }
  }, [authLoading, user, router]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user || user.role !== 'contractor') {
    return null;
  }

  // Filter jobs
  const filteredJobs = mockJobs.filter((job) => {
    const matchesSearch =
      !search ||
      job.customerName.toLowerCase().includes(search.toLowerCase()) ||
      job.address.toLowerCase().includes(search.toLowerCase()) ||
      job.description.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = !statusFilter || job.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/portal">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">My Jobs</h1>
          <p className="text-gray-400 mt-1">
            View and manage your assigned jobs.
          </p>
        </div>
      </div>

      {/* Filters */}
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

      {/* Jobs List */}
      {filteredJobs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No jobs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <Card key={job.id}>
              <CardContent className="py-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-white">{job.customerName}</h3>
                      {getStatusBadge(job.status)}
                    </div>
                    <p className="text-sm text-gray-400 mb-1">{job.address}</p>
                    <p className="text-sm text-gray-500">{job.description}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-lg font-bold text-brand-gold">
                      {formatCurrency(job.amount)}
                    </p>
                    <p className="text-sm text-gray-400">
                      {new Date(job.scheduledDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-800/50 rounded-xl p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-sm text-gray-400">Total Jobs</p>
          <p className="text-xl font-bold text-white">{filteredJobs.length}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400">Total Value</p>
          <p className="text-xl font-bold text-brand-gold">
            {formatCurrency(filteredJobs.reduce((sum, job) => sum + job.amount, 0))}
          </p>
        </div>
      </div>
    </div>
  );
}
