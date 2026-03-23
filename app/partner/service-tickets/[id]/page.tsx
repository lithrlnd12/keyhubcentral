'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Phone, Mail, AlertTriangle, Calendar, CheckCircle, User, ImageIcon, MessageCircle, Loader2, Camera, Plus, FileText, Hash, DollarSign } from 'lucide-react';
import { usePartnerTicket, useAuth } from '@/lib/hooks';
import { findOrCreateRequestChat } from '@/lib/firebase/messages';
import { getUserProfile } from '@/lib/firebase/auth';
import { addPhotosToPartnerTicket } from '@/lib/firebase/partnerTickets';
import { uploadPartnerTicketPhoto } from '@/lib/firebase/storage';
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
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuth();
  const { ticket, loading, error } = usePartnerTicket(id, true);
  const [startingChat, setStartingChat] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleChat = async () => {
    if (!ticket || !user?.uid || !ticket.assignedTechId) return;
    setStartingChat(true);
    try {
      const participants = [ticket.submittedBy, ticket.assignedTechId];
      const participantNames: Record<string, string> = {};

      for (const uid of participants) {
        const profile = await getUserProfile(uid);
        participantNames[uid] = profile?.displayName || 'Unknown';
      }

      const convId = await findOrCreateRequestChat(
        id,
        'service',
        participants,
        participantNames,
        user.uid,
        `${ticket.ticketNumber} - ${ticket.issueType}`
      );
      router.push(`/messages/${convId}`);
    } catch (err) {
      console.error('Failed to open chat:', err);
    } finally {
      setStartingChat(false);
    }
  };

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

  const handleAddPhotos = async (files: FileList | null) => {
    if (!files || !user) return;
    setPhotoUploading(true);
    try {
      const takenAt = new Date().toISOString();
      const uploaded: Array<{ url: string; takenAt: string }> = [];
      for (const file of Array.from(files)) {
        const url = await uploadPartnerTicketPhoto(user.uid, file);
        uploaded.push({ url, takenAt });
      }
      if (uploaded.length > 0) {
        await addPhotosToPartnerTicket(id, uploaded);
      }
    } catch (err) {
      console.error('Failed to upload photos:', err);
    } finally {
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

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
        <div className="flex items-center gap-2">
          <span className={`text-sm px-3 py-1 rounded-full ${
            ticket.status === 'complete'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}>
            {getPartnerTicketStatusLabel(ticket.status)}
          </span>
          {['assigned', 'scheduled', 'in_progress'].includes(ticket.status) && ticket.assignedTechId && (
            <button
              onClick={handleChat}
              disabled={startingChat}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-gold text-brand-black text-sm font-medium rounded-lg hover:bg-brand-gold-light transition-colors disabled:opacity-50"
            >
              {startingChat ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MessageCircle className="w-4 h-4" />
              )}
              Chat with Tech
            </button>
          )}
        </div>
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

      {/* Work Order Details */}
      {(ticket.serviceOrderNumber || ticket.caseNumber || ticket.workOrderUrl || ticket.estimatedCost || (ticket.lineItems && ticket.lineItems.length > 0)) && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Work Order</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {ticket.serviceOrderNumber && (
              <div>
                <p className="text-gray-400 text-sm">Service Order #</p>
                <p className="text-white font-mono">{ticket.serviceOrderNumber}</p>
              </div>
            )}
            {ticket.caseNumber && (
              <div>
                <p className="text-gray-400 text-sm">Case #</p>
                <p className="text-white font-mono">{ticket.caseNumber}</p>
              </div>
            )}
            {ticket.estimatedCost != null && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-400 text-sm">Estimated Cost</p>
                  <p className="text-white">${ticket.estimatedCost.toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          {ticket.workOrderUrl && (
            <a
              href={ticket.workOrderUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-brand-gold hover:underline text-sm"
            >
              <FileText className="h-4 w-4" />
              View uploaded SWO PDF
            </a>
          )}

          {ticket.lineItems && ticket.lineItems.length > 0 && (
            <div>
              <p className="text-gray-400 text-sm mb-2">Line Items</p>
              <div className="space-y-2">
                {ticket.lineItems.map((item, i) => (
                  <div key={i} className="bg-gray-900/60 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-white text-sm font-medium">{item.activity}</p>
                        {item.description && (
                          <p className="text-gray-400 text-xs mt-0.5">{item.description}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gray-400 text-xs">Qty: {item.quantity}</p>
                        {item.estimatedCost != null && (
                          <p className="text-white text-sm">${item.estimatedCost.toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photos */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">
              Photos {ticket.photos?.length ? `(${ticket.photos.length})` : ''}
            </h2>
          </div>
          {ticket.status !== 'complete' && (
            <div className="flex items-center gap-2">
              <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => handleAddPhotos(e.target.files)} />
              <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                onChange={(e) => handleAddPhotos(e.target.files)} />
              {photoUploading ? (
                <Loader2 className="w-5 h-5 animate-spin text-brand-gold" />
              ) : (
                <>
                  <button onClick={() => cameraInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    <Camera className="w-4 h-4" /> Take Photo
                  </button>
                  <button onClick={() => photoInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 text-gray-300 text-sm rounded-lg hover:bg-gray-700 transition-colors">
                    <Plus className="w-4 h-4" /> Add Photos
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {ticket.photos && ticket.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ticket.photos.map((url, index) => {
              const meta = ticket.photosMeta?.find((m) => m.url === url);
              const takenAt = meta?.takenAt
                ? new Date(meta.takenAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : null;
              return (
                <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="block">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic photo from Firebase Storage */}
                    <img src={url} alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg bg-gray-900 hover:opacity-80 transition-opacity" />
                    {takenAt && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 rounded-b-lg">
                        {takenAt}
                      </div>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No photos yet. Use the buttons above to add photos.</p>
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
