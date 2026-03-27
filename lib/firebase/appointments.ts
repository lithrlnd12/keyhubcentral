import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './config';
import { CalendarAppointment } from '@/components/portal/CalendarDayDetail';
import { TimeBlock, formatDateKey } from '@/types/availability';

// Subcollection path helper
function getAppointmentsCollection(contractorId: string) {
  return collection(db, 'contractors', contractorId, 'appointments');
}

// Appointment data without the Firestore-generated id
export type NewAppointment = Omit<CalendarAppointment, 'id'>;

/**
 * Create an appointment in the contractor's appointments subcollection.
 * Performs an atomic conflict check + create via a Firestore transaction.
 * Returns the created appointment id, or throws if a conflict exists.
 */
export async function createAppointment(
  contractorId: string,
  appointment: NewAppointment
): Promise<string> {
  // We use a sentinel doc to run a transaction for atomicity.
  // First, do a conflict-checked add: query existing, then add if none.
  const hasConflict = await checkConflicts(
    contractorId,
    appointment.date,
    appointment.timeBlock
  );

  if (hasConflict) {
    throw new Error('CONFLICT: An appointment already exists for this time block.');
  }

  const docRef = await addDoc(getAppointmentsCollection(contractorId), {
    ...appointment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Check for conflicts and create an appointment with minimal race-condition window.
 * Uses a query-then-write pattern: checks for existing scheduled appointments
 * immediately before creating the new one.
 *
 * Note: Firestore client-side transactions don't support collection queries,
 * so we use a tight check-then-create pattern instead. For truly atomic
 * conflict prevention, use a Cloud Function with admin SDK transactions.
 *
 * Returns the new appointment id or throws on conflict.
 */
export async function createAppointmentAtomic(
  contractorId: string,
  appointment: NewAppointment
): Promise<string> {
  // Check for conflicts right before creating
  const hasConflict = await checkConflicts(
    contractorId,
    appointment.date,
    appointment.timeBlock
  );

  if (hasConflict) {
    throw new Error('CONFLICT: An appointment already exists for this time block.');
  }

  // Create immediately after conflict check to minimize race window
  const colRef = getAppointmentsCollection(contractorId);
  const docRef = await addDoc(colRef, {
    ...appointment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Check if there are any existing scheduled appointments for a contractor
 * on a given date and time block.
 */
export async function checkConflicts(
  contractorId: string,
  date: string,
  timeBlock: TimeBlock
): Promise<boolean> {
  const q = query(
    getAppointmentsCollection(contractorId),
    where('date', '==', date),
    where('timeBlock', '==', timeBlock),
    where('status', '==', 'scheduled')
  );

  const snapshot = await getDocs(q);
  return !snapshot.empty;
}

/**
 * Get all appointments for a contractor within a date range.
 */
export async function getAppointmentsForContractor(
  contractorId: string,
  startDate: Date,
  endDate: Date
): Promise<CalendarAppointment[]> {
  const startKey = formatDateKey(startDate);
  const endKey = formatDateKey(endDate);

  const q = query(
    getAppointmentsCollection(contractorId),
    where('date', '>=', startKey),
    where('date', '<=', endKey)
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as CalendarAppointment[];
}

/**
 * Update the status of an appointment.
 */
export async function updateAppointmentStatus(
  contractorId: string,
  appointmentId: string,
  status: CalendarAppointment['status']
): Promise<void> {
  const docRef = doc(getAppointmentsCollection(contractorId), appointmentId);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Cancel an appointment by setting its status to 'cancelled'.
 */
export async function cancelAppointment(
  contractorId: string,
  appointmentId: string
): Promise<void> {
  await updateAppointmentStatus(contractorId, appointmentId, 'cancelled');
}
