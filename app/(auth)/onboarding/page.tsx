'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { getDownloadURL } from 'firebase/storage';
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  MapPin,
  Navigation,
  Wrench,
  FileText,
  CheckCircle,
} from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { uploadUserDocument } from '@/lib/firebase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { UserRole } from '@/types/user';
import { SPECIALTIES } from '@/types/contractor';
import { Button, Input, Select, Card, CardContent, Slider, MultiSelect, TagInput, FileUpload } from '@/components/ui';
import { StepIndicator, Step } from '@/components/contractors/onboarding/StepIndicator';
import { TerritoryMap } from '@/components/maps/TerritoryMap';
import { geocodeAddress, buildAddressString } from '@/lib/utils/geocoding';

// Which fields are required per role
const ROLE_CONFIG: Record<string, {
  locationRequired: boolean;
  travelRequired: boolean;
  travelVisible: boolean;
  specialtiesRequired: boolean;
  documentsRequired: boolean;
  documentsVisible: boolean;
  documentsLabel: string;
}> = {
  contractor: {
    locationRequired: true,
    travelRequired: true,
    travelVisible: true,
    specialtiesRequired: true,
    documentsRequired: true,
    documentsVisible: true,
    documentsLabel: 'Upload your W-9 and insurance certificate to get started.',
  },
  sales_rep: {
    locationRequired: true,
    travelRequired: true,
    travelVisible: true,
    specialtiesRequired: true,
    documentsRequired: true,
    documentsVisible: true,
    documentsLabel: 'Upload your W-9 and insurance certificate to get started.',
  },
  pm: {
    locationRequired: true,
    travelRequired: true,
    travelVisible: true,
    specialtiesRequired: true,
    documentsRequired: true,
    documentsVisible: true,
    documentsLabel: 'Upload your W-9 and insurance certificate to get started.',
  },
  partner: {
    locationRequired: true,
    travelRequired: true,
    travelVisible: true,
    specialtiesRequired: true,
    documentsRequired: true,
    documentsVisible: true,
    documentsLabel: 'Upload your company W-9 and insurance certificate.',
  },
  subscriber: {
    locationRequired: true,
    travelRequired: true,
    travelVisible: true,
    specialtiesRequired: true,
    documentsRequired: true,
    documentsVisible: true,
    documentsLabel: 'Upload your W-9 and insurance certificate.',
  },
  customer: {
    locationRequired: true,
    travelRequired: false,
    travelVisible: false,
    specialtiesRequired: true,
    documentsRequired: false,
    documentsVisible: false,
    documentsLabel: '',
  },
  admin: {
    locationRequired: false,
    travelRequired: false,
    travelVisible: false,
    specialtiesRequired: false,
    documentsRequired: false,
    documentsVisible: false,
    documentsLabel: '',
  },
  owner: {
    locationRequired: false,
    travelRequired: false,
    travelVisible: false,
    specialtiesRequired: false,
    documentsRequired: false,
    documentsVisible: false,
    documentsLabel: '',
  },
};

const US_STATES = [
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' }, { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' }, { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' }, { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' }, { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' }, { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' }, { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' }, { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' }, { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' },
];

const SPECIALTY_OPTIONS = SPECIALTIES.map((s) => ({ value: s, label: s }));

// Step keys for mapping dynamic steps
type StepKey = 'location' | 'travel' | 'skills' | 'documents' | 'review';

function getStepsForRole(role: string): { steps: Step[]; keys: StepKey[] } {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const steps: Step[] = [];
  const keys: StepKey[] = [];
  let id = 1;

  steps.push({ id: id++, title: 'Location' });
  keys.push('location');

  if (cfg.travelVisible) {
    steps.push({ id: id++, title: 'Travel Distance' });
    keys.push('travel');
  }

  steps.push({ id: id++, title: 'Skills & Specialties' });
  keys.push('skills');

  if (cfg.documentsVisible) {
    steps.push({ id: id++, title: 'Documents' });
    keys.push('documents');
  }

  steps.push({ id: id++, title: 'Review' });
  keys.push('review');

  return { steps, keys };
}

function getRedirectForRole(role: UserRole): string {
  switch (role) {
    case 'customer': return '/customer/dashboard';
    case 'contractor': return '/portal';
    case 'subscriber': return '/subscriber';
    case 'partner': return '/partner';
    default: return '/overview';
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [travelDistance, setTravelDistance] = useState(25);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [w9File, setW9File] = useState<File | null>(null);
  const [insuranceFile, setInsuranceFile] = useState<File | null>(null);
  const [insuranceCarrier, setInsuranceCarrier] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceExpiration, setInsuranceExpiration] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);

  const role = user?.role || 'pending';
  const config = ROLE_CONFIG[role] || ROLE_CONFIG.admin;
  const { steps, keys } = getStepsForRole(role);
  const currentKey = keys[currentStep - 1];

  // Geocode address when leaving location step
  useEffect(() => {
    if (currentKey === 'travel' && street && city && state && zip && !mapCenter) {
      const addrStr = buildAddressString({ street, city, state, zip });
      if (addrStr) {
        geocodeAddress(addrStr).then((result) => {
          if (result) setMapCenter({ lat: result.lat, lng: result.lng });
        });
      }
    }
  }, [currentKey, street, city, state, zip, mapCenter]);

  // Pre-fill from existing user data
  useEffect(() => {
    if (user) {
      if (user.serviceAddress) {
        setStreet(user.serviceAddress.street || '');
        setCity(user.serviceAddress.city || '');
        setState(user.serviceAddress.state || '');
        setZip(user.serviceAddress.zip || '');
      }
      if (user.onboardingData?.address) {
        setStreet(user.onboardingData.address.street || '');
        setCity(user.onboardingData.address.city || '');
        setState(user.onboardingData.address.state || '');
        setZip(user.onboardingData.address.zip || '');
      }
    }
  }, [user]);

  // Redirect if already onboarded or not authenticated
  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.status === 'pending') {
        router.push('/pending');
      } else if (user.onboardingComplete) {
        router.push(getRedirectForRole(user.role));
      }
    }
  }, [user, loading, router]);

  const validateCurrentStep = (): boolean => {
    const errors: Record<string, string> = {};
    const key = keys[currentStep - 1];

    if (key === 'location' && config.locationRequired) {
      if (!street.trim()) errors.street = 'Street address is required';
      if (!city.trim()) errors.city = 'City is required';
      if (!state) errors.state = 'State is required';
      if (!zip.trim()) errors.zip = 'ZIP code is required';
      else if (!/^\d{5}$/.test(zip)) errors.zip = 'Enter a valid 5-digit ZIP';
    }

    if (key === 'skills' && config.specialtiesRequired) {
      if (specialties.length === 0) errors.specialties = 'Select at least one specialty';
    }

    if (key === 'documents' && config.documentsRequired) {
      if (!w9File) errors.w9 = 'W-9 is required';
      if (!insuranceFile) errors.insurance = 'Insurance certificate is required';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (!validateCurrentStep()) return;
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.uid) return;

    setSubmitting(true);
    setError(null);

    try {
      let w9Url: string | null = null;
      let insuranceUrl: string | null = null;

      // Upload W-9 if provided
      if (w9File) {
        const uploadTask = uploadUserDocument(user.uid, w9File, 'w9');
        await uploadTask;
        w9Url = await getDownloadURL(uploadTask.snapshot.ref);
      }

      // Upload insurance if provided
      if (insuranceFile) {
        const uploadTask = uploadUserDocument(user.uid, insuranceFile, 'insurance');
        await uploadTask;
        insuranceUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      // Geocode address if we don't have coordinates yet
      let coordinates = mapCenter;
      if (!coordinates && street) {
        const addrStr = buildAddressString({ street, city, state, zip });
        if (addrStr) {
          const result = await geocodeAddress(addrStr);
          if (result) coordinates = { lat: result.lat, lng: result.lng };
        }
      }

      // Update user profile
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        onboardingComplete: true,
        onboardingData: {
          address: street ? { street, city, state, zip } : null,
          travelDistance: travelDistance || null,
          specialties: specialties.length > 0 ? specialties : null,
          skills: skills.length > 0 ? skills : null,
          w9Url,
          insuranceUrl,
          insuranceCarrier: insuranceCarrier || null,
          insurancePolicyNumber: insurancePolicyNumber || null,
          insuranceExpiration: insuranceExpiration || null,
        },
        // Also update serviceAddress for customers or baseZipCode for location-aware roles
        ...(role === 'customer' && street ? {
          serviceAddress: { street, city, state, zip },
        } : {}),
        ...(zip ? { baseZipCode: zip } : {}),
        ...(coordinates ? { baseCoordinates: coordinates } : {}),
      });

      router.push(getRedirectForRole(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to complete onboarding');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !user || user.status !== 'active') {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-brand-gold animate-spin" />
      </div>
    );
  }

  const renderLocationStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <MapPin className="w-5 h-5 text-brand-gold" />
        <h2 className="text-lg font-semibold text-white">Your Location</h2>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {config.locationRequired
          ? 'Enter your primary address. This helps us connect you with nearby opportunities.'
          : 'Optionally enter your location to help with local features.'}
      </p>

      <Input
        label="Street Address"
        placeholder="123 Main St"
        value={street}
        onChange={(e) => setStreet(e.target.value)}
        required={config.locationRequired}
        error={fieldErrors.street}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="City"
          placeholder="Oklahoma City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required={config.locationRequired}
          error={fieldErrors.city}
        />
        <Select
          label="State"
          options={US_STATES}
          value={state}
          onChange={(e) => setState(e.target.value)}
          placeholder="Select state..."
          error={fieldErrors.state}
        />
      </div>

      <Input
        label="ZIP Code"
        placeholder="73012"
        value={zip}
        onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
        maxLength={5}
        required={config.locationRequired}
        error={fieldErrors.zip}
      />
    </div>
  );

  const renderTravelStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Navigation className="w-5 h-5 text-brand-gold" />
        <h2 className="text-lg font-semibold text-white">Travel Distance</h2>
      </div>
      <p className="text-gray-400 text-sm mb-6">
        {config.travelRequired
          ? 'How far are you willing to travel for work?'
          : 'Optionally set your preferred travel radius.'}
      </p>

      <Slider
        label="Maximum Travel Distance"
        value={travelDistance}
        onChange={setTravelDistance}
        min={5}
        max={200}
        step={5}
        formatValue={(v) => `${v} miles`}
      />

      {/* Live map preview */}
      {mapCenter && (
        <TerritoryMap
          center={mapCenter}
          radius={travelDistance}
          className="h-[300px] mt-4"
          interactive={false}
        />
      )}

      <div className="mt-4 bg-brand-black/50 rounded-lg p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Service radius</span>
          <span className="text-brand-gold font-medium">{travelDistance} miles</span>
        </div>
        {street && (
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="text-gray-400">From</span>
            <span className="text-gray-300">{city ? `${city}, ${state}` : 'Your location'}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderSkillsStep = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Wrench className="w-5 h-5 text-brand-gold" />
        <h2 className="text-lg font-semibold text-white">Skills & Specialties</h2>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {role === 'customer'
          ? 'What type of work do you need done?'
          : role === 'subscriber'
            ? 'What services do you market?'
            : 'Select your areas of expertise.'}
      </p>

      <MultiSelect
        label={role === 'customer' ? 'Services Needed' : 'Specialties'}
        options={SPECIALTY_OPTIONS}
        value={specialties}
        onChange={setSpecialties}
        placeholder="Select specialties..."
        error={fieldErrors.specialties}
      />

      <TagInput
        label={role === 'customer' ? 'Additional Details' : 'Additional Skills'}
        value={skills}
        onChange={setSkills}
        placeholder="Type and press Enter..."
      />
    </div>
  );

  const renderDocumentsStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="w-5 h-5 text-brand-gold" />
        <h2 className="text-lg font-semibold text-white">Documents</h2>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        {config.documentsLabel}
        {!config.documentsRequired && ' (Optional)'}
      </p>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          W-9 Form {config.documentsRequired && <span className="text-red-400">*</span>}
        </h3>
        <FileUpload
          accept=".pdf,.jpg,.jpeg,.png"
          maxSize={10}
          onFileSelect={(file) => setW9File(file)}
          currentFile={w9File ? { name: w9File.name } : null}
          onRemove={() => setW9File(null)}
          error={fieldErrors.w9}
        />
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-300 mb-2">
          Insurance Certificate {config.documentsRequired && <span className="text-red-400">*</span>}
        </h3>
        <FileUpload
          accept=".pdf,.jpg,.jpeg,.png"
          maxSize={10}
          onFileSelect={(file) => setInsuranceFile(file)}
          currentFile={insuranceFile ? { name: insuranceFile.name } : null}
          onRemove={() => setInsuranceFile(null)}
          error={fieldErrors.insurance}
        />
      </div>

      {insuranceFile && (
        <div className="space-y-4 border-t border-gray-800 pt-4">
          <h3 className="text-sm font-medium text-gray-300">Insurance Details (Optional)</h3>
          <Input
            label="Insurance Carrier"
            placeholder="State Farm, Allstate, etc."
            value={insuranceCarrier}
            onChange={(e) => setInsuranceCarrier(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Policy Number"
              placeholder="POL-123456"
              value={insurancePolicyNumber}
              onChange={(e) => setInsurancePolicyNumber(e.target.value)}
            />
            <Input
              label="Expiration Date"
              type="date"
              value={insuranceExpiration}
              onChange={(e) => setInsuranceExpiration(e.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderReviewStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle className="w-5 h-5 text-brand-gold" />
        <h2 className="text-lg font-semibold text-white">Review & Complete</h2>
      </div>
      <p className="text-gray-400 text-sm mb-4">
        Review your information before completing setup.
      </p>

      {/* Location Summary */}
      {street && (
        <div className="bg-brand-black/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Location</h3>
          <p className="text-white text-sm">{street}</p>
          <p className="text-white text-sm">{city}, {state} {zip}</p>
        </div>
      )}

      {/* Travel Distance Summary */}
      {config.travelVisible && travelDistance > 0 && (
        <div className="bg-brand-black/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Travel Distance</h3>
          <p className="text-white text-sm">{travelDistance} miles</p>
        </div>
      )}

      {/* Specialties Summary */}
      {specialties.length > 0 && (
        <div className="bg-brand-black/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Specialties</h3>
          <div className="flex flex-wrap gap-2">
            {specialties.map((s) => (
              <span key={s} className="px-2 py-1 bg-brand-gold/10 text-brand-gold text-xs rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Skills Summary */}
      {skills.length > 0 && (
        <div className="bg-brand-black/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Skills</h3>
          <div className="flex flex-wrap gap-2">
            {skills.map((s) => (
              <span key={s} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Documents Summary */}
      {config.documentsVisible && (
        <div className="bg-brand-black/50 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Documents</h3>
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm">
              {w9File ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600" />
              )}
              <span className={w9File ? 'text-white' : 'text-gray-500'}>
                W-9 {w9File ? `- ${w9File.name}` : '- Not uploaded'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              {insuranceFile ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border border-gray-600" />
              )}
              <span className={insuranceFile ? 'text-white' : 'text-gray-500'}>
                Insurance {insuranceFile ? `- ${insuranceFile.name}` : '- Not uploaded'}
              </span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );

  const renderStep = () => {
    switch (currentKey) {
      case 'location': return renderLocationStep();
      case 'travel': return renderTravelStep();
      case 'skills': return renderSkillsStep();
      case 'documents': return renderDocumentsStep();
      case 'review': return renderReviewStep();
      default: return null;
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-white">Welcome, {user.displayName}!</h1>
        <p className="text-gray-400 mt-1">Let&apos;s set up your profile to get you started.</p>
      </div>

      <StepIndicator steps={steps} currentStep={currentStep} className="mb-6" />

      <Card>
        <CardContent className="pt-6">
          {renderStep()}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={handleBack}
          disabled={currentStep === 1 || submitting}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        {currentStep < steps.length ? (
          <Button onClick={handleNext}>
            {!config.locationRequired && currentKey === 'location' && !street ? 'Skip' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Finishing...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
