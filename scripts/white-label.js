#!/usr/bin/env node

/**
 * White-Label Setup Script
 *
 * Usage:
 *   node scripts/white-label.js tenant.json
 *   node scripts/white-label.js --example     # Generate example JSON
 *   node scripts/white-label.js --current     # Export current config as JSON
 *
 * This script updates:
 *   - lib/config/tenant.ts          (client-side config)
 *   - functions/src/config/tenant.ts (Cloud Functions config)
 *   - app/globals.css                (CSS variables)
 *   - .firebaserc                    (Firebase project alias)
 *   - .env.local.template            (environment variable template)
 *   - public/icons/*                 (placeholder PWA icons via SVG)
 *   - scripts/setup-vapi.mjs         (VAPI webhook URL, if vapi config provided)
 *
 * After running, you still need to:
 *   1. Replace placeholder icons in /public/icons/ with real logos
 *   2. Copy .env.local.template → .env.local and fill in secrets
 *   3. Deploy (git push)
 *   4. Set up Resend (email) — verify domain or use shared sender
 *   5. Set up VAPI phone number + caller reputation (see checklist)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

// ---------- Example / current export ----------

// ---------- Admin registration (keyhub-system) ----------

async function registerTenantInAdmin(cfg) {
  // Only run if keyhub-system service account path is provided
  const adminKeyPath = cfg.adminServiceAccountPath || process.env.KEYHUB_ADMIN_SERVICE_ACCOUNT;
  if (!adminKeyPath) {
    console.log('  ⚠ No adminServiceAccountPath or KEYHUB_ADMIN_SERVICE_ACCOUNT — skipping admin registration');
    console.log('    To auto-register, add "adminServiceAccountPath" to your tenant JSON');
    return false;
  }

  try {
    const adminLib = require('firebase-admin');
    const fsLib = require('fs');

    // Init admin app for keyhub-system
    const adminKey = JSON.parse(fsLib.readFileSync(adminKeyPath, 'utf8'));
    const adminApp = adminLib.apps.find(a => a?.name === 'keyhub-admin')
      || adminLib.initializeApp({ credential: adminLib.credential.cert(adminKey) }, 'keyhub-admin');
    const adminDb = adminApp.firestore();

    // Check if tenant already exists
    const existing = await adminDb.collection('tenants')
      .where('firebaseProjectId', '==', cfg.firebaseProjectId)
      .get();

    const DEFAULT_FLAGS = {
      core: true, leadEngine: true, voiceAI: true, communications: true,
      marketplace: true, reportBuilder: true, presentationBuilder: true,
      predictiveAnalytics: true, smartScheduling: true, customerPortal: true,
      contracts: true, remoteSignature: true, financials: true,
      emailAutomation: true, webhooksAPI: true, callCenter: true,
      riskScoring: true, offlinePWA: true, inventory: true,
    };

    // Apply tier-based defaults if specified
    const flags = { ...DEFAULT_FLAGS };
    if (cfg.disabledModules && Array.isArray(cfg.disabledModules)) {
      for (const mod of cfg.disabledModules) {
        if (mod in flags && mod !== 'core') flags[mod] = false;
      }
    }

    const tenantData = {
      name: cfg.appName,
      domain: cfg.domain,
      tier: cfg.tier || 'enterprise',
      status: cfg.tenantStatus || 'onboarding',
      firebaseProjectId: cfg.firebaseProjectId,
      featureFlags: flags,
      contacts: {
        primary: {
          name: cfg.primaryContactName || cfg.adminEmails[0],
          email: cfg.primaryContactEmail || cfg.adminEmails[0],
          phone: cfg.phone || '',
        },
      },
      billing: {
        platformFee: cfg.platformFee || 0,
        perSeatFee: cfg.perSeatFee || 0,
        voiceRate: cfg.voiceRate || 0.20,
        smsRate: cfg.smsRate || 0.02,
        seatCount: cfg.seatCount || 0,
        contractStartDate: cfg.contractStartDate || new Date().toISOString().split('T')[0],
      },
      updatedAt: adminLib.firestore.FieldValue.serverTimestamp(),
    };

    // Store tenant's service account key if provided
    if (cfg.tenantServiceAccountPath) {
      tenantData.serviceAccountKey = fsLib.readFileSync(cfg.tenantServiceAccountPath, 'utf8');
    }

    if (!existing.empty) {
      // Update existing tenant
      await existing.docs[0].ref.update(tenantData);
      ok(`Updated tenant in keyhub-admin: ${cfg.appName} (${existing.docs[0].id})`);
    } else {
      // Create new tenant
      tenantData.createdAt = adminLib.firestore.FieldValue.serverTimestamp();
      const ref = await adminDb.collection('tenants').add(tenantData);
      ok(`Registered tenant in keyhub-admin: ${cfg.appName} (${ref.id})`);
    }

    return true;
  } catch (err) {
    console.error('  ⚠ Admin registration failed:', err.message);
    return false;
  }
}

async function seedFeatureFlags(cfg) {
  // Seed config/features in the TENANT's Firestore
  const tenantKeyPath = cfg.tenantServiceAccountPath;
  if (!tenantKeyPath) {
    console.log('  ⚠ No tenantServiceAccountPath — skipping feature flag seeding');
    console.log('    Run: node scripts/seed-feature-flags.js manually after setting up credentials');
    return false;
  }

  try {
    const adminLib = require('firebase-admin');
    const fsLib = require('fs');

    const tenantKey = JSON.parse(fsLib.readFileSync(tenantKeyPath, 'utf8'));
    const tenantApp = adminLib.apps.find(a => a?.name === 'tenant-seed')
      || adminLib.initializeApp({ credential: adminLib.credential.cert(tenantKey) }, 'tenant-seed');
    const tenantDb = tenantApp.firestore();

    const DEFAULT_FLAGS = {
      core: true, leadEngine: true, voiceAI: true, communications: true,
      marketplace: true, reportBuilder: true, presentationBuilder: true,
      predictiveAnalytics: true, smartScheduling: true, customerPortal: true,
      contracts: true, remoteSignature: true, financials: true,
      emailAutomation: true, webhooksAPI: true, callCenter: true,
      riskScoring: true, offlinePWA: true, inventory: true,
    };

    const flags = { ...DEFAULT_FLAGS };
    if (cfg.disabledModules && Array.isArray(cfg.disabledModules)) {
      for (const mod of cfg.disabledModules) {
        if (mod in flags && mod !== 'core') flags[mod] = false;
      }
    }

    await tenantDb.collection('config').doc('features').set(flags, { merge: true });
    ok(`Seeded config/features in tenant Firestore (${cfg.firebaseProjectId})`);
    return true;
  } catch (err) {
    console.error('  ⚠ Feature flag seeding failed:', err.message);
    return false;
  }
}

const EXAMPLE = {
  appName: 'Acme Pro',
  shortName: 'Acme',
  tagline: 'Professional Business Management',
  description: 'Unified business management for Acme companies',
  copyright: 'Acme Pro',
  logoPath: '/logo.png',
  logoIconPath: '/favicon.svg',
  logoIconText: 'AP',
  faviconPath: '/favicon.ico',
  supportEmail: 'support@acmepro.com',
  billingEmail: 'billing@acmepro.com',
  noreplyEmail: 'noreply@acmepro.com',
  fromEmail: 'noreply@acmepro.com', // Resend verified sending address
  phone: '5551234567',
  domain: 'acmepro.com',
  serviceArea: 'Dallas-Fort Worth Metro Area',
  adminEmails: ['admin@acmepro.com'],
  firebaseProjectId: 'acme-pro-12345',
  entities: {
    kd: { label: 'Acme Digital', shortLabel: 'AD' },
    kts: { label: 'Acme Trade Services', shortLabel: 'ATS' },
    kr: { label: 'Acme Renovations', shortLabel: 'AR' },
  },
  commissionRates: { elite: 0.1, pro: 0.09, standard: 0.08 },
  ratingThresholds: { elite: 4.5, pro: 3.5, standard: 2.5, needsImprovement: 1.5 },
  subscriptionTiers: {
    starter: { monthlyFee: 399, leadRange: '10-15', adSpendMin: 600 },
    growth: { monthlyFee: 899, leadRange: '15-25', adSpendMin: 900 },
    pro: { monthlyFee: 1499, leadRange: 'Flexible', adSpendMin: 1500 },
  },
  colors: {
    primary: '#3B82F6',
    primaryLight: '#60A5FA',
    primaryDark: '#2563EB',
    background: '#0F172A',
    surface: '#1E293B',
  },
  // Optional — Admin registration (keyhub-system)
  // adminServiceAccountPath: '/path/to/keyhub-system-service-account.json',
  // tenantServiceAccountPath: '/path/to/tenant-firebase-service-account.json',
  // tier: 'enterprise',          // regional | mid-market | enterprise
  // tenantStatus: 'onboarding',  // active | pilot | onboarding
  // primaryContactName: 'John Smith',
  // primaryContactEmail: 'john@acmepro.com',
  // platformFee: 8000,           // monthly
  // perSeatFee: 30,
  // voiceRate: 0.20,             // per minute
  // smsRate: 0.02,               // per message
  // seatCount: 50,
  // contractStartDate: '2026-04-01',
  // disabledModules: ['marketplace', 'predictiveAnalytics'],  // modules to turn OFF

  // Optional — VAPI AI voice config
  vapi: {
    webhookUrl: 'https://acmepro.com/api/webhooks/vapi',
    inboundAssistantId: '',
    outboundAssistantId: '',
    dispatchAssistantId: '',
    fieldAssistantId: '',
    ktsPhoneId: '',
    krPhoneId: '',
  },
};

// ---------- Helpers ----------

function die(msg) {
  console.error(`\x1b[31mError:\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function validate(cfg) {
  const required = [
    'appName', 'shortName', 'tagline', 'description', 'copyright',
    'supportEmail', 'billingEmail', 'noreplyEmail', 'phone', 'domain',
    'serviceArea', 'adminEmails', 'firebaseProjectId',
    'entities', 'commissionRates', 'ratingThresholds', 'subscriptionTiers', 'colors',
  ];

  for (const key of required) {
    if (cfg[key] === undefined) die(`Missing required field: "${key}"`);
  }

  for (const entity of ['kd', 'kts', 'kr']) {
    if (!cfg.entities[entity]?.label || !cfg.entities[entity]?.shortLabel) {
      die(`entities.${entity} must have "label" and "shortLabel"`);
    }
  }

  for (const color of ['primary', 'primaryLight', 'primaryDark', 'background', 'surface']) {
    if (!cfg.colors[color]?.match(/^#[0-9A-Fa-f]{6}$/)) {
      die(`colors.${color} must be a 6-digit hex color (e.g. "#3B82F6"), got "${cfg.colors[color]}"`);
    }
  }

  if (!Array.isArray(cfg.adminEmails) || cfg.adminEmails.length === 0) {
    die('adminEmails must be a non-empty array');
  }
}

// ---------- File generators ----------

function generateClientTenant(cfg) {
  return `// Tenant configuration — centralized brand, entity, and business constants.
// To white-label: change values here. All UI, PDFs, emails, and logic read from this file.
// AUTO-GENERATED by scripts/white-label.js — do not edit manually.

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
  appName: ${JSON.stringify(cfg.appName)},
  shortName: ${JSON.stringify(cfg.shortName)},
  tagline: ${JSON.stringify(cfg.tagline)},
  description: ${JSON.stringify(cfg.description)},
  copyright: ${JSON.stringify(cfg.copyright)},
  logoPath: ${JSON.stringify(cfg.logoPath || '/logo.png')},
  logoIconPath: ${JSON.stringify(cfg.logoIconPath || '/favicon.svg')},
  logoIconText: ${JSON.stringify(cfg.logoIconText || cfg.shortName.substring(0, 2).toUpperCase())},
  faviconPath: ${JSON.stringify(cfg.faviconPath || '/favicon.ico')},

  // Contact
  supportEmail: ${JSON.stringify(cfg.supportEmail)},
  billingEmail: ${JSON.stringify(cfg.billingEmail)},
  noreplyEmail: ${JSON.stringify(cfg.noreplyEmail)},
  phone: ${JSON.stringify(cfg.phone)},
  domain: ${JSON.stringify(cfg.domain)},

  // Service area
  serviceArea: ${JSON.stringify(cfg.serviceArea)},

  // Admin notification emails
  adminEmails: ${JSON.stringify(cfg.adminEmails)},

  // Firebase project
  firebaseProjectId: ${JSON.stringify(cfg.firebaseProjectId)},

  // Business entities
  entities: {
    kd: { label: ${JSON.stringify(cfg.entities.kd.label)}, shortLabel: ${JSON.stringify(cfg.entities.kd.shortLabel)} },
    kts: { label: ${JSON.stringify(cfg.entities.kts.label)}, shortLabel: ${JSON.stringify(cfg.entities.kts.shortLabel)} },
    kr: { label: ${JSON.stringify(cfg.entities.kr.label)}, shortLabel: ${JSON.stringify(cfg.entities.kr.shortLabel)} },
  },

  // Commission rates
  commissionRates: {
    elite: ${cfg.commissionRates.elite},
    pro: ${cfg.commissionRates.pro},
    standard: ${cfg.commissionRates.standard},
  },

  // Rating thresholds
  ratingThresholds: {
    elite: ${cfg.ratingThresholds.elite},
    pro: ${cfg.ratingThresholds.pro},
    standard: ${cfg.ratingThresholds.standard},
    needsImprovement: ${cfg.ratingThresholds.needsImprovement},
  },

  // Subscription tiers
  subscriptionTiers: {
    starter: { monthlyFee: ${cfg.subscriptionTiers.starter.monthlyFee}, leadRange: ${JSON.stringify(cfg.subscriptionTiers.starter.leadRange)}, adSpendMin: ${cfg.subscriptionTiers.starter.adSpendMin} },
    growth: { monthlyFee: ${cfg.subscriptionTiers.growth.monthlyFee}, leadRange: ${JSON.stringify(cfg.subscriptionTiers.growth.leadRange)}, adSpendMin: ${cfg.subscriptionTiers.growth.adSpendMin} },
    pro: { monthlyFee: ${cfg.subscriptionTiers.pro.monthlyFee}, leadRange: ${JSON.stringify(cfg.subscriptionTiers.pro.leadRange)}, adSpendMin: ${cfg.subscriptionTiers.pro.adSpendMin} },
  },

  // Colors (for inline styles, emails, PDFs — not Tailwind classes)
  colors: {
    primary: ${JSON.stringify(cfg.colors.primary)},
    primaryLight: ${JSON.stringify(cfg.colors.primaryLight)},
    primaryDark: ${JSON.stringify(cfg.colors.primaryDark)},
    background: ${JSON.stringify(cfg.colors.background)},
    surface: ${JSON.stringify(cfg.colors.surface)},
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
  return \`\${name} (\${pct}%)\`;
}
`;
}

function generateFunctionsTenant(cfg) {
  return `// Tenant configuration for Cloud Functions
// Mirrors lib/config/tenant.ts — to white-label, change values here and in the client config.
// AUTO-GENERATED by scripts/white-label.js — do not edit manually.

export type EntityKey = 'kd' | 'kts' | 'kr';

export interface EntityConfig {
  label: string;
  shortLabel: string;
}

export const tenant = {
  // Brand
  appName: ${JSON.stringify(cfg.appName)},
  shortName: ${JSON.stringify(cfg.shortName)},
  tagline: ${JSON.stringify(cfg.tagline)},
  description: ${JSON.stringify(cfg.description)},

  // Contact & Email
  supportEmail: ${JSON.stringify(cfg.supportEmail)},
  noreplyEmail: ${JSON.stringify(cfg.noreplyEmail)},
  fromEmail: ${JSON.stringify(cfg.fromEmail || cfg.noreplyEmail)},
  domain: ${JSON.stringify(cfg.domain)},

  // Service area
  serviceArea: ${JSON.stringify(cfg.serviceArea)},

  // Admin notification emails
  adminEmails: ${JSON.stringify(cfg.adminEmails)},

  // Firebase project
  firebaseProjectId: ${JSON.stringify(cfg.firebaseProjectId)},

  // Business entities
  entities: {
    kd: { label: ${JSON.stringify(cfg.entities.kd.label)}, shortLabel: ${JSON.stringify(cfg.entities.kd.shortLabel)} },
    kts: { label: ${JSON.stringify(cfg.entities.kts.label)}, shortLabel: ${JSON.stringify(cfg.entities.kts.shortLabel)} },
    kr: { label: ${JSON.stringify(cfg.entities.kr.label)}, shortLabel: ${JSON.stringify(cfg.entities.kr.shortLabel)} },
  } as Record<EntityKey, EntityConfig>,

  // Colors (for inline styles in emails)
  colors: {
    primary: ${JSON.stringify(cfg.colors.primary)},
    primaryLight: ${JSON.stringify(cfg.colors.primaryLight)},
    primaryDark: ${JSON.stringify(cfg.colors.primaryDark)},
    background: ${JSON.stringify(cfg.colors.background)},
    surface: ${JSON.stringify(cfg.colors.surface)},
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
`;
}

function updateGlobalsCss(cfg) {
  const cssPath = path.join(ROOT, 'app', 'globals.css');
  let css = fs.readFileSync(cssPath, 'utf-8');

  // Replace the CSS variables block
  css = css.replace(
    /:root\s*\{[^}]*\}/,
    `:root {
  --brand-gold: ${cfg.colors.primary};
  --brand-gold-light: ${cfg.colors.primaryLight};
  --brand-gold-dark: ${cfg.colors.primaryDark};
  --brand-black: ${cfg.colors.background};
  --brand-charcoal: ${cfg.colors.surface};
}`
  );

  fs.writeFileSync(cssPath, css, 'utf-8');
}

// ---------- .firebaserc ----------

function updateFirebaseRc(cfg) {
  const rcPath = path.join(ROOT, '.firebaserc');
  const rc = { projects: { default: cfg.firebaseProjectId } };
  fs.writeFileSync(rcPath, JSON.stringify(rc, null, 2) + '\n', 'utf-8');
}

// ---------- .env.local template ----------

function generateEnvTemplate(cfg) {
  return `# ${cfg.appName} — Environment Variables
# Copy this file to .env.local and fill in secrets.
# AUTO-GENERATED by scripts/white-label.js

# ========================================
# Firebase (client-side — safe to expose)
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${cfg.firebaseProjectId}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${cfg.firebaseProjectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${cfg.firebaseProjectId}.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase push notifications (VAPID key from Firebase Console → Cloud Messaging)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# ========================================
# Firebase (server-side — NEVER expose)
# ========================================
# Service account JSON (single line) — Firebase Console → Project Settings → Service Accounts
FIREBASE_SERVICE_ACCOUNT_KEY=

# ========================================
# Email (Resend — replaces Gmail SMTP)
# ========================================
# Get from https://resend.com/api-keys
# Also set as Firebase secret: firebase functions:secrets:set RESEND_API_KEY
RESEND_API_KEY=

# ========================================
# AI (receipt parsing, voice)
# ========================================
# Anthropic API key for AI receipt parsing
ANTHROPIC_API_KEY=

# ========================================
# VAPI AI Voice
# ========================================
VAPI_API_KEY=
NEXT_PUBLIC_VAPI_PUBLIC_KEY=
VAPI_PHONE_NUMBER_ID=
VAPI_ASSISTANT_ID=
# Optional: separate assistant IDs per use case
# VAPI_DISPATCH_ASSISTANT_ID=
# VAPI_FIELD_ASSISTANT_ID=

# ========================================
# Google APIs (server-side)
# ========================================
# Google Calendar 2-way sync
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# ========================================
# Enterprise Features
# ========================================
# Secret for cron-triggered email queue processing (generate a strong random string)
CRON_SECRET=

# ========================================
# SMS Provider (choose: textbelt, twilio, or telnyx)
# ========================================
SMS_PROVIDER=textbelt
# Telnyx (recommended for production)
TELNYX_API_KEY=
TELNYX_PHONE_NUMBER=
# Textbelt (testing only — 1 free SMS/day)
TEXTBELT_API_KEY=textbelt

# ========================================
# App
# ========================================
NEXT_PUBLIC_APP_URL=https://${cfg.domain}
`;
}

// ---------- Placeholder PWA icons (SVG-based) ----------

function generatePlaceholderIcons(cfg) {
  const iconsDir = path.join(ROOT, 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const text = cfg.logoIconText || cfg.shortName.substring(0, 2).toUpperCase();
  const bg = cfg.colors.primary;
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

  for (const size of sizes) {
    const fontSize = Math.round(size * 0.38);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${bg}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="#FFFFFF">${text}</text>
</svg>`;
    fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.svg`), svg, 'utf-8');
  }

  // Also generate a basic favicon.svg in public/
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <rect width="32" height="32" rx="6" fill="${bg}"/>
  <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-family="system-ui, -apple-system, sans-serif" font-weight="700"
        font-size="14" fill="#FFFFFF">${text}</text>
</svg>`;
  fs.writeFileSync(path.join(ROOT, 'public', 'favicon.svg'), faviconSvg, 'utf-8');
}

// ---------- VAPI config ----------

function updateVapiConfig(cfg) {
  if (!cfg.vapi?.webhookUrl) return false;

  const vapiPath = path.join(ROOT, 'scripts', 'setup-vapi.mjs');
  if (!fs.existsSync(vapiPath)) return false;

  let content = fs.readFileSync(vapiPath, 'utf-8');

  // Update webhook URL
  content = content.replace(
    /const WEBHOOK_URL\s*=\s*['"][^'"]*['"]/,
    `const WEBHOOK_URL = '${cfg.vapi.webhookUrl}'`
  );

  // Update assistant IDs if provided
  if (cfg.vapi.inboundAssistantId) {
    content = content.replace(
      /const INBOUND_ASSISTANT_ID\s*=\s*['"][^'"]*['"]/,
      `const INBOUND_ASSISTANT_ID = '${cfg.vapi.inboundAssistantId}'`
    );
  }
  if (cfg.vapi.outboundAssistantId) {
    content = content.replace(
      /const OUTBOUND_ASSISTANT_ID\s*=\s*['"][^'"]*['"]/,
      `const OUTBOUND_ASSISTANT_ID = '${cfg.vapi.outboundAssistantId}'`
    );
  }
  if (cfg.vapi.dispatchAssistantId) {
    content = content.replace(
      /const DISPATCH_ASSISTANT_ID\s*=\s*['"][^'"]*['"]/,
      `const DISPATCH_ASSISTANT_ID = '${cfg.vapi.dispatchAssistantId}'`
    );
  }
  if (cfg.vapi.fieldAssistantId) {
    content = content.replace(
      /const FIELD_ASSISTANT_ID\s*=\s*['"][^'"]*['"]/,
      `const FIELD_ASSISTANT_ID = '${cfg.vapi.fieldAssistantId}'`
    );
  }
  if (cfg.vapi.ktsPhoneId) {
    content = content.replace(
      /const KTS_PHONE_ID\s*=\s*['"][^'"]*['"]/,
      `const KTS_PHONE_ID = '${cfg.vapi.ktsPhoneId}'`
    );
  }
  if (cfg.vapi.krPhoneId) {
    content = content.replace(
      /const KR_PHONE_ID\s*=\s*['"][^'"]*['"]/,
      `const KR_PHONE_ID = '${cfg.vapi.krPhoneId}'`
    );
  }

  fs.writeFileSync(vapiPath, content, 'utf-8');
  return true;
}

// ---------- Main ----------

const args = process.argv.slice(2);

if (args.includes('--help') || args.length === 0) {
  console.log(`
\x1b[1mWhite-Label Setup Script\x1b[0m

Usage:
  node scripts/white-label.js <tenant.json>   Apply tenant config
  node scripts/white-label.js --example       Generate example tenant.json
  node scripts/white-label.js --current       Export current config as JSON

After running, remember to:
  1. Copy .env.local.template → .env.local and fill in secrets
  2. Replace placeholder icons in /public/icons/ with real logos
  3. Deploy (git push)
  4. Set up Resend email (verify domain, add RESEND_API_KEY)
  5. Set up VAPI phone number + caller reputation
     (Free Caller Registry, Hiya, CNAM)
`);
  process.exit(0);
}

if (args.includes('--example')) {
  const outPath = path.join(ROOT, 'tenant-example.json');
  fs.writeFileSync(outPath, JSON.stringify(EXAMPLE, null, 2) + '\n', 'utf-8');
  ok(`Example config written to ${outPath}`);
  console.log('\nEdit it with your client\'s info, then run:');
  console.log('  node scripts/white-label.js tenant-example.json\n');
  process.exit(0);
}

if (args.includes('--current')) {
  // Read current tenant.ts and extract the config values
  const tenantPath = path.join(ROOT, 'lib', 'config', 'tenant.ts');
  // Quick and dirty: require it by evaluating... or just tell user to copy
  console.log('Current tenant config values (copy from lib/config/tenant.ts):');
  const tenantSrc = fs.readFileSync(tenantPath, 'utf-8');
  // Extract the object between "tenant: TenantConfig = {" and the closing "};"
  const match = tenantSrc.match(/export const tenant: TenantConfig = (\{[\s\S]*?\n\};)/);
  if (match) {
    // Convert TS object to JSON-ish output
    let obj = match[1]
      .replace(/\/\/.*/g, '')           // strip comments
      .replace(/,(\s*[}\]])/g, '$1')    // strip trailing commas
      .replace(/(\w+):/g, '"$1":')      // quote keys
      .replace(/'/g, '"');              // single to double quotes
    try {
      const parsed = JSON.parse(obj.replace(/;\s*$/, ''));
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log('\nCould not auto-parse. Here are the raw values:\n');
      console.log(obj);
    }
  }
  process.exit(0);
}

// Apply tenant config
const jsonPath = path.resolve(args[0]);
if (!fs.existsSync(jsonPath)) {
  die(`File not found: ${jsonPath}`);
}

let cfg;
try {
  cfg = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
} catch (e) {
  die(`Invalid JSON: ${e.message}`);
}

validate(cfg);

console.log(`\n\x1b[1mApplying white-label config for: ${cfg.appName}\x1b[0m\n`);

// Write client tenant config
const clientPath = path.join(ROOT, 'lib', 'config', 'tenant.ts');
fs.writeFileSync(clientPath, generateClientTenant(cfg), 'utf-8');
ok(`Updated ${path.relative(ROOT, clientPath)}`);

// Write functions tenant config
const functionsPath = path.join(ROOT, 'functions', 'src', 'config', 'tenant.ts');
fs.writeFileSync(functionsPath, generateFunctionsTenant(cfg), 'utf-8');
ok(`Updated ${path.relative(ROOT, functionsPath)}`);

// Update CSS variables
updateGlobalsCss(cfg);
ok('Updated app/globals.css CSS variables');

// Update .firebaserc
updateFirebaseRc(cfg);
ok(`Updated .firebaserc → project "${cfg.firebaseProjectId}"`);

// Generate .env.local template
const envTemplatePath = path.join(ROOT, '.env.local.template');
fs.writeFileSync(envTemplatePath, generateEnvTemplate(cfg), 'utf-8');
ok('Generated .env.local.template');

// Generate placeholder PWA icons
generatePlaceholderIcons(cfg);
ok('Generated placeholder PWA icons in public/icons/');

// Update VAPI config (if provided)
if (updateVapiConfig(cfg)) {
  ok('Updated scripts/setup-vapi.mjs with VAPI config');
} else if (cfg.vapi) {
  console.log('  ⚠ VAPI config provided but webhookUrl is missing or setup-vapi.mjs not found — skipped');
}

// Register tenant in keyhub-admin and seed feature flags (async)
(async () => {
  const registered = await registerTenantInAdmin(cfg);
  const seeded = await seedFeatureFlags(cfg);

  console.log(`
\x1b[1m\x1b[32mDone!\x1b[0m Config updated for \x1b[1m${cfg.appName}\x1b[0m.

\x1b[1mFiles updated:\x1b[0m
  • lib/config/tenant.ts
  • functions/src/config/tenant.ts
  • app/globals.css
  • .firebaserc
  • .env.local.template
  • public/icons/ (placeholder SVGs)
  • public/favicon.svg${cfg.vapi?.webhookUrl ? '\n  • scripts/setup-vapi.mjs' : ''}

\x1b[1mRemaining steps:\x1b[0m
  1. Copy .env.local.template → .env.local and fill in Firebase secrets
  2. Replace placeholder icons in /public/icons/ with real logos
  3. Build functions:  cd functions && npm run build
  4. Deploy:           git push

\x1b[1m📧 Email Setup (Resend):\x1b[0m
  5. Add RESEND_API_KEY to Vercel env vars (or Firebase secrets)
  6. Verify sending domain in Resend dashboard (add DNS records)
     • Or use shared domain (e.g., noreply@keyhubcentral.com)

\x1b[1m📞 Phone / Voice Setup (VAPI):\x1b[0m
  7. Create a VAPI phone number (Dashboard → Phone Numbers → Create)
     • Free US numbers: up to 10 per account, no Twilio needed
     • Or import from Telnyx for more control
  8. Set VAPI_PHONE_NUMBER_ID in env vars
  9. Assign assistant to the phone number

\x1b[1m📞 Caller Reputation (prevent spam flagging):\x1b[0m
  10. Register at https://freecallerregistry.com (free, 5 min)
  11. Register with Hiya (https://hiya.com) — powers "Spam Likely" labels
  12. Set up CNAM (Caller ID Name) through your carrier
      • Shows business name instead of "Unknown" on caller ID
      • Requires an EIN
  13. STIR/SHAKEN — usually automatic with VAPI/Telnyx numbers

\x1b[1m🔒 Firestore Security Rules (Enterprise Collections):\x1b[0m
  14. Update firestore.rules to add rules for these new collections:
      • config                 (feature flags — authenticated read, owner write)
      • remoteSigningSessions  (public read via token, admin write)
      • emailQueue             (admin read/write, cron processing)
      • emailTemplates         (admin read/write)
      • webhookEndpoints       (admin read/write)
      • webhookDeliveries      (admin read)
      • apiKeys                (admin read/write)
      • marketplaceListings    (authenticated read, admin/pm write, contractor bid)
      • routingRules           (admin read/write)
      • savedReports           (admin read/write)
  15. Deploy rules: npx firebase deploy --only firestore:rules

\x1b[1m🏢 System Admin Registration:\x1b[0m${registered ? '\n  ✅ Tenant registered in keyhub-admin' : `
  16. Add to tenant JSON:
      "adminServiceAccountPath": "/path/to/keyhub-system-service-account.json"
      "tenantServiceAccountPath": "/path/to/tenant-firebase-service-account.json"
      Then re-run this script to auto-register.`}
${seeded ? '  ✅ Feature flags seeded in tenant Firestore' : `  17. Seed feature flags: GOOGLE_APPLICATION_CREDENTIALS=./service-account.json node scripts/seed-feature-flags.js`}

\x1b[1m⚠ Note:\x1b[0m A2P 10DLC registration is for SMS only, NOT voice calls.
  Voice spam prevention uses CNAM + Free Caller Registry + Hiya.
`);
})();
