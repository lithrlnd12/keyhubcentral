'use client';

import { Check, FileText, MapPin, Shield, Wrench } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { BasicInfoData } from './BasicInfoStep';
import { DocumentsData } from './DocumentsStep';
import { ServiceAreaData } from './ServiceAreaStep';
import { tradeLabels } from '@/lib/utils/contractors';
import { Trade } from '@/types/contractor';

interface ReviewStepProps {
  basicInfo: BasicInfoData;
  documents: DocumentsData;
  serviceArea: ServiceAreaData;
  agreedToTerms: boolean;
  onAgreementChange: (agreed: boolean) => void;
  error?: string;
}

function SectionCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between py-2 border-b border-gray-800 last:border-0">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm text-white text-right">{value || '—'}</span>
    </div>
  );
}

export function ReviewStep({
  basicInfo,
  documents,
  serviceArea,
  agreedToTerms,
  onAgreementChange,
  error,
}: ReviewStepProps) {
  const fullAddress = `${basicInfo.street}, ${basicInfo.city}, ${basicInfo.state} ${basicInfo.zip}`;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Review & Submit</h3>
        <p className="text-sm text-gray-400">
          Please review the information before submitting.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Basic Information"
          icon={<Wrench className="w-4 h-4 text-brand-gold" />}
        >
          <InfoRow label="Business Name" value={basicInfo.businessName} />
          <InfoRow label="Email" value={basicInfo.email} />
          <InfoRow label="Phone" value={basicInfo.phone} />
          <InfoRow label="Address" value={fullAddress} />
          <div className="py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400 block mb-2">Trades</span>
            <div className="flex flex-wrap gap-1">
              {basicInfo.trades.map((trade) => (
                <Badge key={trade} variant="info">
                  {tradeLabels[trade as Trade]}
                </Badge>
              ))}
            </div>
          </div>
          {basicInfo.skills.length > 0 && (
            <div className="py-2">
              <span className="text-sm text-gray-400 block mb-2">Skills</span>
              <div className="flex flex-wrap gap-1">
                {basicInfo.skills.map((skill) => (
                  <Badge key={skill} variant="default">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Documents"
          icon={<FileText className="w-4 h-4 text-brand-gold" />}
        >
          <InfoRow
            label="W-9 Form"
            value={
              documents.w9File || documents.w9Url ? (
                <Badge variant="success">Uploaded</Badge>
              ) : (
                <Badge variant="warning">Not uploaded</Badge>
              )
            }
          />
          <InfoRow
            label="Insurance Certificate"
            value={
              documents.insuranceFile || documents.insuranceUrl ? (
                <Badge variant="success">Uploaded</Badge>
              ) : (
                <Badge variant="warning">Not uploaded</Badge>
              )
            }
          />
          <InfoRow label="Insurance Carrier" value={documents.insuranceCarrier} />
          <InfoRow label="Policy Number" value={documents.insurancePolicyNumber} />
          <InfoRow label="Insurance Expires" value={documents.insuranceExpiration} />
          <InfoRow
            label="Licenses"
            value={`${documents.licenses.length} license(s)`}
          />
        </SectionCard>

        <SectionCard
          title="Service Area"
          icon={<MapPin className="w-4 h-4 text-brand-gold" />}
        >
          <InfoRow label="Home Base" value={fullAddress} />
          <InfoRow label="Service Radius" value={`${serviceArea.serviceRadius} miles`} />
        </SectionCard>

        <Card className="md:row-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="w-4 h-4 text-brand-gold" />
              Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToTerms}
                onChange={(e) => onAgreementChange(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-brand-charcoal text-brand-gold focus:ring-brand-gold focus:ring-offset-0"
              />
              <span className="text-sm text-gray-300">
                I agree to the{' '}
                <a
                  href="#"
                  className="text-brand-gold hover:text-brand-gold-light underline"
                >
                  Service Tech Vendor Agreement
                </a>{' '}
                and confirm that all information provided is accurate.
              </span>
            </label>
            {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
