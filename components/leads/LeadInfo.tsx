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
