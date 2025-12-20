'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import { getDownloadURL } from 'firebase/storage';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { StepIndicator, Step } from './StepIndicator';
import { BasicInfoStep, BasicInfoData } from './BasicInfoStep';
import { DocumentsStep, DocumentsData } from './DocumentsStep';
import { ServiceAreaStep, ServiceAreaData } from './ServiceAreaStep';
import { ReviewStep } from './ReviewStep';
import { createContractor } from '@/lib/firebase/contractors';
import { uploadContractorDocument } from '@/lib/firebase/storage';
import { useAuth } from '@/lib/hooks/useAuth';
import { Trade, Rating } from '@/types/contractor';

const steps: Step[] = [
  { id: 1, title: 'Basic Info' },
  { id: 2, title: 'Documents' },
  { id: 3, title: 'Service Area' },
  { id: 4, title: 'Review' },
];

const initialBasicInfo: BasicInfoData = {
  businessName: '',
  email: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  trades: [],
  skills: [],
};

const initialDocuments: DocumentsData = {
  w9File: null,
  w9Url: null,
  insuranceFile: null,
  insuranceUrl: null,
  insuranceCarrier: '',
  insurancePolicyNumber: '',
  insuranceExpiration: '',
  licenses: [],
};

const initialServiceArea: ServiceAreaData = {
  serviceRadius: 25,
  homeAddress: '',
};

const initialRating: Rating = {
  overall: 3.0,
  customer: 3.0,
  speed: 3.0,
  warranty: 3.0,
  internal: 3.0,
};

export function OnboardingWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [basicInfo, setBasicInfo] = useState<BasicInfoData>(initialBasicInfo);
  const [documents, setDocuments] = useState<DocumentsData>(initialDocuments);
  const [serviceArea, setServiceArea] = useState<ServiceAreaData>(initialServiceArea);
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const [basicInfoErrors, setBasicInfoErrors] = useState<
    Partial<Record<keyof BasicInfoData, string>>
  >({});
  const [documentsErrors, setDocumentsErrors] = useState<Record<string, string>>({});

  const validateBasicInfo = (): boolean => {
    const errors: Partial<Record<keyof BasicInfoData, string>> = {};

    if (!basicInfo.businessName.trim()) {
      errors.businessName = 'Business name is required';
    }
    if (!basicInfo.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(basicInfo.email)) {
      errors.email = 'Invalid email format';
    }
    if (!basicInfo.phone.trim()) {
      errors.phone = 'Phone is required';
    }
    if (!basicInfo.street.trim()) {
      errors.street = 'Street address is required';
    }
    if (!basicInfo.city.trim()) {
      errors.city = 'City is required';
    }
    if (!basicInfo.state) {
      errors.state = 'State is required';
    }
    if (!basicInfo.zip.trim()) {
      errors.zip = 'ZIP code is required';
    }
    if (basicInfo.trades.length === 0) {
      errors.trades = 'Select at least one trade';
    }

    setBasicInfoErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateDocuments = (): boolean => {
    // Documents are optional, so no validation needed
    return true;
  };

  const handleNext = () => {
    if (currentStep === 1 && !validateBasicInfo()) return;
    if (currentStep === 2 && !validateDocuments()) return;

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
    if (!agreedToTerms) {
      setError('You must agree to the terms to continue');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      // Generate a temporary userId (in real app, this might come from creating a user first)
      const tempUserId = `contractor_${Date.now()}`;

      // Upload files if present
      let w9Url = documents.w9Url;
      let insuranceUrl = documents.insuranceUrl;

      if (documents.w9File) {
        const uploadTask = uploadContractorDocument(
          tempUserId,
          documents.w9File,
          'w9'
        );
        await uploadTask;
        w9Url = await getDownloadURL(uploadTask.snapshot.ref);
      }

      if (documents.insuranceFile) {
        const uploadTask = uploadContractorDocument(
          tempUserId,
          documents.insuranceFile,
          'insurance'
        );
        await uploadTask;
        insuranceUrl = await getDownloadURL(uploadTask.snapshot.ref);
      }

      // Create contractor document
      const contractorData = {
        userId: tempUserId,
        businessName: basicInfo.businessName || null,
        address: {
          street: basicInfo.street,
          city: basicInfo.city,
          state: basicInfo.state,
          zip: basicInfo.zip,
        },
        trades: basicInfo.trades as Trade[],
        skills: basicInfo.skills,
        licenses: documents.licenses.map((lic) => ({
          type: lic.type,
          number: lic.number,
          state: lic.state,
          expiration: lic.expiration
            ? Timestamp.fromDate(new Date(lic.expiration))
            : Timestamp.now(),
        })),
        insurance: documents.insuranceCarrier
          ? {
              carrier: documents.insuranceCarrier,
              policyNumber: documents.insurancePolicyNumber,
              expiration: documents.insuranceExpiration
                ? Timestamp.fromDate(new Date(documents.insuranceExpiration))
                : Timestamp.now(),
              certificateUrl: insuranceUrl || '',
            }
          : null,
        w9Url: w9Url || null,
        achInfo: null,
        serviceRadius: serviceArea.serviceRadius,
        rating: initialRating,
        status: 'pending' as const,
      };

      await createContractor(contractorData);

      // Redirect to contractors list
      router.push('/kts');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create contractor');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <BasicInfoStep
            data={basicInfo}
            onChange={setBasicInfo}
            errors={basicInfoErrors}
          />
        );
      case 2:
        return (
          <DocumentsStep
            data={documents}
            onChange={setDocuments}
            userId="temp"
            errors={documentsErrors}
          />
        );
      case 3:
        return (
          <ServiceAreaStep
            data={{
              ...serviceArea,
              homeAddress: `${basicInfo.street}, ${basicInfo.city}, ${basicInfo.state} ${basicInfo.zip}`,
            }}
            onChange={setServiceArea}
          />
        );
      case 4:
        return (
          <ReviewStep
            basicInfo={basicInfo}
            documents={documents}
            serviceArea={serviceArea}
            agreedToTerms={agreedToTerms}
            onAgreementChange={setAgreedToTerms}
            error={error || undefined}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <StepIndicator steps={steps} currentStep={currentStep} />

      <Card>
        <CardContent className="pt-6">{renderStep()}</CardContent>
      </Card>

      <div className="flex items-center justify-between">
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
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Contractor'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
