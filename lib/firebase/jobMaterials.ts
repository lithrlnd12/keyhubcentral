import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';
import { Job, JobMaterial, MaterialStatus } from '@/types/job';

/**
 * Generate a unique ID for a material
 */
function generateMaterialId(): string {
  return `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all materials for a job
 */
export async function getJobMaterials(jobId: string): Promise<JobMaterial[]> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  return job.materials || [];
}

/**
 * Add a material to a job
 */
export async function addJobMaterial(
  jobId: string,
  material: Omit<JobMaterial, 'id' | 'createdAt' | 'updatedAt'>
): Promise<JobMaterial> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  const existingMaterials = job.materials || [];

  const newMaterial: JobMaterial = {
    ...material,
    id: generateMaterialId(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await updateDoc(jobRef, {
    materials: [...existingMaterials, newMaterial],
    updatedAt: serverTimestamp(),
  });

  return newMaterial;
}

/**
 * Update a material in a job
 */
export async function updateJobMaterial(
  jobId: string,
  materialId: string,
  updates: Partial<Omit<JobMaterial, 'id' | 'createdAt' | 'updatedAt'>>
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  const materials = job.materials || [];

  const materialIndex = materials.findIndex((m) => m.id === materialId);
  if (materialIndex === -1) {
    throw new Error('Material not found');
  }

  const updatedMaterial: JobMaterial = {
    ...materials[materialIndex],
    ...updates,
    updatedAt: Timestamp.now(),
  };

  const updatedMaterials = [...materials];
  updatedMaterials[materialIndex] = updatedMaterial;

  await updateDoc(jobRef, {
    materials: updatedMaterials,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove a material from a job
 */
export async function removeJobMaterial(
  jobId: string,
  materialId: string
): Promise<void> {
  const jobRef = doc(db, 'jobs', jobId);
  const jobSnap = await getDoc(jobRef);

  if (!jobSnap.exists()) {
    throw new Error('Job not found');
  }

  const job = { id: jobSnap.id, ...jobSnap.data() } as Job;
  const materials = job.materials || [];

  const filteredMaterials = materials.filter((m) => m.id !== materialId);

  await updateDoc(jobRef, {
    materials: filteredMaterials,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update material status
 */
export async function updateMaterialStatus(
  jobId: string,
  materialId: string,
  status: MaterialStatus,
  additionalData?: {
    arrivalDate?: Timestamp;
    collectedBy?: string;
    actualCost?: number;
  }
): Promise<void> {
  const updates: Partial<JobMaterial> = { status };

  if (status === 'arrived' && additionalData?.arrivalDate) {
    updates.arrivalDate = additionalData.arrivalDate;
  }

  if (status === 'collected' && additionalData?.collectedBy) {
    updates.collectedBy = additionalData.collectedBy;
    updates.collectedAt = Timestamp.now();
  }

  if (additionalData?.actualCost !== undefined) {
    updates.actualCost = additionalData.actualCost;
  }

  await updateJobMaterial(jobId, materialId, updates);
}

/**
 * Mark material as arrived
 */
export async function markMaterialArrived(
  jobId: string,
  materialId: string,
  actualCost?: number
): Promise<void> {
  await updateMaterialStatus(jobId, materialId, 'arrived', {
    arrivalDate: Timestamp.now(),
    actualCost,
  });
}

/**
 * Mark material as collected
 */
export async function markMaterialCollected(
  jobId: string,
  materialId: string,
  collectedBy: string
): Promise<void> {
  await updateMaterialStatus(jobId, materialId, 'collected', {
    collectedBy,
  });
}

/**
 * Get material costs summary
 */
export interface MaterialCostSummary {
  totalEstimated: number;
  totalActual: number;
  variance: number;
  percentVariance: number;
  byStatus: Record<MaterialStatus, number>;
}

export async function getMaterialCostSummary(
  jobId: string
): Promise<MaterialCostSummary> {
  const materials = await getJobMaterials(jobId);

  const totalEstimated = materials.reduce((sum, m) => sum + m.estimatedCost * m.quantity, 0);
  const totalActual = materials.reduce(
    (sum, m) => sum + (m.actualCost || m.estimatedCost) * m.quantity,
    0
  );

  const byStatus: Record<MaterialStatus, number> = {
    pending: 0,
    ordered: 0,
    in_transit: 0,
    arrived: 0,
    collected: 0,
  };

  materials.forEach((m) => {
    byStatus[m.status] += m.estimatedCost * m.quantity;
  });

  return {
    totalEstimated,
    totalActual,
    variance: totalActual - totalEstimated,
    percentVariance: totalEstimated > 0 ? ((totalActual - totalEstimated) / totalEstimated) * 100 : 0,
    byStatus,
  };
}

/**
 * Check if all materials have arrival dates (for production → scheduled transition)
 */
export async function allMaterialsHaveArrivalDates(jobId: string): Promise<boolean> {
  const materials = await getJobMaterials(jobId);

  if (materials.length === 0) {
    return true; // No materials needed
  }

  return materials.every(
    (m) => m.expectedArrival || m.arrivalDate
  );
}

/**
 * Check if all materials are arrived or collected (for scheduled → started transition)
 */
export async function allMaterialsReady(jobId: string): Promise<boolean> {
  const materials = await getJobMaterials(jobId);

  if (materials.length === 0) {
    return true; // No materials needed
  }

  return materials.every(
    (m) => m.status === 'arrived' || m.status === 'collected'
  );
}

/**
 * Get materials that are blocking job progress
 */
export async function getBlockingMaterials(jobId: string): Promise<JobMaterial[]> {
  const materials = await getJobMaterials(jobId);

  return materials.filter(
    (m) => m.status !== 'arrived' && m.status !== 'collected'
  );
}
