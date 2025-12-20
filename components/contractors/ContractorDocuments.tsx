'use client';

import { FileText, Shield, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Contractor } from '@/types/contractor';
import {
  formatTimestamp,
  formatLicense,
  formatInsurance,
  getExpirationStatus,
} from '@/lib/utils/contractors';

interface ContractorDocumentsProps {
  contractor: Contractor;
}

function ExpirationBadge({ status }: { status: 'valid' | 'expiring' | 'expired' }) {
  if (status === 'expired') {
    return (
      <Badge variant="error" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Expired
      </Badge>
    );
  }
  if (status === 'expiring') {
    return (
      <Badge variant="warning" className="gap-1">
        <AlertTriangle className="w-3 h-3" />
        Expiring Soon
      </Badge>
    );
  }
  return (
    <Badge variant="success" className="gap-1">
      <CheckCircle className="w-3 h-3" />
      Valid
    </Badge>
  );
}

export function ContractorDocuments({ contractor }: ContractorDocumentsProps) {
  const insuranceStatus = contractor.insurance
    ? getExpirationStatus(contractor.insurance.expiration)
    : 'expired';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-brand-gold" />
            W-9 Form
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractor.w9Url ? (
            <a
              href={contractor.w9Url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-brand-gold hover:text-brand-gold-light"
            >
              <span>View Document</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          ) : (
            <p className="text-gray-500">No W-9 on file</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-brand-gold" />
            Insurance
          </CardTitle>
        </CardHeader>
        <CardContent>
          {contractor.insurance ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-white">
                  {formatInsurance(contractor.insurance)}
                </span>
                <ExpirationBadge status={insuranceStatus} />
              </div>
              <p className="text-sm text-gray-400">
                Expires: {formatTimestamp(contractor.insurance.expiration)}
              </p>
              {contractor.insurance.certificateUrl && (
                <a
                  href={contractor.insurance.certificateUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-brand-gold hover:text-brand-gold-light"
                >
                  View Certificate
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          ) : (
            <p className="text-gray-500">No insurance on file</p>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Licenses</CardTitle>
        </CardHeader>
        <CardContent>
          {contractor.licenses.length > 0 ? (
            <div className="space-y-3">
              {contractor.licenses.map((license, index) => {
                const status = getExpirationStatus(license.expiration);
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0"
                  >
                    <div>
                      <p className="text-white">{formatLicense(license)}</p>
                      <p className="text-sm text-gray-400">
                        Expires: {formatTimestamp(license.expiration)}
                      </p>
                    </div>
                    <ExpirationBadge status={status} />
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500">No licenses on file</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
