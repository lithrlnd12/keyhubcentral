'use client';

import Link from 'next/link';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils/formatters';

interface Job {
  id: string;
  customerName: string;
  address: string;
  scheduledDate: string;
  status: 'scheduled' | 'in_progress' | 'completed';
  amount: number;
}

interface MyJobsPreviewProps {
  jobs?: Job[];
}

const mockJobs: Job[] = [
  {
    id: '1',
    customerName: 'John Smith',
    address: '123 Oak Street, Dallas, TX',
    scheduledDate: '2024-12-20',
    status: 'scheduled',
    amount: 450,
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    address: '456 Pine Ave, Fort Worth, TX',
    scheduledDate: '2024-12-21',
    status: 'scheduled',
    amount: 680,
  },
  {
    id: '3',
    customerName: 'Mike Williams',
    address: '789 Elm Blvd, Arlington, TX',
    scheduledDate: '2024-12-18',
    status: 'in_progress',
    amount: 520,
  },
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

export function MyJobsPreview({ jobs = mockJobs }: MyJobsPreviewProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Upcoming Jobs</CardTitle>
        <Link
          href="/portal/jobs"
          className="text-sm text-brand-gold hover:underline flex items-center gap-1"
        >
          View All <ArrowRight className="w-4 h-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {jobs.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No upcoming jobs</p>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-medium text-white">{job.customerName}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                      <MapPin className="w-3 h-3" />
                      <span>{job.address}</span>
                    </div>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date(job.scheduledDate).toLocaleDateString()}</span>
                  </div>
                  <span className="font-semibold text-brand-gold">
                    {formatCurrency(job.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
