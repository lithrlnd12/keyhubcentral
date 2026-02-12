'use client';

import { useState, useEffect } from 'react';
import { Mail, Phone, MapPin, Wrench, Target } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TerritoryMap } from '@/components/maps/TerritoryMap';
import { Contractor } from '@/types/contractor';
import {
  formatAddress,
  formatTrades,
  getServiceRadiusLabel,
} from '@/lib/utils/contractors';
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocoding';

interface ContractorInfoProps {
  contractor: Contractor;
}

interface InfoRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | React.ReactNode;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-800 last:border-0">
      <div className="text-gray-500 flex-shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-white mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export function ContractorInfo({ contractor }: ContractorInfoProps) {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    contractor.address.lat && contractor.address.lng
      ? { lat: contractor.address.lat, lng: contractor.address.lng }
      : null
  );

  // Auto-geocode if address exists but no coordinates
  useEffect(() => {
    if (mapCenter) return;
    const addr = buildAddressString(contractor.address);
    if (!addr) return;
    geocodeAddress(addr).then((result) => {
      if (result) setMapCenter({ lat: result.lat, lng: result.lng });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-6">
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow
            icon={<Mail className="w-4 h-4" />}
            label="Email"
            value={
              <a
                href={`mailto:${contractor.userId}`}
                className="text-brand-gold hover:text-brand-gold-light"
              >
                {contractor.userId}
              </a>
            }
          />
          <InfoRow
            icon={<MapPin className="w-4 h-4" />}
            label="Address"
            value={formatAddress(contractor.address)}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Work Details</CardTitle>
        </CardHeader>
        <CardContent>
          <InfoRow
            icon={<Wrench className="w-4 h-4" />}
            label="Trades"
            value={formatTrades(contractor.trades)}
          />
          <InfoRow
            icon={<Target className="w-4 h-4" />}
            label="Service Radius"
            value={getServiceRadiusLabel(contractor.serviceRadius)}
          />
          {contractor.skills.length > 0 && (
            <div className="py-3">
              <p className="text-sm text-gray-500 mb-2">Skills</p>
              <div className="flex flex-wrap gap-2">
                {contractor.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-1 bg-gray-800 rounded text-sm text-gray-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      {mapCenter && (
        <Card>
          <CardHeader>
            <CardTitle>Service Area</CardTitle>
          </CardHeader>
          <CardContent>
            <TerritoryMap
              center={mapCenter}
              radius={contractor.serviceRadius}
              className="h-[400px]"
              interactive={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
