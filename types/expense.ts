import { Timestamp } from 'firebase/firestore';

export type ExpenseCategory =
  | 'inventory'
  | 'materials'
  | 'tools'
  | 'supplies'
  | 'equipment'
  | 'fuel'
  | 'vehicle'
  | 'marketing'
  | 'software'
  | 'office'
  | 'other';

export type ExpenseEntity = 'kd' | 'kts' | 'kr' | 'contractor';

export interface Expense {
  id: string;
  entity: ExpenseEntity;
  category: ExpenseCategory;
  description: string;
  vendor?: string;
  amount: number;
  date: Timestamp;
  receiptId?: string; // Link to receipt if applicable
  receiptImageUrl?: string;
  createdBy: string;
  createdByName: string;
  createdAt: Timestamp;
  contractorId?: string; // Owner contractor - expenses are per-contractor
}

export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    inventory: 'Inventory',
    materials: 'Materials',
    tools: 'Tools',
    supplies: 'Supplies',
    equipment: 'Equipment',
    fuel: 'Fuel',
    vehicle: 'Vehicle',
    marketing: 'Marketing',
    software: 'Software',
    office: 'Office',
    other: 'Other',
  };
  return labels[category];
}

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'inventory', label: 'Inventory' },
  { value: 'materials', label: 'Materials' },
  { value: 'tools', label: 'Tools' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'equipment', label: 'Equipment' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'software', label: 'Software' },
  { value: 'office', label: 'Office' },
  { value: 'other', label: 'Other' },
];
