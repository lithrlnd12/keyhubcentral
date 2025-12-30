'use client';

import Image from 'next/image';
import { Lead } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatDateTime, formatPhone } from '@/lib/utils/formatters';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  MessageSquare,
  UserCheck,
  Paperclip,
  FileText,
  Image as ImageIcon,
  Download,
  ExternalLink,
  PhoneCall,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Voicemail,
  PhoneMissed,
} from 'lucide-react';

interface LeadInfoProps {
  lead: Lead;
  className?: string;
}

export function LeadInfo({ lead, className }: LeadInfoProps) {
  return (
    <div className={className}>
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-brand-gold" />
              Customer Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <User className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Name</p>
                  <p className="text-white">{lead.customer.name}</p>
                </div>
              </div>

              {lead.customer.email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-400">Email</p>
                    <a
                      href={`mailto:${lead.customer.email}`}
                      className="text-brand-gold hover:underline"
                    >
                      {lead.customer.email}
                    </a>
                  </div>
                </div>
              )}

              {lead.customer.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-400">Phone</p>
                    <a
                      href={`tel:${lead.customer.phone}`}
                      className="text-brand-gold hover:underline"
                    >
                      {formatPhone(lead.customer.phone)}
                    </a>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-500 mt-1" />
                <div>
                  <p className="text-sm text-gray-400">Address</p>
                  <div className="text-white">
                    {lead.customer.address.street && (
                      <p>{lead.customer.address.street}</p>
                    )}
                    <p>
                      {lead.customer.address.city}, {lead.customer.address.state}{' '}
                      {lead.customer.address.zip}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lead Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-brand-gold" />
              Lead Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Created</p>
                <p className="text-white">
                  {lead.createdAt
                    ? formatDateTime(lead.createdAt.toDate())
                    : 'Unknown'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-400">Last Updated</p>
                <p className="text-white">
                  {lead.updatedAt
                    ? formatDateTime(lead.updatedAt.toDate())
                    : 'Unknown'}
                </p>
              </div>

              {lead.campaignId && (
                <div>
                  <p className="text-sm text-gray-400">Campaign</p>
                  <p className="text-white">{lead.campaignId}</p>
                </div>
              )}

              {lead.assignedTo && (
                <div className="flex items-start gap-3">
                  <UserCheck className="w-4 h-4 text-gray-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-400">Assigned To</p>
                    <p className="text-white">
                      {lead.assignedTo}
                      {lead.assignedType && (
                        <span className="text-gray-400 text-sm ml-1">
                          ({lead.assignedType})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {lead.returnReason && (
              <div className="pt-4 border-t border-gray-700">
                <p className="text-sm text-gray-400">Return Reason</p>
                <p className="text-yellow-400">{lead.returnReason}</p>
                {lead.returnedAt && (
                  <p className="text-xs text-gray-500 mt-1">
                    Returned {formatDateTime(lead.returnedAt.toDate())}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {lead.customer.notes && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-gold" />
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300 whitespace-pre-wrap">{lead.customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Call Activity */}
      {(lead.lastCallOutcome || lead.callAttempts) && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="w-5 h-5 text-brand-gold" />
              Call Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Call Status */}
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                {lead.lastCallOutcome === 'answered' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-green-500/20 text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    Answered
                  </span>
                )}
                {lead.lastCallOutcome === 'voicemail' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-yellow-500/20 text-yellow-400">
                    <Voicemail className="w-4 h-4" />
                    Voicemail
                  </span>
                )}
                {lead.lastCallOutcome === 'no_answer' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-orange-500/20 text-orange-400">
                    <PhoneMissed className="w-4 h-4" />
                    No Answer
                  </span>
                )}
                {lead.lastCallOutcome === 'busy' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                    <XCircle className="w-4 h-4" />
                    Busy
                  </span>
                )}
                {lead.lastCallOutcome === 'failed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-red-500/20 text-red-400">
                    <XCircle className="w-4 h-4" />
                    Failed
                  </span>
                )}
              </div>
              {lead.callAttempts !== undefined && lead.callAttempts > 0 && (
                <span className="text-sm text-gray-400">
                  {lead.callAttempts} attempt{lead.callAttempts !== 1 ? 's' : ''}
                </span>
              )}
              {lead.lastCallAt && (
                <span className="text-sm text-gray-400">
                  <Clock className="w-3 h-3 inline mr-1" />
                  {formatDateTime(lead.lastCallAt.toDate())}
                </span>
              )}
            </div>

            {/* Recording */}
            {lead.lastCallRecordingUrl && (
              <div className="bg-brand-black rounded-lg p-3 border border-gray-700">
                <p className="text-sm text-gray-400 mb-2">Recording</p>
                <audio controls className="w-full" src={lead.lastCallRecordingUrl}>
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}

            {/* Summary */}
            {lead.lastCallSummary && (
              <div>
                <p className="text-sm text-gray-400 mb-1">AI Summary</p>
                <p className="text-gray-300 bg-brand-black rounded-lg p-3 border border-gray-700">
                  {lead.lastCallSummary}
                </p>
              </div>
            )}

            {/* Structured Data / Call Analysis */}
            {lead.callAnalysis && Object.keys(lead.callAnalysis).length > 0 && (
              <div>
                <p className="text-sm text-gray-400 mb-2">Extracted Information</p>
                <div className="bg-brand-black rounded-lg p-3 border border-gray-700 space-y-2">
                  {Object.entries(lead.callAnalysis).map(([key, value]) => (
                    <div key={key} className="flex justify-between items-start gap-4">
                      <span className="text-gray-400 text-sm capitalize">
                        {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                      </span>
                      <span className="text-white text-sm text-right">
                        {typeof value === 'boolean'
                          ? (value ? 'Yes' : 'No')
                          : String(value || '-')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript */}
            {lead.lastCallTranscript && (
              <details className="group">
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-gray-300 flex items-center gap-2">
                  <span>View Full Transcript</span>
                  <span className="text-xs text-gray-500 group-open:hidden">Click to expand</span>
                </summary>
                <div className="mt-2 bg-brand-black rounded-lg p-3 border border-gray-700 max-h-64 overflow-y-auto">
                  <p className="text-gray-300 whitespace-pre-wrap text-sm">
                    {lead.lastCallTranscript}
                  </p>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Attachments */}
      {lead.customer.attachments && lead.customer.attachments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-brand-gold" />
              Attachments ({lead.customer.attachments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lead.customer.attachments.map((attachment, index) => {
                const isImage = attachment.type.startsWith('image/');
                const sizeKB = (attachment.size / 1024).toFixed(1);
                const sizeMB = (attachment.size / (1024 * 1024)).toFixed(1);
                const displaySize = attachment.size > 1024 * 1024 ? `${sizeMB} MB` : `${sizeKB} KB`;

                return (
                  <div
                    key={index}
                    className="bg-brand-black border border-gray-700 rounded-lg overflow-hidden hover:border-gray-600 transition-colors"
                  >
                    {isImage ? (
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block relative h-32"
                      >
                        <Image
                          src={attachment.url}
                          alt={attachment.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </a>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-gray-800">
                        <FileText className="w-12 h-12 text-gray-500" />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-sm text-white truncate" title={attachment.name}>
                        {attachment.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{displaySize}</p>
                      <div className="flex gap-2 mt-2">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-brand-gold hover:text-brand-gold-light transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View
                        </a>
                        <a
                          href={attachment.url}
                          download={attachment.name}
                          className="flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
