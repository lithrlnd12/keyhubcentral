import { Timestamp } from 'firebase/firestore';

// Contract document types
export type ContractDocumentType = 'remodeling_agreement' | 'disclosure_statement';

// Payment methods for contracts
export type ContractPaymentMethod = 'cash' | 'check' | 'card' | 'financing' | 'other';

// Contract form data - filled during signing process
export interface ContractFormData {
  // Customer Info (auto-filled from job)
  buyerName: string;
  buyerName2?: string;  // Optional second buyer
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  homePhone: string;
  cellPhone: string;
  email: string;

  // Project Details (sales rep fills)
  contractDate: Date;
  estimatedStartDate: Date | null;
  estimatedCompletionTime: string;  // e.g., "3-4 weeks"
  purchasePrice: number;
  downPayment: number;
  balanceDue: number;
  paymentMethods: ContractPaymentMethod[];
  otherPaymentMethod?: string;  // If "other" is selected

  // Acknowledgments (legacy - kept for backwards compatibility)
  leadHazardInitials: string;  // Typed initials for lead hazard disclosure
}

// Initials signature data (drawn initials captured as images)
export interface ContractInitials {
  initialsUrl: string;  // Firebase Storage URL for initials image
  signedAt: Date;
}

// Individual signature data
export interface ContractSignature {
  name: string;
  signatureUrl: string;  // Firebase Storage URL
  signedAt: Date;
}

// Contract source type - digital (signed in app) or uploaded (paper contract scanned)
export type ContractSource = 'digital' | 'uploaded';

// Stored contract record
export interface SignedContract {
  id: string;
  jobId: string;
  documentType: ContractDocumentType;
  source: ContractSource;  // How the contract was collected
  formData: ContractFormData;
  signatures: {
    salesRep: ContractSignature;
    buyer: ContractSignature;
    buyer2?: ContractSignature;  // Optional second buyer
    cancellation?: ContractSignature;  // For remodeling agreement page 2 (Notice of Cancellation)
  };
  // Drawn initials for acknowledgments
  initials?: {
    leadHazard?: ContractInitials;  // Lead hazard disclosure (Page 1)
    termsAcknowledgment?: ContractInitials;  // Terms acknowledgment (Page 5)
  };
  // Electronic signing consent (only for digital contracts)
  electronicConsent: {
    agreed: boolean;
    agreedAt: Date;
    ipAddress?: string;
    userAgent?: string;
  };
  pdfUrl: string;  // Generated or uploaded PDF in Firebase Storage
  createdBy: string;  // User ID of sales rep who created
  createdAt: Timestamp;
  status: 'draft' | 'signed' | 'voided';
  // Email tracking
  emailedTo?: string;  // Customer email if sent
  emailedAt?: Timestamp;
  // Upload metadata (only for uploaded contracts)
  uploadedFileName?: string;
}

// Reference stored in job.documents.signedContracts
export interface SignedContractReference {
  contractId: string;
  pdfUrl: string;
  signedAt: Timestamp;
}

// Contract document type labels for UI
export const CONTRACT_TYPE_LABELS: Record<ContractDocumentType, string> = {
  remodeling_agreement: 'Custom Remodeling Agreement',
  disclosure_statement: 'Disclosure Statement',
};

// Contract status labels
export const CONTRACT_STATUS_LABELS: Record<SignedContract['status'], string> = {
  draft: 'Draft',
  signed: 'Signed',
  voided: 'Voided',
};

// Payment method labels
export const PAYMENT_METHOD_LABELS: Record<ContractPaymentMethod, string> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Credit/Debit Card',
  financing: 'Financing',
  other: 'Other',
};
