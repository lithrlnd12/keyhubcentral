'use client';

import Image from 'next/image';
import { Lead, CallAnalysis } from '@/types/lead';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatDateTime, formatPhone, getPhoneHref } from '@/lib/utils/formatters';
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
  CheckCircle,
  XCircle,
  Clock,
  Voicemail,
  PhoneMissed,
  Home,
  Building,
  Wrench,
  CalendarClock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  PhoneOff,
} from 'lucide-react';

interface LeadInfoProps {
  lead: Lead;
  className?: string;
}

// Helper to format timeline values
function formatTimeline(timeline: string): string {
  const timelineMap: Record<string, string> = {
    'immediate': 'Immediate / ASAP',
    'asap': 'Immediate / ASAP',
    '1_week': 'Within 1 week',
    '2_weeks': 'Within 2 weeks',
    '1_month': 'Within 1 month',
    '1_3_months': '1-3 months',
    '3_6_months': '3-6 months',
    '6_months_plus': '6+ months',
    'not_sure': 'Not sure yet',
    'just_browsing': 'Just browsing',
  };
  return timelineMap[timeline] || timeline.replace(/_/g, ' ');
}

// Helper to format property type
function formatPropertyType(type: string): string {
  const typeMap: Record<string, string> = {
    'personal_home': 'Personal Home',
    'rental_property': 'Rental Property',
    'commercial': 'Commercial Property',
    'investment': 'Investment Property',
  };
  return typeMap[type] || type.replace(/_/g, ' ');
}

// Helper to get interest level styling
function getInterestLevelStyle(level: string): { bg: string; text: string; label: string } {
  const levelLower = level.toLowerCase();
  if (levelLower === 'high' || levelLower === 'very_high') {
    return { bg: 'bg-green-500/20', text: 'text-green-400', label: 'High Interest' };
  } else if (levelLower === 'medium' || levelLower === 'moderate') {
    return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: 'Medium Interest' };
  } else {
    return { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Low Interest' };
  }
}

// Call Analysis Display Component
function CallAnalysisDisplay({ analysis }: { analysis: CallAnalysis }) {
  const interestStyle = analysis.interestLevel
    ? getInterestLevelStyle(analysis.interestLevel)
    : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Call Insights</p>

      {/* Interest Level Badge */}
      {interestStyle && (
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${interestStyle.bg} ${interestStyle.text}`}>
            {interestStyle.label === 'High Interest' ? <ThumbsUp className="w-4 h-4" /> :
             interestStyle.label === 'Low Interest' ? <ThumbsDown className="w-4 h-4" /> :
             <AlertCircle className="w-4 h-4" />}
            {interestStyle.label}
          </span>
        </div>
      )}

      {/* Main Info Grid */}
      <div className="bg-brand-black rounded-lg p-4 border border-gray-700">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Project Type */}
          {analysis.projectType && (
            <div className="flex items-start gap-3">
              <Wrench className="w-4 h-4 text-brand-gold mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Project Type</p>
                <p className="text-white capitalize">{analysis.projectType.replace(/_/g, ' ')}</p>
              </div>
            </div>
          )}

          {/* Property Type */}
          {analysis.propertyType && (
            <div className="flex items-start gap-3">
              {analysis.propertyType === 'personal_home' ? (
                <Home className="w-4 h-4 text-brand-gold mt-0.5" />
              ) : (
                <Building className="w-4 h-4 text-brand-gold mt-0.5" />
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Property Type</p>
                <p className="text-white">{formatPropertyType(analysis.propertyType)}</p>
              </div>
            </div>
          )}

          {/* Timeline */}
          {analysis.timeline && (
            <div className="flex items-start gap-3">
              <CalendarClock className="w-4 h-4 text-brand-gold mt-0.5" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Timeline</p>
                <p className="text-white">{formatTimeline(analysis.timeline)}</p>
              </div>
            </div>
          )}

          {/* Contact Confirmed */}
          {analysis.confirmedContactInfo !== undefined && (
            <div className="flex items-start gap-3">
              {analysis.confirmedContactInfo ? (
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 mt-0.5" />
              )}
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Contact Info</p>
                <p className="text-white">
                  {analysis.confirmedContactInfo ? 'Confirmed' : 'Not confirmed'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Project Description */}
        {analysis.projectDescription && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Project Description</p>
            <p className="text-gray-300">{analysis.projectDescription}</p>
          </div>
        )}

        {/* Additional Notes */}
        {analysis.additionalNotes && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Additional Notes</p>
            <p className="text-gray-300">{analysis.additionalNotes}</p>
          </div>
        )}

        {/* Flags */}
        <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">
          {analysis.requestedCallback && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-400">
              <Phone className="w-3 h-3" />
              Callback Requested
            </span>
          )}
          {analysis.removeFromList && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-red-500/20 text-red-400">
              <PhoneOff className="w-3 h-3" />
              Remove from List
            </span>
          )}
          {!analysis.requestedCallback && !analysis.removeFromList && (
            <span className="text-xs text-gray-500">No special flags</span>
          )}
        </div>
      </div>
    </div>
  );
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
                      href={getPhoneHref(lead.customer.phone)}
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
              <CallAnalysisDisplay analysis={lead.callAnalysis} />
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
