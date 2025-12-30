'use client';

import { useState, useCallback } from 'react';
import { Plus, Trash2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { FileUpload } from '@/components/ui/FileUpload';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PDFViewerButton } from '@/components/ui/PDFViewer';
import {
  extractTextFromPDF,
  parseW9,
  parseInsuranceCertificate,
} from '@/lib/utils/pdfParser';

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

export interface ParsedContractorInfo {
  name: string | null;
  businessName: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  taxClassification: string | null;
}

interface DocumentsStepWithParsingProps {
  data: DocumentsData;
  onChange: (data: DocumentsData) => void;
  onParsedInfoChange?: (info: ParsedContractorInfo) => void;
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

interface ParseStatus {
  parsing: boolean;
  success: boolean | null;
  error: string | null;
}

export function DocumentsStepWithParsing({
  data,
  onChange,
  onParsedInfoChange,
  userId,
  errors,
}: DocumentsStepWithParsingProps) {
  const [w9ParseStatus, setW9ParseStatus] = useState<ParseStatus>({
    parsing: false,
    success: null,
    error: null,
  });
  const [insuranceParseStatus, setInsuranceParseStatus] = useState<ParseStatus>({
    parsing: false,
    success: null,
    error: null,
  });
  const [w9ObjectUrl, setW9ObjectUrl] = useState<string | null>(null);
  const [insuranceObjectUrl, setInsuranceObjectUrl] = useState<string | null>(null);

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

  const handleW9Select = useCallback(
    async (file: File) => {
      onChange({ ...data, w9File: file });

      // Create object URL for viewing
      const objectUrl = URL.createObjectURL(file);
      setW9ObjectUrl(objectUrl);

      // Only parse PDFs
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setW9ParseStatus({ parsing: false, success: null, error: null });
        return;
      }

      setW9ParseStatus({ parsing: true, success: null, error: null });

      try {
        const { fullText } = await extractTextFromPDF(file);
        const parsed = parseW9(fullText);

        // Pass parsed data to parent
        if (onParsedInfoChange) {
          onParsedInfoChange({
            name: parsed.name,
            businessName: parsed.businessName,
            street: parsed.address.street,
            city: parsed.address.city,
            state: parsed.address.state,
            zip: parsed.address.zip,
            taxClassification: parsed.taxClassification,
          });
        }

        const hasData = Boolean(
          parsed.name ||
          parsed.businessName ||
          parsed.address.street ||
          parsed.address.city
        );

        setW9ParseStatus({
          parsing: false,
          success: hasData,
          error: hasData ? null : 'Could not extract data from W-9. You can enter information manually.',
        });
      } catch (err) {
        console.error('Error parsing W-9:', err);
        setW9ParseStatus({
          parsing: false,
          success: false,
          error: 'Failed to parse W-9 PDF. You can enter information manually.',
        });
      }
    },
    [data, onChange, onParsedInfoChange]
  );

  const handleInsuranceSelect = useCallback(
    async (file: File) => {
      onChange({ ...data, insuranceFile: file });

      // Create object URL for viewing
      const objectUrl = URL.createObjectURL(file);
      setInsuranceObjectUrl(objectUrl);

      // Only parse PDFs
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        setInsuranceParseStatus({ parsing: false, success: null, error: null });
        return;
      }

      setInsuranceParseStatus({ parsing: true, success: null, error: null });

      try {
        const { fullText } = await extractTextFromPDF(file);
        const parsed = parseInsuranceCertificate(fullText);

        // Auto-fill insurance details
        const updates: Partial<DocumentsData> = {};

        if (parsed.carrier) {
          updates.insuranceCarrier = parsed.carrier;
        }
        if (parsed.policyNumber) {
          updates.insurancePolicyNumber = parsed.policyNumber;
        }
        if (parsed.expirationDate) {
          // Try to convert to YYYY-MM-DD format for date input
          const expDate = parseDate(parsed.expirationDate);
          if (expDate) {
            updates.insuranceExpiration = expDate;
          }
        }

        if (Object.keys(updates).length > 0) {
          onChange({ ...data, insuranceFile: file, ...updates });
        }

        const hasData = Boolean(parsed.carrier || parsed.policyNumber || parsed.expirationDate);

        setInsuranceParseStatus({
          parsing: false,
          success: hasData,
          error: hasData
            ? null
            : 'Could not extract data from certificate. You can enter information manually.',
        });
      } catch (err) {
        console.error('Error parsing insurance certificate:', err);
        setInsuranceParseStatus({
          parsing: false,
          success: false,
          error: 'Failed to parse certificate PDF. You can enter information manually.',
        });
      }
    },
    [data, onChange]
  );

  const handleW9Remove = () => {
    updateField('w9File', null);
    updateField('w9Url', null);
    if (w9ObjectUrl) {
      URL.revokeObjectURL(w9ObjectUrl);
      setW9ObjectUrl(null);
    }
    setW9ParseStatus({ parsing: false, success: null, error: null });
  };

  const handleInsuranceRemove = () => {
    updateField('insuranceFile', null);
    updateField('insuranceUrl', null);
    if (insuranceObjectUrl) {
      URL.revokeObjectURL(insuranceObjectUrl);
      setInsuranceObjectUrl(null);
    }
    setInsuranceParseStatus({ parsing: false, success: null, error: null });
  };

  // Get the URL to use for viewing
  const w9ViewUrl = w9ObjectUrl || data.w9Url;
  const insuranceViewUrl = insuranceObjectUrl || data.insuranceUrl;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">Documents</h3>
        <p className="text-sm text-gray-400">
          Upload required documents. PDF files will be automatically parsed to extract information.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <FileUpload
            label="W-9 Form"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            maxSize={10}
            onFileSelect={handleW9Select}
            currentFile={
              data.w9File
                ? { name: data.w9File.name }
                : data.w9Url
                  ? { name: 'W-9 Document', url: data.w9Url }
                  : null
            }
            onRemove={handleW9Remove}
            error={errors?.w9}
          />
          <ParseStatusIndicator status={w9ParseStatus} documentType="W-9" />
          {w9ViewUrl && (
            <PDFViewerButton
              url={w9ViewUrl}
              title="W-9 Form"
              label="View W-9"
              className="mt-2"
            />
          )}
        </div>

        <div className="space-y-2">
          <FileUpload
            label="Insurance Certificate"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
            maxSize={10}
            onFileSelect={handleInsuranceSelect}
            currentFile={
              data.insuranceFile
                ? { name: data.insuranceFile.name }
                : data.insuranceUrl
                  ? { name: 'Insurance Certificate', url: data.insuranceUrl }
                  : null
            }
            onRemove={handleInsuranceRemove}
            error={errors?.insurance}
          />
          <ParseStatusIndicator status={insuranceParseStatus} documentType="Certificate" />
          {insuranceViewUrl && (
            <PDFViewerButton
              url={insuranceViewUrl}
              title="Insurance Certificate"
              label="View Certificate"
              className="mt-2"
            />
          )}
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">
        <h4 className="text-sm font-medium text-gray-300 mb-4">
          Insurance Details
          {insuranceParseStatus.success && (
            <span className="ml-2 text-xs text-green-400">(auto-filled from PDF)</span>
          )}
        </h4>
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

function ParseStatusIndicator({
  status,
  documentType,
}: {
  status: ParseStatus;
  documentType: string;
}) {
  if (status.parsing) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Parsing {documentType}...</span>
      </div>
    );
  }

  if (status.success === true) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-400">
        <CheckCircle className="w-4 h-4" />
        <span>Data extracted from {documentType}</span>
      </div>
    );
  }

  if (status.success === false || status.error) {
    return (
      <div className="flex items-center gap-2 text-sm text-yellow-400">
        <AlertCircle className="w-4 h-4" />
        <span>{status.error}</span>
      </div>
    );
  }

  return null;
}

// Helper to parse date strings like MM/DD/YYYY or MM-DD-YYYY to YYYY-MM-DD
function parseDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/);
  if (!match) return null;

  let [, month, day, year] = match;

  // Handle 2-digit year
  if (year.length === 2) {
    const twoDigitYear = parseInt(year, 10);
    year = (twoDigitYear > 50 ? '19' : '20') + year;
  }

  // Pad month and day
  month = month.padStart(2, '0');
  day = day.padStart(2, '0');

  return `${year}-${month}-${day}`;
}
