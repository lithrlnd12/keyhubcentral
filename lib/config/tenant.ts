// Tenant configuration — centralized brand, entity, and business constants.
// To white-label: change values here. All UI, PDFs, emails, and logic read from this file.
// AUTO-GENERATED — do not edit manually.

export type EntityKey = 'kd' | 'kts' | 'kr';

export interface EntityConfig {
  label: string;
  shortLabel: string;
}

export interface TenantConfig {
  // Brand
  appName: string;
  shortName: string;
  tagline: string;
  description: string;
  copyright: string;
  logoPath: string;
  logoIconPath: string;
  logoIconText: string;
  faviconPath: string;

  // Contact
  supportEmail: string;
  billingEmail: string;
  noreplyEmail: string;
  phone: string;
  domain: string;

  // Service area
  serviceArea: string;

  // Admin notification emails
  adminEmails: string[];

  // Google Review URL (optional — not all tenants have one)
  googleReviewUrl?: string;

  // Firebase project
  firebaseProjectId: string;

  // Business entities (the three sub-brands)
  entities: Record<EntityKey, EntityConfig>;

  // Commission rates by rating tier
  commissionRates: {
    elite: number;
    pro: number;
    standard: number;
  };

  // Rating tier thresholds (minimum overall rating for each tier)
  ratingThresholds: {
    elite: number;
    pro: number;
    standard: number;
    needsImprovement: number;
  };

  // Subscription tiers (KD module)
  subscriptionTiers: {
    starter: { monthlyFee: number; leadRange: string; adSpendMin: number };
    growth: { monthlyFee: number; leadRange: string; adSpendMin: number };
    pro: { monthlyFee: number; leadRange: string; adSpendMin: number };
  };

  // Colors (used in emails, PDFs, and inline styles — Tailwind colors are in tailwind.config.ts)
  colors: {
    primary: string;
    primaryLight: string;
    primaryDark: string;
    background: string;
    surface: string;
  };
}

export const tenant: TenantConfig = {
  // Brand
  appName: 'KeyHub Central',
  shortName: 'KeyHub',
  tagline: 'Unified Business Management',
  description:
    'Unified business management for Keynote Digital, Key Trade Solutions, and Key Renovations',
  copyright: 'KeyHub Central',
  logoPath: '/logo.png',
  logoIconPath: '/logo.svg',
  logoIconText: 'KH',
  faviconPath: '/favicon.ico',

  // Contact
  supportEmail: 'support@keyrenovations.com',
  billingEmail: 'billing@keyhubcentral.com',
  noreplyEmail: 'noreply@keyhubcentral.com',
  phone: '8127766215',
  domain: 'keyhubcentral.com',

  // Service area
  serviceArea: 'Oklahoma City Metro Area',

  // Admin notification emails
  adminEmails: ['aaron@innovativeaiconsulting.com'],

  // Google Review URL
  googleReviewUrl: 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review',

  // Firebase project
  firebaseProjectId: 'key-hub-central',

  // Business entities
  entities: {
    kd: { label: 'Leads', shortLabel: 'KD' },
    kts: { label: 'My Team', shortLabel: 'KTS' },
    kr: { label: 'Jobs', shortLabel: 'KR' },
  },

  // Commission rates
  commissionRates: {
    elite: 0.1,
    pro: 0.09,
    standard: 0.08,
  },

  // Rating thresholds
  ratingThresholds: {
    elite: 4.5,
    pro: 3.5,
    standard: 2.5,
    needsImprovement: 1.5,
  },

  // Subscription tiers
  subscriptionTiers: {
    starter: { monthlyFee: 399, leadRange: '10-15', adSpendMin: 600 },
    growth: { monthlyFee: 899, leadRange: '15-25', adSpendMin: 900 },
    pro: { monthlyFee: 1499, leadRange: 'Flexible', adSpendMin: 1500 },
  },

  // Colors (for inline styles, emails, PDFs — not Tailwind classes)
  colors: {
    primary: '#D4A84B',
    primaryLight: '#E5C77A',
    primaryDark: '#C9A227',
    background: '#1A1A1A',
    surface: '#2D2D2D',
  },
};

// Convenience helpers
export function getEntityLabel(key: EntityKey): string {
  return tenant.entities[key].label;
}

export function getEntityShortLabel(key: EntityKey): string {
  return tenant.entities[key].shortLabel;
}

export function getEntityFullName(key: string): string {
  if (key in tenant.entities) return tenant.entities[key as EntityKey].label;
  if (key === 'customer') return 'Customers';
  if (key === 'subscriber') return 'Subscribers';
  if (key === 'contractor') return 'Contractor';
  return key;
}

export function formatCommissionLabel(tier: 'elite' | 'pro' | 'standard'): string {
  const rate = tenant.commissionRates[tier];
  const pct = Math.round(rate * 100);
  const name = tier.charAt(0).toUpperCase() + tier.slice(1);
  return `${name} (${pct}%)`;
}
