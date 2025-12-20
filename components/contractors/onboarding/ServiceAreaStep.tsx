'use client';

import { MapPin, Navigation } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Slider } from '@/components/ui/Slider';

export interface ServiceAreaData {
  serviceRadius: number;
  homeAddress: string;
}

interface ServiceAreaStepProps {
  data: ServiceAreaData;
  onChange: (data: ServiceAreaData) => void;
  errors?: Partial<Record<keyof ServiceAreaData, string>>;
}

export function ServiceAreaStep({ data, onChange, errors }: ServiceAreaStepProps) {
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

          {/* Map placeholder - will be replaced with Google Maps */}
          <div className="mt-6 bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="aspect-video flex flex-col items-center justify-center p-6 text-center">
              <Navigation className="w-12 h-12 text-gray-600 mb-3" />
              <h4 className="text-white font-medium mb-1">Territory Map</h4>
              <p className="text-sm text-gray-500 max-w-sm">
                Interactive Google Maps integration will display the service area
                based on the radius setting above.
              </p>
              <div className="mt-4 px-4 py-2 bg-brand-gold/10 rounded-lg">
                <span className="text-brand-gold text-sm font-medium">
                  {data.serviceRadius} mile radius from home base
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-xs text-gray-500">
            The service radius determines which jobs and leads can be assigned to
            this contractor based on distance from their home address.
          </p>
        </CardContent>
      </Card>

      {errors?.serviceRadius && (
        <p className="text-sm text-red-500">{errors.serviceRadius}</p>
      )}
    </div>
  );
}
