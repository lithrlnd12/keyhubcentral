import { Timestamp } from 'firebase/firestore';
import { Address, Trade, License, Insurance } from '@/types/contractor';

export function formatAddress(address: Address): string {
  const { street, city, state, zip } = address;
  return `${street}, ${city}, ${state} ${zip}`;
}

export function formatAddressShort(address: Address): string {
  return `${address.city}, ${address.state}`;
}

export const tradeLabels: Record<Trade, string> = {
  installer: 'Installer',
  sales_rep: 'Sales Rep',
  service_tech: 'Service Tech',
  pm: 'Project Manager',
};

export function formatTrades(trades: Trade[]): string {
  return trades.map((t) => tradeLabels[t]).join(', ');
}

export function formatLicense(license: License): string {
  return `${license.type} - ${license.number} (${license.state})`;
}

export function formatTimestamp(timestamp: Timestamp | null | undefined): string {
  if (!timestamp) return 'N/A';
  return timestamp.toDate().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function isExpiringSoon(
  timestamp: Timestamp | null | undefined,
  daysThreshold: number = 30
): boolean {
  if (!timestamp) return false;
  const expirationDate = timestamp.toDate();
  const now = new Date();
  const daysUntilExpiration = Math.ceil(
    (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  return daysUntilExpiration <= daysThreshold && daysUntilExpiration > 0;
}

export function isExpired(timestamp: Timestamp | null | undefined): boolean {
  if (!timestamp) return false;
  return timestamp.toDate() < new Date();
}

export function getExpirationStatus(
  timestamp: Timestamp | null | undefined
): 'valid' | 'expiring' | 'expired' {
  if (isExpired(timestamp)) return 'expired';
  if (isExpiringSoon(timestamp)) return 'expiring';
  return 'valid';
}

export function formatInsurance(insurance: Insurance | null): string {
  if (!insurance) return 'Not provided';
  return `${insurance.carrier} - ${insurance.policyNumber}`;
}

export function getServiceRadiusLabel(radius: number): string {
  return `${radius} mile${radius !== 1 ? 's' : ''}`;
}
