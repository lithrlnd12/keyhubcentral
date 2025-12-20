'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { License } from '@/types/contractor';

export interface DocumentsData {
  w9File: File | null;
  w9Url: string | null;
  insuranceFile: File | null;
  insuranceUrl: string | null;
  insuranceCarrier: string;
  insurancePolicyNumber: string;
  insuranceExpiration: string;
  licenses: Array<{
    type: string;
    number: string;
    state: string;
    expiration: string;
  }>;
}

interface DocumentsStepProps {
  data: DocumentsData;
  onChange: (data: DocumentsData) => void;
  userId: string;
  errors?: Partial<Record<string, string>>;
}

const usStates = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export function DocumentsStep({ data, onChange, userId, errors }: DocumentsStepProps) {
  const updateField = <K extends keyof DocumentsData>(
    field: K,
    value: DocumentsData[K]
  ) => {
    onChange({ ...data, [field]: value });
  };

  const addLicense = () => {
    onChange({
      ...data,
      licenses: [
        ...data.licenses,
        { type: '', number: '', state: '', expiration: '' },
      ],
    });
  };

  const updateLicense = (index: number, field: string, value: string) => {
    const newLicenses = [...data.licenses];
    newLicenses[index] = { ...newLicenses[index], [field]: value };
    onChange({ ...data, licenses: newLicenses });
  };

  const removeLicense = (index: number) => {
    onChange({
      ...data,
      licenses: data.licenses.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Documents</h3>
        <p className="text-sm text-gray-400">
          Upload required documents and enter license information.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <FileUpload
          label="W-9 Form"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          maxSize={10}
          onFileSelect={(file) => updateField('w9File', file)}
          currentFile={
            data.w9File
              ? { name: data.w9File.name }
              : data.w9Url
                ? { name: 'W-9 Document', url: data.w9Url }
                : null
          }
          onRemove={() => {
            updateField('w9File', null);
            updateField('w9Url', null);
          }}
          error={errors?.w9}
        />

        <FileUpload
          label="Insurance Certificate"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          maxSize={10}
          onFileSelect={(file) => updateField('insuranceFile', file)}
          currentFile={
            data.insuranceFile
              ? { name: data.insuranceFile.name }
              : data.insuranceUrl
                ? { name: 'Insurance Certificate', url: data.insuranceUrl }
                : null
          }
          onRemove={() => {
            updateField('insuranceFile', null);
            updateField('insuranceUrl', null);
          }}
          error={errors?.insurance}
        />
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-4">Insurance Details</h4>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Insurance Carrier"
            value={data.insuranceCarrier}
            onChange={(e) => updateField('insuranceCarrier', e.target.value)}
            placeholder="Company name"
            error={errors?.insuranceCarrier}
          />

          <Input
            label="Policy Number"
            value={data.insurancePolicyNumber}
            onChange={(e) => updateField('insurancePolicyNumber', e.target.value)}
            placeholder="Policy #"
            error={errors?.insurancePolicyNumber}
          />

          <Input
            label="Expiration Date"
            type="date"
            value={data.insuranceExpiration}
            onChange={(e) => updateField('insuranceExpiration', e.target.value)}
            error={errors?.insuranceExpiration}
          />
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-gray-300">Licenses</h4>
          <Button type="button" variant="outline" size="sm" onClick={addLicense}>
            <Plus className="w-4 h-4 mr-1" />
            Add License
          </Button>
        </div>

        {data.licenses.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No licenses added. Click &quot;Add License&quot; to add one.
          </p>
        ) : (
          <div className="space-y-4">
            {data.licenses.map((license, index) => (
              <div
                key={index}
                className="p-4 bg-brand-charcoal rounded-lg border border-gray-800"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-sm font-medium text-gray-400">
                    License {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeLicense(index)}
                    className="text-gray-500 hover:text-red-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-4">
                  <Input
                    label="Type"
                    value={license.type}
                    onChange={(e) => updateLicense(index, 'type', e.target.value)}
                    placeholder="e.g., Contractor"
                  />
                  <Input
                    label="Number"
                    value={license.number}
                    onChange={(e) => updateLicense(index, 'number', e.target.value)}
                    placeholder="License #"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      State
                    </label>
                    <select
                      value={license.state}
                      onChange={(e) => updateLicense(index, 'state', e.target.value)}
                      className="w-full px-3 py-2 bg-brand-charcoal border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-gold"
                    >
                      <option value="">Select</option>
                      {usStates.map((state) => (
                        <option key={state} value={state}>
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Expiration"
                    type="date"
                    value={license.expiration}
                    onChange={(e) => updateLicense(index, 'expiration', e.target.value)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
