import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from './config';
import { Invoice, InvoiceStatus, InvoiceEntity, LineItem, NET_TERMS_DAYS } from '@/types/invoice';

const COLLECTION = 'invoices';

export interface InvoiceFilters {
  status?: InvoiceStatus;
  fromEntity?: InvoiceEntity['entity'];
  toEntity?: InvoiceEntity['entity'];
  search?: string;
  overdue?: boolean;
}

export async function getInvoices(filters?: InvoiceFilters): Promise<Invoice[]> {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.fromEntity) {
    constraints.unshift(where('from.entity', '==', filters.fromEntity));
  }

  if (filters?.toEntity) {
    constraints.unshift(where('to.entity', '==', filters.toEntity));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let invoices = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Invoice[];

  // Client-side filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase();
    invoices = invoices.filter(
      (inv) =>
        inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
        inv.from.name?.toLowerCase().includes(searchLower) ||
        inv.to.name?.toLowerCase().includes(searchLower)
    );
  }

  if (filters?.overdue) {
    const now = Timestamp.now();
    invoices = invoices.filter(
      (inv) => {
        if (inv.status === 'paid') return false;
        if (!inv.dueDate) return false;
        const dueMillis = typeof inv.dueDate.toMillis === 'function' ? inv.dueDate.toMillis() : 0;
        return dueMillis < now.toMillis();
      }
    );
  }

  return invoices;
}

export async function getInvoice(id: string): Promise<Invoice | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Invoice;
  }

  return null;
}

export async function getInvoicesByEntity(
  entity: InvoiceEntity['entity'],
  direction: 'from' | 'to'
): Promise<Invoice[]> {
  const q = query(
    collection(db, COLLECTION),
    where(`${direction}.entity`, '==', entity),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Invoice[];
}

export async function createInvoice(
  data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function updateInvoice(
  id: string,
  data: Partial<Omit<Invoice, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteInvoice(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export async function markInvoiceAsSent(id: string): Promise<void> {
  await updateInvoice(id, {
    status: 'sent',
    sentAt: Timestamp.now(),
  });
}

export async function markInvoiceAsPaid(id: string): Promise<void> {
  await updateInvoice(id, {
    status: 'paid',
    paidAt: Timestamp.now(),
  });
}

export function subscribeToInvoices(
  callback: (invoices: Invoice[]) => void,
  filters?: InvoiceFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];

  if (filters?.status) {
    constraints.unshift(where('status', '==', filters.status));
  }

  if (filters?.fromEntity) {
    constraints.unshift(where('from.entity', '==', filters.fromEntity));
  }

  if (filters?.toEntity) {
    constraints.unshift(where('to.entity', '==', filters.toEntity));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let invoices = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Invoice[];

    // Client-side filters
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      invoices = invoices.filter(
        (inv) =>
          inv.invoiceNumber?.toLowerCase().includes(searchLower) ||
          inv.from.name?.toLowerCase().includes(searchLower) ||
          inv.to.name?.toLowerCase().includes(searchLower)
      );
    }

    if (filters?.overdue) {
      const now = Timestamp.now();
      invoices = invoices.filter(
        (inv) => {
          if (inv.status === 'paid') return false;
          if (!inv.dueDate) return false;
          const dueMillis = typeof inv.dueDate.toMillis === 'function' ? inv.dueDate.toMillis() : 0;
          return dueMillis < now.toMillis();
        }
      );
    }

    callback(invoices);
  });
}

export function subscribeToInvoice(
  id: string,
  callback: (invoice: Invoice | null) => void
): () => void {
  const docRef = doc(db, COLLECTION, id);

  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...docSnap.data() } as Invoice);
    } else {
      callback(null);
    }
  });
}

// Generate next invoice number
export async function generateInvoiceNumber(prefix: string = 'INV'): Promise<string> {
  const year = new Date().getFullYear();
  const q = query(
    collection(db, COLLECTION),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);

  // Find the highest invoice number for this year
  let maxNumber = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    const pattern = `${prefix}-${year}-`;
    if (data.invoiceNumber?.startsWith(pattern)) {
      const num = parseInt(data.invoiceNumber.split('-')[2], 10);
      if (num > maxNumber) {
        maxNumber = num;
      }
    }
  });

  return `${prefix}-${year}-${String(maxNumber + 1).padStart(4, '0')}`;
}

// Calculate due date based on NET_TERMS_DAYS
export function calculateDueDate(fromDate?: Date): Timestamp {
  const date = fromDate || new Date();
  date.setDate(date.getDate() + NET_TERMS_DAYS);
  return Timestamp.fromDate(date);
}

// Check if invoice is overdue
export function isInvoiceOverdue(invoice: Invoice): boolean {
  if (invoice.status === 'paid') return false;
  if (!invoice.dueDate) return false;
  const dueMillis = typeof invoice.dueDate.toMillis === 'function' ? invoice.dueDate.toMillis() : 0;
  return dueMillis < Timestamp.now().toMillis();
}

// Calculate line item total
export function calculateLineItemTotal(qty: number, rate: number): number {
  return qty * rate;
}

// Calculate invoice totals
export function calculateInvoiceTotals(
  lineItems: LineItem[],
  discount: number = 0
): { subtotal: number; total: number } {
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

// Auto-invoice triggers - these will be called from other parts of the app

// Generate invoice for KTS labor when job is marked paid in full
export async function generateLaborInvoice(
  jobId: string,
  jobNumber: string,
  laborAmount: number,
  commissionAmount: number,
  contractorName: string
): Promise<string> {
  const invoiceNumber = await generateInvoiceNumber('KTS');

  const lineItems: LineItem[] = [];

  if (laborAmount > 0) {
    lineItems.push({
      description: `Labor for Job ${jobNumber}`,
      qty: 1,
      rate: laborAmount,
      total: laborAmount,
    });
  }

  if (commissionAmount > 0) {
    lineItems.push({
      description: `Sales Commission for Job ${jobNumber}`,
      qty: 1,
      rate: commissionAmount,
      total: commissionAmount,
    });
  }

  const { subtotal, total } = calculateInvoiceTotals(lineItems);

  return createInvoice({
    invoiceNumber,
    from: { entity: 'kts', name: 'Key Trade Solutions' },
    to: { entity: 'kr', name: 'Key Renovations' },
    lineItems,
    subtotal,
    discount: 0,
    total,
    status: 'draft',
    dueDate: calculateDueDate(),
    sentAt: null,
    paidAt: null,
  });
}

// Generate invoice for KD lead fee when lead is assigned to KR
export async function generateLeadFeeInvoice(
  leadId: string,
  leadSource: string,
  leadFee: number
): Promise<string> {
  const invoiceNumber = await generateInvoiceNumber('KD');

  const lineItems: LineItem[] = [
    {
      description: `Lead Fee - ${leadSource} Lead (ID: ${leadId.slice(0, 8)})`,
      qty: 1,
      rate: leadFee,
      total: leadFee,
    },
  ];

  const { subtotal, total } = calculateInvoiceTotals(lineItems);

  return createInvoice({
    invoiceNumber,
    from: { entity: 'kd', name: 'Keynote Digital' },
    to: { entity: 'kr', name: 'Key Renovations' },
    lineItems,
    subtotal,
    discount: 0,
    total,
    status: 'draft',
    dueDate: calculateDueDate(),
    sentAt: null,
    paidAt: null,
  });
}

// Generate monthly subscription invoice
export async function generateSubscriptionInvoice(
  subscriberId: string,
  subscriberName: string,
  subscriberEmail: string,
  subscriptionFee: number,
  adSpendMin: number
): Promise<string> {
  const invoiceNumber = await generateInvoiceNumber('SUB');

  const lineItems: LineItem[] = [
    {
      description: 'Monthly Subscription Fee',
      qty: 1,
      rate: subscriptionFee,
      total: subscriptionFee,
    },
    {
      description: 'Minimum Ad Spend',
      qty: 1,
      rate: adSpendMin,
      total: adSpendMin,
    },
  ];

  const { subtotal, total } = calculateInvoiceTotals(lineItems);

  return createInvoice({
    invoiceNumber,
    from: { entity: 'kd', name: 'Keynote Digital' },
    to: { entity: 'subscriber', name: subscriberName, email: subscriberEmail },
    lineItems,
    subtotal,
    discount: 0,
    total,
    status: 'draft',
    dueDate: calculateDueDate(),
    sentAt: null,
    paidAt: null,
  });
}

// Get overdue invoices for alerts
export async function getOverdueInvoices(): Promise<Invoice[]> {
  return getInvoices({ overdue: true });
}

// Get invoice stats for dashboard
export async function getInvoiceStats(): Promise<{
  totalDraft: number;
  totalSent: number;
  totalPaid: number;
  totalOverdue: number;
  amountOutstanding: number;
  amountOverdue: number;
}> {
  const invoices = await getInvoices();
  const now = Timestamp.now();

  const stats = {
    totalDraft: 0,
    totalSent: 0,
    totalPaid: 0,
    totalOverdue: 0,
    amountOutstanding: 0,
    amountOverdue: 0,
  };

  invoices.forEach((inv) => {
    switch (inv.status) {
      case 'draft':
        stats.totalDraft++;
        break;
      case 'sent':
        stats.totalSent++;
        stats.amountOutstanding += inv.total || 0;
        const dueMillis = inv.dueDate && typeof inv.dueDate.toMillis === 'function' ? inv.dueDate.toMillis() : 0;
        if (dueMillis < now.toMillis()) {
          stats.totalOverdue++;
          stats.amountOverdue += inv.total || 0;
        }
        break;
      case 'paid':
        stats.totalPaid++;
        break;
      case 'overdue':
        stats.totalOverdue++;
        stats.amountOutstanding += inv.total || 0;
        stats.amountOverdue += inv.total || 0;
        break;
    }
  });

  return stats;
}
