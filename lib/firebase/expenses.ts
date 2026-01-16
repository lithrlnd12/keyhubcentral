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
import { Expense, ExpenseCategory, ExpenseEntity } from '@/types/expense';

const COLLECTION = 'expenses';

export interface ExpenseFilters {
  entity?: ExpenseEntity;
  category?: ExpenseCategory;
  startDate?: Date;
  endDate?: Date;
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

  if (filters?.entity) {
    constraints.unshift(where('entity', '==', filters.entity));
  }

  if (filters?.category) {
    constraints.unshift(where('category', '==', filters.category));
  }

  const q = query(collection(db, COLLECTION), ...constraints);
  const snapshot = await getDocs(q);

  let expenses = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Expense[];

  // Client-side date filtering (Firestore can only have one range filter)
  if (filters?.startDate || filters?.endDate) {
    expenses = expenses.filter((expense) => {
      const expenseDate = expense.date.toMillis();
      if (filters.startDate && expenseDate < filters.startDate.getTime()) return false;
      if (filters.endDate && expenseDate > filters.endDate.getTime()) return false;
      return true;
    });
  }

  return expenses;
}

export async function getExpense(id: string): Promise<Expense | null> {
  const docRef = doc(db, COLLECTION, id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Expense;
  }

  return null;
}

export async function createExpense(
  data: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function createExpenseFromReceipt(
  receiptId: string,
  entity: ExpenseEntity,
  category: ExpenseCategory,
  description: string,
  vendor: string | undefined,
  amount: number,
  date: Date,
  receiptImageUrl: string | undefined,
  createdBy: string,
  createdByName: string
): Promise<string> {
  const expenseId = await createExpense({
    entity,
    category,
    description,
    vendor,
    amount,
    date: Timestamp.fromDate(date),
    receiptId,
    receiptImageUrl,
    createdBy,
    createdByName,
  });

  return expenseId;
}

export async function updateExpense(
  id: string,
  data: Partial<Omit<Expense, 'id' | 'createdAt'>>
): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await updateDoc(docRef, data);
}

export async function deleteExpense(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION, id);
  await deleteDoc(docRef);
}

export function subscribeToExpenses(
  callback: (expenses: Expense[]) => void,
  filters?: ExpenseFilters
): () => void {
  const constraints: QueryConstraint[] = [orderBy('date', 'desc')];

  if (filters?.entity) {
    constraints.unshift(where('entity', '==', filters.entity));
  }

  if (filters?.category) {
    constraints.unshift(where('category', '==', filters.category));
  }

  const q = query(collection(db, COLLECTION), ...constraints);

  return onSnapshot(q, (snapshot) => {
    let expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expense[];

    // Client-side date filtering
    if (filters?.startDate || filters?.endDate) {
      expenses = expenses.filter((expense) => {
        const expenseDate = expense.date.toMillis();
        if (filters.startDate && expenseDate < filters.startDate.getTime()) return false;
        if (filters.endDate && expenseDate > filters.endDate.getTime()) return false;
        return true;
      });
    }

    callback(expenses);
  });
}

// Get expenses for P&L calculation
export async function getExpensesForPnL(
  startDate: Date,
  endDate: Date
): Promise<Expense[]> {
  return getExpenses({ startDate, endDate });
}

// Get total expenses by entity for a date range
export async function getExpenseTotalsByEntity(
  startDate: Date,
  endDate: Date
): Promise<Record<ExpenseEntity, number>> {
  const expenses = await getExpensesForPnL(startDate, endDate);

  const totals: Record<ExpenseEntity, number> = {
    kd: 0,
    kts: 0,
    kr: 0,
    contractor: 0,
  };

  expenses.forEach((expense) => {
    totals[expense.entity] += expense.amount;
  });

  return totals;
}

// ==========================================
// CONTRACTOR-SPECIFIC EXPENSE FUNCTIONS
// ==========================================

// Get expenses for a specific contractor (by contractorId)
export async function getContractorExpenses(contractorId: string): Promise<Expense[]> {
  const q = query(
    collection(db, COLLECTION),
    where('contractorId', '==', contractorId),
    orderBy('date', 'desc')
  );
  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Expense[];
}

// Subscribe to contractor's expenses in real-time (by contractorId)
export function subscribeToContractorExpenses(
  contractorId: string,
  callback: (expenses: Expense[]) => void
): () => void {
  const q = query(
    collection(db, COLLECTION),
    where('contractorId', '==', contractorId),
    orderBy('date', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Expense[];
    callback(expenses);
  });
}

// Get contractor expense stats
export async function getContractorExpenseStats(
  contractorId: string,
  startDate?: Date,
  endDate?: Date
): Promise<{
  totalExpenses: number;
  expensesByCategory: Record<string, number>;
  expenseCount: number;
}> {
  let expenses = await getContractorExpenses(contractorId);

  // Filter by date range if provided
  if (startDate || endDate) {
    expenses = expenses.filter((expense) => {
      const expenseDate = expense.date.toMillis();
      if (startDate && expenseDate < startDate.getTime()) return false;
      if (endDate && expenseDate > endDate.getTime()) return false;
      return true;
    });
  }

  const stats = {
    totalExpenses: 0,
    expensesByCategory: {} as Record<string, number>,
    expenseCount: expenses.length,
  };

  expenses.forEach((expense) => {
    stats.totalExpenses += expense.amount;
    stats.expensesByCategory[expense.category] =
      (stats.expensesByCategory[expense.category] || 0) + expense.amount;
  });

  return stats;
}

// Create expense from contractor receipt (auto-link)
export async function createContractorExpenseFromReceipt(
  receiptId: string,
  category: ExpenseCategory,
  description: string,
  vendor: string | undefined,
  amount: number,
  date: Date,
  receiptImageUrl: string | undefined,
  contractorId: string,
  contractorName: string
): Promise<string> {
  return createExpense({
    entity: 'contractor',
    category,
    description,
    vendor,
    amount,
    date: Timestamp.fromDate(date),
    receiptId,
    receiptImageUrl,
    createdBy: contractorId,
    createdByName: contractorName,
    contractorId: contractorId, // Owner contractor - expenses are per-contractor
  });
}
