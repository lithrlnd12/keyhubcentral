'use client';

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
    </div>
  );
}
