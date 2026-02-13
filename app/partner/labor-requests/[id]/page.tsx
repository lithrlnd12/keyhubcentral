'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Users, Calendar, Clock, CheckCircle, ImageIcon, FileText } from 'lucide-react';
import { useLaborRequest } from '@/lib/hooks';
import { getLaborRequestStatusLabel, LABOR_REQUEST_STATUS_ORDER, LaborRequestStatus } from '@/types/partner';
import { Spinner } from '@/components/ui/Spinner';

const STATUS_COLORS: Record<LaborRequestStatus, string> = {
  new: 'bg-yellow-500',
  reviewed: 'bg-blue-500',
  approved: 'bg-purple-500',
  assigned: 'bg-indigo-500',
  in_progress: 'bg-orange-500',
  complete: 'bg-green-500',
  cancelled: 'bg-red-500',
};

export default function LaborRequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { request, loading, error } = useLaborRequest(id, true);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="text-center py-12">
        <p className="text-red-400">{error || 'Request not found'}</p>
        <Link href="/partner/labor-requests" className="text-gold hover:underline mt-4 inline-block">
          Back to Labor Requests
        </Link>
      </div>
    );
  }

  const currentStatusIndex = LABOR_REQUEST_STATUS_ORDER.indexOf(request.status);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/partner/labor-requests"
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <p className="text-gold font-mono text-sm">{request.requestNumber}</p>
          <h1 className="text-2xl font-bold text-white capitalize">{request.workType} Request</h1>
        </div>
        <span className={`text-sm px-3 py-1 rounded-full ${
          request.status === 'complete'
            ? 'bg-green-500/20 text-green-400'
            : request.status === 'cancelled'
            ? 'bg-red-500/20 text-red-400'
            : 'bg-blue-500/20 text-blue-400'
        }`}>
          {getLaborRequestStatusLabel(request.status)}
        </span>
      </div>

      {/* Status Timeline */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Status Progress</h2>
        <div className="flex items-center justify-between">
          {LABOR_REQUEST_STATUS_ORDER.map((status, index) => {
            const isCompleted = index <= currentStatusIndex && request.status !== 'cancelled';
            const isCurrent = status === request.status;

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
                  <div className={`h-1 flex-1 ${index === LABOR_REQUEST_STATUS_ORDER.length - 1 ? 'invisible' : isCompleted && index < currentStatusIndex ? 'bg-gold' : 'bg-gray-700'}`} />
                </div>
                <p className={`text-xs mt-2 text-center ${isCurrent ? 'text-gold font-medium' : 'text-gray-500'}`}>
                  {getLaborRequestStatusLabel(status)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Request Details</h2>

        <div>
          <p className="text-gray-400 text-sm">Description</p>
          <p className="text-white">{request.description}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <MapPin className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Location</p>
              <p className="text-white">
                {request.location.street}<br />
                {request.location.city}, {request.location.state} {request.location.zip}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Crew Size</p>
              <p className="text-white">{request.crewSize} member{request.crewSize !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Date Needed</p>
              <p className="text-white">{request.dateNeeded.toDate().toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-gray-400" />
            <div>
              <p className="text-gray-400 text-sm">Duration</p>
              <p className="text-white">{request.estimatedDuration}</p>
            </div>
          </div>
        </div>

        {request.skillsRequired.length > 0 && (
          <div>
            <p className="text-gray-400 text-sm">Skills Required</p>
            <div className="flex flex-wrap gap-2 mt-1">
              {request.skillsRequired.map((skill) => (
                <span key={skill} className="px-2 py-1 bg-gray-900 rounded text-sm text-white">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {request.specialEquipment && (
          <div>
            <p className="text-gray-400 text-sm">Special Equipment</p>
            <p className="text-white">{request.specialEquipment}</p>
          </div>
        )}

        {request.notes && (
          <div>
            <p className="text-gray-400 text-sm">Notes</p>
            <p className="text-white">{request.notes}</p>
          </div>
        )}
      </div>

      {/* Work Order */}
      {request.workOrderUrl && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Work Order</h2>
          </div>
          <a
            href={request.workOrderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-gold hover:underline text-sm"
          >
            <FileText className="h-4 w-4" />
            View uploaded work order PDF
          </a>
        </div>
      )}

      {/* Photos */}
      {request.photos && request.photos.length > 0 && (
        <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-gray-400" />
            <h2 className="text-lg font-semibold text-white">Photos ({request.photos.length})</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {request.photos.map((url, index) => (
              <a
                key={index}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic photo from upload */}
                <img
                  src={url}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg bg-gray-900 hover:opacity-80 transition-opacity"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Status History */}
      <div className="bg-brand-charcoal border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Activity History</h2>
        <div className="space-y-4">
          {request.statusHistory.slice().reverse().map((change, index) => (
            <div key={index} className="flex gap-3">
              <div className={`w-2 h-2 rounded-full mt-2 ${STATUS_COLORS[change.status]}`} />
              <div>
                <p className="text-white font-medium">{getLaborRequestStatusLabel(change.status)}</p>
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
        Submitted on {request.createdAt.toDate().toLocaleString()}
      </div>
    </div>
  );
}
