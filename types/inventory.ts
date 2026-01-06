import { Timestamp } from 'firebase/firestore';

// Inventory item categories
export type InventoryCategory = 'material' | 'tool';

// Common units of measure
export type UnitOfMeasure =
  | 'each'
  | 'box'
  | 'pack'
  | 'roll'
  | 'case'
  | 'pair'
  | 'set'
  | 'gallon'
  | 'quart'
  | 'foot'
  | 'yard'
  | 'pound'
  | 'bag'
  | 'bundle';

// Inventory item (material or tool)
export interface InventoryItem {
  id: string;
  name: string;
  sku?: string;
  category: InventoryCategory;
  description?: string;
  unitOfMeasure: UnitOfMeasure;
  parLevel: number;
  imageUrl?: string;
  manufacturer?: string;
  partNumber?: string;
  cost?: number; // Last known cost per unit
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string;
}

// Location types
export type LocationType = 'warehouse' | 'truck';

// Inventory location (warehouse or contractor truck)
export interface InventoryLocation {
  id: string;
  type: LocationType;
  name: string;
  contractorId?: string | null; // null for warehouse
  contractorName?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Stock level for an item at a location
export interface InventoryStock {
  id: string;
  itemId: string;
  itemName: string; // Denormalized for display
  locationId: string;
  locationName: string; // Denormalized for display
  quantity: number;
  parLevel: number; // Denormalized from item
  lastCounted: Timestamp;
  countedBy: string;
  countedByName: string; // Denormalized for display
}

// Individual count item in a count session
export interface InventoryCountItem {
  itemId: string;
  itemName: string;
  previousQuantity: number;
  newQuantity: number;
  parLevel: number;
  variance: number; // newQuantity - previousQuantity
}

// Inventory count session
export interface InventoryCount {
  id: string;
  locationId: string;
  locationName: string;
  countedBy: string;
  countedByName: string;
  countedAt: Timestamp;
  items: InventoryCountItem[];
  notes?: string;
  totalItems: number;
  itemsBelowPar: number;
}

// Receipt status
export type ReceiptStatus = 'pending' | 'parsing' | 'parsed' | 'verified' | 'added_to_pl' | 'error';

// Parsed receipt line item
export interface ReceiptItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  category?: InventoryCategory; // AI-suggested category
  inventoryItemId?: string; // Link to inventory if matched
  inventoryItemName?: string;
}

// Receipt record
export interface Receipt {
  id: string;
  uploadedBy: string;
  uploadedByName: string;
  uploadedAt: Timestamp;
  imageUrl: string;
  vendor?: string;
  purchaseDate?: Timestamp;
  subtotal?: number;
  tax?: number;
  total?: number;
  items: ReceiptItem[];
  status: ReceiptStatus;
  locationId?: string;
  locationName?: string;
  parsedData?: {
    vendor?: string;
    storeLocation?: string;
    date?: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }>;
    subtotal?: number;
    tax?: number;
    total?: number;
    rawResponse?: string;
  };
  errorMessage?: string;
  verifiedBy?: string;
  verifiedAt?: Timestamp;
  plExpenseId?: string; // Link to P&L expense when added
  addedToPLAt?: Timestamp;
}

// Filters for inventory queries
export interface InventoryFilters {
  category?: InventoryCategory;
  search?: string;
}

export interface StockFilters {
  locationId?: string;
  itemId?: string;
  belowPar?: boolean;
}

export interface ReceiptFilters {
  status?: ReceiptStatus;
  uploadedBy?: string;
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
}

// Stock with par variance calculation
export interface StockWithVariance extends InventoryStock {
  variance: number; // quantity - parLevel (positive = above par, negative = below)
  percentOfPar: number; // (quantity / parLevel) * 100
}

// Low stock alert
export interface LowStockAlert {
  itemId: string;
  itemName: string;
  locationId: string;
  locationName: string;
  currentQuantity: number;
  parLevel: number;
  shortage: number; // parLevel - currentQuantity
}

// Helper function to calculate variance
export function calculateVariance(quantity: number, parLevel: number): number {
  return quantity - parLevel;
}

// Helper function to calculate percent of par
export function calculatePercentOfPar(quantity: number, parLevel: number): number {
  if (parLevel === 0) return quantity > 0 ? 100 : 0;
  return Math.round((quantity / parLevel) * 100);
}

// Helper function to determine if stock is low
export function isLowStock(quantity: number, parLevel: number): boolean {
  return quantity < parLevel;
}

// Helper function to get variance display color
export function getVarianceColor(variance: number): string {
  if (variance > 0) return 'text-green-400';
  if (variance < 0) return 'text-red-400';
  return 'text-gray-400';
}

// Helper function to get variance display text
export function getVarianceDisplay(variance: number): string {
  if (variance > 0) return `+${variance}`;
  return variance.toString();
}

// Receipt status labels
export function getReceiptStatusLabel(status: ReceiptStatus): string {
  const labels: Record<ReceiptStatus, string> = {
    pending: 'Pending',
    parsing: 'Processing',
    parsed: 'Parsed',
    verified: 'Verified',
    added_to_pl: 'Added to P&L',
    error: 'Error',
  };
  return labels[status];
}

// Receipt status colors
export function getReceiptStatusColor(status: ReceiptStatus): string {
  const colors: Record<ReceiptStatus, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400',
    parsing: 'bg-blue-500/20 text-blue-400',
    parsed: 'bg-purple-500/20 text-purple-400',
    verified: 'bg-green-500/20 text-green-400',
    added_to_pl: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  };
  return colors[status];
}

// Category labels
export function getCategoryLabel(category: InventoryCategory): string {
  return category === 'material' ? 'Material' : 'Tool';
}

// Unit of measure labels
export const UNIT_OF_MEASURE_OPTIONS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'each', label: 'Each' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'roll', label: 'Roll' },
  { value: 'case', label: 'Case' },
  { value: 'pair', label: 'Pair' },
  { value: 'set', label: 'Set' },
  { value: 'gallon', label: 'Gallon' },
  { value: 'quart', label: 'Quart' },
  { value: 'foot', label: 'Foot' },
  { value: 'yard', label: 'Yard' },
  { value: 'pound', label: 'Pound' },
  { value: 'bag', label: 'Bag' },
  { value: 'bundle', label: 'Bundle' },
];
