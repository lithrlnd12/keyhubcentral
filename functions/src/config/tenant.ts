// Tenant configuration for Cloud Functions
// Mirrors lib/config/tenant.ts — to white-label, change values here and in the client config.

export type EntityKey = 'kd' | 'kts' | 'kr';

export interface EntityConfig {
  label: string;
  shortLabel: string;
}

export const tenant = {
  // Brand
  appName: 'KeyHub Central',
  shortName: 'KeyHub',
  tagline: 'Unified Business Management',
  description:
    'Unified business management for Keynote Digital, Key Trade Solutions, and Key Renovations',

  // Contact
  supportEmail: 'support@keyrenovations.com',
  noreplyEmail: 'noreply@keyhubcentral.com',
  domain: 'keyhubcentral.com',

  // Service area
  serviceArea: 'Oklahoma City Metro Area',

  // Admin notification emails
  adminEmails: ['aaron@innovativeaiconsulting.com'],

  // Firebase project
  firebaseProjectId: 'key-hub-central',

  // Business entities
  entities: {
    kd: { label: 'Keynote Digital', shortLabel: 'KD' },
    kts: { label: 'Key Trade Solutions', shortLabel: 'KTS' },
    kr: { label: 'Key Renovations', shortLabel: 'KR' },
  } as Record<EntityKey, EntityConfig>,

  // Colors (for inline styles in emails)
  colors: {
    primary: '#D4A84B',
    primaryLight: '#E5C77A',
    primaryDark: '#C9A227',
    background: '#1A1A1A',
    surface: '#2D2D2D',
  },
} as const;

// Convenience helpers
export function getEntityLabel(key: EntityKey): string {
  return tenant.entities[key].label;
}

export function getEntityFullName(entity: string): string {
  if (entity in tenant.entities) return tenant.entities[entity as EntityKey].label;
  if (entity === 'customer') return 'Customers';
  if (entity === 'subscriber') return 'Subscribers';
  if (entity === 'contractor') return 'Contractor';
  return entity;
}
