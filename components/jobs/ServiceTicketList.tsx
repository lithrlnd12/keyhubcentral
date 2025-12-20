'use client';

import { useState, useEffect } from 'react';
import { ServiceTicket } from '@/types/job';
import { ServiceTicketCard } from './ServiceTicketCard';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { getServiceTicketsForJob } from '@/lib/firebase/serviceTickets';
import { AlertTriangle, Plus, Wrench } from 'lucide-react';
import Link from 'next/link';

interface ServiceTicketListProps {
  jobId: string;
  canCreate?: boolean;
}

export function ServiceTicketList({ jobId, canCreate = false }: ServiceTicketListProps) {
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTickets = async () => {
      try {
        setLoading(true);
        const data = await getServiceTicketsForJob(jobId);
        setTickets(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };

    loadTickets();
  }, [jobId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-2" />
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="text-center py-8">
        <Wrench className="w-10 h-10 text-gray-600 mx-auto mb-2" />
        <p className="text-gray-400 mb-4">No service tickets for this job</p>
        {canCreate && (
          <Link href={`/kr/${jobId}/service/new`}>
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Service Ticket
            </Button>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {canCreate && (
        <div className="flex justify-end">
          <Link href={`/kr/${jobId}/service/new`}>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              New Ticket
            </Button>
          </Link>
        </div>
      )}
      {tickets.map((ticket) => (
        <ServiceTicketCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
