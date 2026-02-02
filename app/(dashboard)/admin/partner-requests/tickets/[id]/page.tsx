'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Phone,
  Mail,
  User,
  AlertTriangle,
  ClipboardList,
  CheckCircle2,
  FileText,
  Image,
} from 'lucide-react';
import Link from 'next/link';
import { usePartnerTicket } from '@/lib/hooks/usePartnerTickets';
import { useContractors } from '@/lib/hooks/useContractors';
import { useAuth } from '@/lib/hooks/useAuth';
import {
  updatePartnerTicketStatus,
  assignTechToTicket,
  resolvePartnerTicket,
} from '@/lib/firebase/partnerTickets';
import {
  PartnerTicketStatus,
  PARTNER_TICKET_STATUS_ORDER,
  getPartnerTicketStatusLabel,
  ISSUE_TYPE_OPTIONS,
  Urgency,
} from '@/types/partner';
import { Timestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<PartnerTicketStatus, string> = {
  new: 'bg-yellow-500/20 text-yellow-400',
  reviewed: 'bg-blue-500/20 text-blue-400',
  assigned: 'bg-purple-500/20 text-purple-400',
  scheduled: 'bg-indigo-500/20 text-indigo-400',
  in_progress: 'bg-orange-500/20 text-orange-400',
  complete: 'bg-green-500/20 text-green-400',
};

const URGENCY_COLORS: Record<Urgency, string> = {
  low: 'bg-gray-500/20 text-gray-400',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  emergency: 'bg-red-500/20 text-red-400',
};

export default function ServiceTicketDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { user } = useAuth();

  const { ticket, loading, error } = usePartnerTicket(id, true);
  const { contractors, loading: contractorsLoading } = useContractors({
    initialFilters: { status: 'active' },
  });

  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedTech, setSelectedTech] = useState<string>('');
  const [scheduledDate, setScheduledDate] = useState<string>('');
  const [resolution, setResolution] = useState('');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // Initialize form state when ticket loads
  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
      setSelectedTech(ticket.assignedTechId || '');
      if (ticket.scheduledDate) {
        setScheduledDate(
          ticket.scheduledDate.toDate().toISOString().split('T')[0]
        );
      }
    }
  }, [ticket]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Service ticket not found</p>
      </div>
    );
  }

  const issueTypeLabel =
    ISSUE_TYPE_OPTIONS.find((t) => t.value === ticket.issueType)?.label ||
    ticket.issueType;

  // Generate status options
  const statusOptions = PARTNER_TICKET_STATUS_ORDER.map((s) => ({
    value: s,
    label: getPartnerTicketStatusLabel(s),
  }));

  // Generate tech options
  const techOptions = [
    { value: '', label: 'Select technician...' },
    ...contractors.map((c) => ({
      value: c.id,
      label: c.businessName || `Contractor ${c.id.slice(0, 6)}`,
    })),
  ];

  // Get assigned tech name
  const assignedTech = contractors.find((c) => c.id === ticket.assignedTechId);
  const assignedTechName = assignedTech
    ? assignedTech.businessName || `Contractor ${assignedTech.id.slice(0, 6)}`
    : null;

  // Handle update
  const handleUpdate = async () => {
    if (!user?.uid) return;

    setUpdating(true);
    setUpdateError(null);

    try {
      const newStatus = selectedStatus as PartnerTicketStatus;

      // Handle resolution (completing ticket)
      if (newStatus === 'complete' && resolution) {
        await resolvePartnerTicket(id, resolution, user.uid);
        setResolution('');
        setNotes('');
        return;
      }

      // Handle tech assignment with optional scheduling
      if (
        (newStatus === 'assigned' || newStatus === 'scheduled') &&
        selectedTech
      ) {
        const scheduleTimestamp = scheduledDate
          ? Timestamp.fromDate(new Date(scheduledDate))
          : undefined;
        await assignTechToTicket(id, selectedTech, user.uid, scheduleTimestamp);
        setNotes('');
        return;
      }

      // Regular status update
      if (newStatus !== ticket.status) {
        await updatePartnerTicketStatus(
          id,
          newStatus,
          user.uid,
          notes || undefined
        );
        setNotes('');
      }
    } catch (err) {
      setUpdateError(
        err instanceof Error ? err.message : 'Failed to update ticket'
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/admin/partner-requests"
            className="inline-flex items-center text-gray-400 hover:text-white mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Requests
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-gold font-mono">
              {ticket.ticketNumber}
            </h1>
            <span
              className={`text-sm px-3 py-1 rounded-full ${STATUS_COLORS[ticket.status]}`}
            >
              {getPartnerTicketStatusLabel(ticket.status)}
            </span>
            <span
              className={`text-sm px-3 py-1 rounded-full flex items-center gap-1 ${URGENCY_COLORS[ticket.urgency]}`}
            >
              <AlertTriangle className="w-3 h-3" />
              {ticket.urgency.charAt(0).toUpperCase() + ticket.urgency.slice(1)}
            </span>
          </div>
          <p className="text-gray-400 flex items-center gap-2 mt-1">
            <Building2 className="w-4 h-4" />
            {ticket.partnerCompany}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ticket Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Issue Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Issue Type</p>
                  <p className="text-white flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-gold" />
                    {issueTypeLabel}
                  </p>
                </div>
                {ticket.preferredDate && (
                  <div>
                    <p className="text-sm text-gray-400">Preferred Date</p>
                    <p className="text-white flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gold" />
                      {ticket.preferredDate.toDate().toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Description</p>
                <p className="text-white">{ticket.issueDescription}</p>
              </div>

              {ticket.productInfo && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Product Info</p>
                  <p className="text-white">{ticket.productInfo}</p>
                </div>
              )}

              {ticket.photos.length > 0 && (
                <div>
                  <p className="text-sm text-gray-400 mb-2">Photos</p>
                  <div className="grid grid-cols-3 gap-2">
                    {ticket.photos.map((photo, i) => (
                      <a
                        key={i}
                        href={photo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative aspect-square bg-gray-800 rounded-lg overflow-hidden group"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- User-uploaded photo */}
                        <img
                          src={photo}
                          alt={`Photo ${i + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          {/* eslint-disable-next-line jsx-a11y/alt-text -- This is a Lucide icon, not an img */}
                          <Image className="w-6 h-6 text-white" />
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {assignedTechName && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Assigned Technician</p>
                  <p className="text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-gold" />
                    {assignedTechName}
                  </p>
                </div>
              )}

              {ticket.scheduledDate && (
                <div>
                  <p className="text-sm text-gray-400 mb-1">Scheduled Date</p>
                  <p className="text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gold" />
                    {ticket.scheduledDate.toDate().toLocaleDateString()}
                  </p>
                </div>
              )}

              {ticket.resolution && (
                <div className="border-t border-gray-800 pt-4 mt-4">
                  <p className="text-sm text-gray-400 mb-1">Resolution</p>
                  <p className="text-white">{ticket.resolution}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-gold" />
                    {ticket.customerName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Phone</p>
                  <p className="text-white flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gold" />
                    {ticket.customerPhone}
                  </p>
                </div>
                {ticket.customerEmail && (
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <p className="text-white flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gold" />
                      {ticket.customerEmail}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-1">Service Address</p>
                <p className="text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-gold" />
                  {ticket.serviceAddress.street}, {ticket.serviceAddress.city},{' '}
                  {ticket.serviceAddress.state} {ticket.serviceAddress.zip}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Status History */}
          <Card>
            <CardHeader>
              <CardTitle>Status History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ticket.statusHistory
                  .slice()
                  .reverse()
                  .map((change, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div
                        className={`p-1.5 rounded-full ${STATUS_COLORS[change.status]}`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">
                            {getPartnerTicketStatusLabel(change.status)}
                          </span>
                          <span className="text-gray-500 text-sm">
                            {change.changedAt.toDate().toLocaleString()}
                          </span>
                        </div>
                        {change.notes && (
                          <p className="text-gray-400 text-sm mt-0.5">
                            {change.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label="Status"
                options={statusOptions}
                value={selectedStatus || ticket.status}
                onChange={(e) => setSelectedStatus(e.target.value)}
              />

              {/* Show tech assignment when appropriate */}
              {['reviewed', 'assigned', 'scheduled'].includes(
                selectedStatus || ticket.status
              ) && (
                <>
                  <Select
                    label="Assign Technician"
                    options={techOptions}
                    value={selectedTech}
                    onChange={(e) => setSelectedTech(e.target.value)}
                    disabled={contractorsLoading}
                  />
                  <Input
                    type="date"
                    label="Schedule Date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </>
              )}

              {/* Show resolution field when completing */}
              {(selectedStatus || ticket.status) === 'complete' &&
                ticket.status !== 'complete' && (
                  <Textarea
                    label="Resolution"
                    placeholder="Describe how the issue was resolved..."
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    rows={4}
                  />
                )}

              {/* Notes for other status changes */}
              {(selectedStatus || ticket.status) !== 'complete' && (
                <Textarea
                  label="Notes"
                  placeholder="Add notes for this status change..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              )}

              {updateError && (
                <p className="text-red-400 text-sm">{updateError}</p>
              )}

              <Button
                onClick={handleUpdate}
                loading={updating}
                disabled={
                  updating ||
                  (selectedStatus === ticket.status &&
                    !selectedTech &&
                    !scheduledDate &&
                    !resolution)
                }
                className="w-full"
              >
                <FileText className="w-4 h-4 mr-2" />
                Update Ticket
              </Button>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Created</span>
                <span className="text-white">
                  {ticket.createdAt.toDate().toLocaleDateString()}
                </span>
              </div>
              {ticket.scheduledDate && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Scheduled</span>
                  <span className="text-white">
                    {ticket.scheduledDate.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
              {ticket.resolvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Resolved</span>
                  <span className="text-white">
                    {ticket.resolvedAt.toDate().toLocaleDateString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
