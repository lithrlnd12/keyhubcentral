'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Mail, AlertTriangle, Calendar, CheckCircle, User } from 'lucide-react';
import { usePartnerTicket } from '@/lib/hooks';
import { getPartnerTicketStatusLabel, PARTNER_TICKET_STATUS_ORDER, PartnerTicketStatus, URGENCY_OPTIONS } from '@/types/partner';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<PartnerTicketStatus, string> = {
  new: 'bg-yellow-500',
  reviewed: 'bg-blue-500',
  assigned: 'bg-purple-500',
  scheduled: 'bg-indigo-500',
  in_progress: 'bg-orange-500',
  complete: 'bg-green-500',
};

export default function ServiceTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { ticket, loading, error } = usePartnerTicket(id, true);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Ticket not found'}</p>
        <Link href="/partner/service-tickets" className="text-gold hover:underline mt-4 inline-block">
          Back to Service Tickets
        </Link>
      </div>
    );
  }

  const currentStatusIndex = PARTNER_TICKET_STATUS_ORDER.indexOf(ticket.status);
  const urgencyInfo = URGENCY_OPTIONS.find(o => o.value === ticket.urgency);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/partner/service-tickets"
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-gold font-mono text-sm">{ticket.ticketNumber}</p>
          <h1 className="text-2xl font-bold text-white capitalize">{ticket.issueType} Issue</h1>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${
          ticket.status === 'complete'
            ? 'bg-green-500/20 text-green-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {getPartnerTicketStatusLabel(ticket.status)}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Status Progress</h2>
        <div className="flex items-center justify-between">
          {PARTNER_TICKET_STATUS_ORDER.map((status, index) => {
            const isCompleted = index <= currentStatusIndex;
            const isCurrent = status === ticket.status;

            return (
              <div key={status} className="flex flex-col items-center flex-1">
                <div className="flex items-center w-full">
                  <div className={`h-1 flex-1 ${index === 0 ? 'invisible' : isCompleted ? 'bg-gold' : 'bg-gray-700'}`} />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? STATUS_COLORS[status] : 'bg-gray-700'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-5 w-5 text-white" />
                    ) : (
                      <span className="text-gray-400 text-xs">{index + 1}</span>
                    )}
                  </div>
                  <div className={`h-1 flex-1 ${index === PARTNER_TICKET_STATUS_ORDER.length - 1 ? 'invisible' : isCompleted && index < currentStatusIndex ? 'bg-gold' : 'bg-gray-700'}`} />
                </div>
                <p className={`text-xs mt-2 text-center ${isCurrent ? 'text-gold font-medium' : 'text-gray-500'}`}>
                  {getPartnerTicketStatusLabel(status)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Customer Info */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Customer Information</h2>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Name</p>
              <p className="text-white">{ticket.customerName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Phone</p>
              <p className="text-white">{ticket.customerPhone}</p>
            </div>
          </div>

          {ticket.customerEmail && (
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white">{ticket.customerEmail}</p>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Service Address</p>
              <p className="text-white">
                {ticket.serviceAddress.street}<br />
                {ticket.serviceAddress.city}, {ticket.serviceAddress.state} {ticket.serviceAddress.zip}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Details */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Issue Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-400 text-sm">Issue Type</p>
            <p className="text-white capitalize">{ticket.issueType}</p>
          </div>

          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${
              ticket.urgency === 'emergency' ? 'text-red-400' :
              ticket.urgency === 'high' ? 'text-orange-400' :
              ticket.urgency === 'medium' ? 'text-yellow-400' : 'text-gray-400'
            }`} />
            <div>
              <p className="text-gray-400 text-sm">Urgency</p>
              <p className={`${
                ticket.urgency === 'emergency' ? 'text-red-400' :
                ticket.urgency === 'high' ? 'text-orange-400' :
                ticket.urgency === 'medium' ? 'text-yellow-400' : 'text-gray-400'
              }`}>
                {urgencyInfo?.label} - {urgencyInfo?.description}
              </p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-gray-400 text-sm">Description</p>
          <p className="text-white">{ticket.issueDescription}</p>
        </div>

        {ticket.productInfo && (
          <div>
            <p className="text-gray-400 text-sm">Product Information</p>
            <p className="text-white">{ticket.productInfo}</p>
          </div>
        )}

        {ticket.scheduledDate && (
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-gray-400 text-sm">Scheduled Service Date</p>
              <p className="text-green-400 font-medium">
                {ticket.scheduledDate.toDate().toLocaleDateString()}
              </p>
            </div>
          </div>
        )}

        {ticket.resolution && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <p className="text-green-400 text-sm font-medium mb-1">Resolution</p>
            <p className="text-white">{ticket.resolution}</p>
          </div>
        )}
      </div>

      {/* Status History */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Activity History</h2>
        <div className="space-y-4">
          {ticket.statusHistory.slice().reverse().map((change, index) => (
            <div key={index} className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${STATUS_COLORS[change.status]}`} />
              <div>
                <p className="text-white font-medium">{getPartnerTicketStatusLabel(change.status)}</p>
                {change.notes && <p className="text-gray-400 text-sm">{change.notes}</p>}
                <p className="text-gray-500 text-xs">
                  {change.changedAt.toDate().toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Submission Info */}
      <div className="text-center text-gray-500 text-sm">
        Submitted on {ticket.createdAt.toDate().toLocaleString()}
      </div>
    </div>
  );
}
