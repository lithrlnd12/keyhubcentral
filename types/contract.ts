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

  // Acknowledgments
  leadHazardInitials: string;  // Initials for lead hazard disclosure
}

// Individual signature data
export interface ContractSignature {
  name: string;
  signatureUrl: string;  // Firebase Storage URL
  signedAt: Date;
}

// Stored contract record
export interface SignedContract {
  id: string;
  jobId: string;
  documentType: ContractDocumentType;
  formData: ContractFormData;
  signatures: {
    salesRep: ContractSignature;
    buyer: ContractSignature;
    buyer2?: ContractSignature;  // Optional second buyer
    cancellation?: ContractSignature;  // For remodeling agreement page 2 (Notice of Cancellation)
  };
  pdfUrl: string;  // Generated PDF in Firebase Storage
  createdBy: string;  // User ID of sales rep who created
  createdAt: Timestamp;
  status: 'draft' | 'signed' | 'voided';
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
