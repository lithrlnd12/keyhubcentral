'use client';

import { Input } from '@/components/ui/Input';
import { MultiSelect } from '@/components/ui/MultiSelect';
import { TagInput } from '@/components/ui/TagInput';
import { Trade } from '@/types/contractor';

export interface BasicInfoData {
  businessName: string;
  email: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  trades: Trade[];
  skills: string[];
}

interface BasicInfoStepProps {
  data: BasicInfoData;
  onChange: (data: BasicInfoData) => void;
  errors?: Partial<Record<keyof BasicInfoData, string>>;
}

const tradeOptions = [
  { value: 'installer', label: 'Installer' },
  { value: 'sales_rep', label: 'Sales Rep' },
  { value: 'service_tech', label: 'Service Tech' },
  { value: 'pm', label: 'Project Manager' },
];

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function BasicInfoStep({ data, onChange, errors }: BasicInfoStepProps) {
  const updateField = <K extends keyof BasicInfoData>(
    field: K,
    value: BasicInfoData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Basic Information</h3>
        <p className="text-sm text-gray-400">
          Enter the contractor&apos;s business and contact details.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input
            label="Business Name"
            value={data.businessName}
            onChange={(e) => updateField('businessName', e.target.value)}
            placeholder="Company or individual name"
            error={errors?.businessName}
          />
        </div>

        <Input
          label="Email"
          type="email"
          value={data.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="email@example.com"
          error={errors?.email}
        />

        <Input
          label="Phone"
          type="tel"
          value={data.phone}
          onChange={(e) => updateField('phone', e.target.value)}
          placeholder="(555) 555-5555"
          error={errors?.phone}
        />
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Address</h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input
              label="Street Address"
              value={data.street}
              onChange={(e) => updateField('street', e.target.value)}
              placeholder="123 Main St"
              error={errors?.street}
            />
          </div>

          <Input
            label="City"
            value={data.city}
            onChange={(e) => updateField('city', e.target.value)}
            placeholder="City"
            error={errors?.city}
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                State
              </label>
              <select
                value={data.state}
                onChange={(e) => updateField('state', e.target.value)}
                className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
              >
                <option value="">Select</option>
                {usStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors?.state && (
                <p className="mt-1 text-sm text-red-500">{errors.state}</p>
              )}
            </div>

            <Input
              label="ZIP"
              value={data.zip}
              onChange={(e) => updateField('zip', e.target.value)}
              placeholder="12345"
              error={errors?.zip}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Work Details</h4>
        <div className="space-y-4">
          <MultiSelect
            label="Trades"
            options={tradeOptions}
            value={data.trades}
            onChange={(trades) => updateField('trades', trades as Trade[])}
            placeholder="Select trades..."
            error={errors?.trades}
          />

          <TagInput
            label="Skills & Certifications"
            value={data.skills}
            onChange={(skills) => updateField('skills', skills)}
            placeholder="e.g., HVAC, Roofing, Solar..."
            error={errors?.skills}
          />
        </div>
      </div>
    </div>
  );
}
