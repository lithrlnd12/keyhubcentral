'use client';

import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';
import { TerritoryMap } from '@/components/maps';

export interface ServiceAreaData {
  serviceRadius: number;
  homeAddress: string;
  lat?: number;
  lng?: number;
}

interface ServiceAreaStepProps {
  data: ServiceAreaData;
  onChange: (data: ServiceAreaData) => void;
  errors?: Partial<Record<keyof ServiceAreaData, string>>;
}

export function ServiceAreaStep({ data, onChange, errors }: ServiceAreaStepProps) {
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(
    data.lat && data.lng ? { lat: data.lat, lng: data.lng } : null
  );

  // Update map center when lat/lng changes
  useEffect(() => {
    if (data.lat && data.lng) {
      setMapCenter({ lat: data.lat, lng: data.lng });
    }
  }, [data.lat, data.lng]);

  const handleCenterChange = (center: { lat: number; lng: number }) => {
    setMapCenter(center);
    onChange({ ...data, lat: center.lat, lng: center.lng });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Service Area</h3>
        <p className="text-sm text-gray-400">
          Configure the contractor&apos;s service territory.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 bg-brand-gold/20 rounded-lg">
              <MapPin className="w-5 h-5 text-brand-gold" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Home Base Address</p>
              <p className="text-sm text-gray-400 mt-0.5">
                {data.homeAddress || 'Address from Step 1 will be used'}
              </p>
              {mapCenter && (
                <p className="text-xs text-gray-500 mt-1">
                  Coordinates: {mapCenter.lat.toFixed(4)}, {mapCenter.lng.toFixed(4)}
                </p>
              )}
            </div>
          </div>

          <Slider
            label="Service Radius"
            value={data.serviceRadius}
            onChange={(value) => onChange({ ...data, serviceRadius: value })}
            min={5}
            max={100}
            step={5}
            formatValue={(v) => `${v} miles`}
          />

          {/* Google Maps Territory View */}
          <div className="mt-6">
            <TerritoryMap
              center={mapCenter}
              radius={data.serviceRadius}
              onCenterChange={handleCenterChange}
              className="h-[350px] border border-gray-700"
              interactive={true}
            />
          </div>

          <p className="mt-4 text-xs text-gray-500">
            {mapCenter
              ? 'Drag the marker to adjust the home base location. The gold circle shows the service area.'
              : 'Enter an address in Step 1 to see the service area on the map.'}
          </p>
        </CardContent>
      </Card>

      {errors?.serviceRadius && (
        <p className="text-sm text-red-500">{errors.serviceRadius}</p>
      )}
    </div>
  );
}
