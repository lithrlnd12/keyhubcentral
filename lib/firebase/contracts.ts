import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import {
  SignedContract,
  ContractDocumentType,
  ContractFormData,
  ContractSignature,
  ContractInitials,
  ContractSource,
} from '@/types/contract';
import { SignedContractRef } from '@/types/job';
import {
  uploadContractSignature,
  uploadContractPDF,
  ContractSignatureType,
} from './storage';

const COLLECTION = 'contracts';

/**
 * Generate a unique contract ID
 */
function generateContractId(): string {
  return doc(collection(db, COLLECTION)).id;
}

/**
 * Create a new contract record (draft status)
 */
export async function createContract(
  jobId: string,
  documentType: ContractDocumentType,
  formData: ContractFormData,
  createdBy: string
): Promise<string> {
  const contractId = generateContractId();
  const contractRef = doc(db, COLLECTION, contractId);

  const contract: Omit<SignedContract, 'id'> = {
    jobId,
    documentType,
    source: 'digital',
    formData,
    signatures: {} as SignedContract['signatures'],
    electronicConsent: {
      agreed: false,
      agreedAt: new Date(),
    },
    pdfUrl: '',
    createdBy,
    createdAt: Timestamp.now(),
    status: 'draft',
  };

  await setDoc(contractRef, contract);
  return contractId;
}

/**
 * Upload a signed contract file (for paper contracts that were signed offline)
 */
export async function uploadSignedContract(
  jobId: string,
  documentType: ContractDocumentType,
  file: File,
  buyerName: string,
  createdBy: string
): Promise<{ contractId: string; pdfUrl: string }> {
  const contractId = generateContractId();
  const contractRef = doc(db, COLLECTION, contractId);

  // Upload the PDF file
  const pdfUrl = await uploadContractPDF(jobId, contractId, documentType, file);

  // Create minimal form data for uploaded contracts
  const formData: ContractFormData = {
    buyerName,
    address: { street: '', city: '', state: '', zip: '' },
    homePhone: '',
    cellPhone: '',
    email: '',
    contractDate: new Date(),
    estimatedStartDate: null,
    estimatedCompletionTime: '',
    purchasePrice: 0,
    downPayment: 0,
    balanceDue: 0,
    paymentMethods: [],
    leadHazardInitials: '',
  };

  const contract: Omit<SignedContract, 'id'> = {
    jobId,
    documentType,
    source: 'uploaded',
    formData,
    signatures: {
      salesRep: { name: '', signatureUrl: '', signedAt: new Date() },
      buyer: { name: buyerName, signatureUrl: '', signedAt: new Date() },
    },
    electronicConsent: {
      agreed: false,
      agreedAt: new Date(),
    },
    pdfUrl,
    createdBy,
    createdAt: Timestamp.now(),
    status: 'signed',
    uploadedFileName: file.name,
  };

  await setDoc(contractRef, contract);

  // Update job with signed contract reference
  const jobRef = doc(db, 'jobs', jobId);
  const fieldPath = documentType === 'remodeling_agreement'
    ? 'documents.signedContracts.remodelingAgreement'
    : 'documents.signedContracts.disclosureStatement';

  const signedContractRef: SignedContractRef = {
    contractId,
    pdfUrl,
    signedAt: Timestamp.now(),
  };

  await updateDoc(jobRef, {
    [fieldPath]: signedContractRef,
    updatedAt: serverTimestamp(),
  });

  return { contractId, pdfUrl };
}

/**
 * Get a contract by ID
 */
export async function getContract(contractId: string): Promise<SignedContract | null> {
  const contractRef = doc(db, COLLECTION, contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    return null;
  }

  return { id: contractSnap.id, ...contractSnap.data() } as SignedContract;
}

/**
 * Get all contracts for a job
 */
export async function getJobContracts(jobId: string): Promise<SignedContract[]> {
  const q = query(
    collection(db, COLLECTION),
    where('jobId', '==', jobId),
    orderBy('createdAt', 'desc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as SignedContract[];
}

/**
 * Save signatures and update contract status to signed
 */
export interface SignatureData {
  salesRepSignature: string;  // Data URL
  salesRepName: string;
  buyerSignature: string;  // Data URL
  buyerName: string;
  buyer2Signature?: string;  // Data URL (optional)
  buyer2Name?: string;
  cancellationSignature?: string;  // Data URL (for remodeling agreement)
  // Initials for acknowledgments
  leadHazardInitials?: string;  // Data URL
  termsAcknowledgmentInitials?: string;  // Data URL
  // Electronic consent
  electronicConsent: {
    agreed: boolean;
    agreedAt: Date;
  };
}

export async function saveContractSignatures(
  jobId: string,
  contractId: string,
  signatureData: SignatureData,
  pdfBlob: Blob,
  documentType: ContractDocumentType
): Promise<{ pdfUrl: string }> {
  const contractRef = doc(db, COLLECTION, contractId);
  const contractSnap = await getDoc(contractRef);

  if (!contractSnap.exists()) {
    throw new Error('Contract not found');
  }

  const now = new Date();

  // Upload all signatures in parallel
  const uploadPromises: Promise<{ type: ContractSignatureType; url: string }>[] = [
    uploadContractSignature(jobId, contractId, 'salesrep', signatureData.salesRepSignature)
      .then((url) => ({ type: 'salesrep' as ContractSignatureType, url })),
    uploadContractSignature(jobId, contractId, 'buyer1', signatureData.buyerSignature)
      .then((url) => ({ type: 'buyer1' as ContractSignatureType, url })),
  ];

  if (signatureData.buyer2Signature && signatureData.buyer2Name) {
    uploadPromises.push(
      uploadContractSignature(jobId, contractId, 'buyer2', signatureData.buyer2Signature)
        .then((url) => ({ type: 'buyer2' as ContractSignatureType, url }))
    );
  }

  if (signatureData.cancellationSignature) {
    uploadPromises.push(
      uploadContractSignature(jobId, contractId, 'cancellation', signatureData.cancellationSignature)
        .then((url) => ({ type: 'cancellation' as ContractSignatureType, url }))
    );
  }

  // Upload initials
  if (signatureData.leadHazardInitials) {
    uploadPromises.push(
      uploadContractSignature(jobId, contractId, 'initials_lead', signatureData.leadHazardInitials)
        .then((url) => ({ type: 'initials_lead' as ContractSignatureType, url }))
    );
  }

  if (signatureData.termsAcknowledgmentInitials) {
    uploadPromises.push(
      uploadContractSignature(jobId, contractId, 'initials_terms', signatureData.termsAcknowledgmentInitials)
        .then((url) => ({ type: 'initials_terms' as ContractSignatureType, url }))
    );
  }

  const signatureResults = await Promise.all(uploadPromises);

  // Build signatures object
  const signatures: SignedContract['signatures'] = {
    salesRep: {
      name: signatureData.salesRepName,
      signatureUrl: signatureResults.find((r) => r.type === 'salesrep')!.url,
      signedAt: now,
    },
    buyer: {
      name: signatureData.buyerName,
      signatureUrl: signatureResults.find((r) => r.type === 'buyer1')!.url,
      signedAt: now,
    },
  };

  const buyer2Result = signatureResults.find((r) => r.type === 'buyer2');
  if (buyer2Result && signatureData.buyer2Name) {
    signatures.buyer2 = {
      name: signatureData.buyer2Name,
      signatureUrl: buyer2Result.url,
      signedAt: now,
    };
  }

  const cancellationResult = signatureResults.find((r) => r.type === 'cancellation');
  if (cancellationResult) {
    signatures.cancellation = {
      name: signatureData.buyerName,  // Customer signs cancellation notice
      signatureUrl: cancellationResult.url,
      signedAt: now,
    };
  }

  // Build initials object
  const initials: SignedContract['initials'] = {};
  const leadHazardResult = signatureResults.find((r) => r.type === 'initials_lead');
  if (leadHazardResult) {
    initials.leadHazard = {
      initialsUrl: leadHazardResult.url,
      signedAt: now,
    };
  }
  const termsResult = signatureResults.find((r) => r.type === 'initials_terms');
  if (termsResult) {
    initials.termsAcknowledgment = {
      initialsUrl: termsResult.url,
      signedAt: now,
    };
  }

  // Upload PDF
  const pdfUrl = await uploadContractPDF(jobId, contractId, documentType, pdfBlob);

  // Update contract with signatures, initials, consent, and PDF
  await updateDoc(contractRef, {
    signatures,
    initials: Object.keys(initials).length > 0 ? initials : null,
    electronicConsent: {
      agreed: signatureData.electronicConsent.agreed,
      agreedAt: signatureData.electronicConsent.agreedAt,
    },
    source: 'digital',
    pdfUrl,
    status: 'signed',
    updatedAt: serverTimestamp(),
  });

  // Update job with signed contract reference
  const jobRef = doc(db, 'jobs', jobId);
  const fieldPath = documentType === 'remodeling_agreement'
    ? 'documents.signedContracts.remodelingAgreement'
    : 'documents.signedContracts.disclosureStatement';

  const signedContractRef: SignedContractRef = {
    contractId,
    pdfUrl,
    signedAt: Timestamp.now(),
  };

  await updateDoc(jobRef, {
    [fieldPath]: signedContractRef,
    updatedAt: serverTimestamp(),
  });

  return { pdfUrl };
}

/**
 * Void a contract (soft delete)
 */
export async function voidContract(contractId: string): Promise<void> {
  const contractRef = doc(db, COLLECTION, contractId);
  await updateDoc(contractRef, {
    status: 'voided',
    updatedAt: serverTimestamp(),
  });
}

/**
 * Check if a job has a signed contract of a specific type
 */
export async function hasSignedContract(
  jobId: string,
  documentType: ContractDocumentType
): Promise<boolean> {
  const q = query(
    collection(db, COLLECTION),
    where('jobId', '==', jobId),
    where('documentType', '==', documentType),
    where('status', '==', 'signed')
  );

  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

/**
 * Get signed contracts summary for a job
 */
export interface ContractSummary {
  hasRemodelingAgreement: boolean;
  hasDisclosureStatement: boolean;
  contracts: SignedContract[];
}

export async function getContractSummary(jobId: string): Promise<ContractSummary> {
  const contracts = await getJobContracts(jobId);
  const signedContracts = contracts.filter((c) => c.status === 'signed');

  return {
    hasRemodelingAgreement: signedContracts.some((c) => c.documentType === 'remodeling_agreement'),
    hasDisclosureStatement: signedContracts.some((c) => c.documentType === 'disclosure_statement'),
    contracts: signedContracts,
  };
}
