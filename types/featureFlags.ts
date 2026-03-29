// ── Feature Flag Definitions ─────────────────────────────────────────────────
// Each module maps to a group of features. Turning off a module disables
// all features in that group AND any modules that depend on it.

export interface FeatureFlags {
  // CORE — always on, cannot be disabled
  core: true;

  // Toggleable modules
  leadEngine: boolean;
  voiceAI: boolean;
  communications: boolean;
  marketplace: boolean;
  reportBuilder: boolean;
  presentationBuilder: boolean;
  predictiveAnalytics: boolean;
  smartScheduling: boolean;
  customerPortal: boolean;
  contracts: boolean;
  remoteSignature: boolean;
  financials: boolean;
  emailAutomation: boolean;
  webhooksAPI: boolean;
  callCenter: boolean;
  riskScoring: boolean;
  offlinePWA: boolean;
  inventory: boolean;
}

// ── Module Dependencies ──────────────────────────────────────────────────────
// If a module is turned off, all modules that depend on it are also disabled.
// Key = module, Value = array of modules it depends on (all must be enabled).

export const MODULE_DEPENDENCIES: Partial<Record<keyof FeatureFlags, (keyof FeatureFlags)[]>> = {
  // Presentation Builder requires Report Builder
  presentationBuilder: ['reportBuilder'],
  // Remote Signature requires Contracts
  remoteSignature: ['contracts'],
  // Marketplace requires Core (always true, but explicit)
  marketplace: ['core'],
  // Smart Scheduling requires Core
  smartScheduling: ['core'],
  // Call Center requires Voice AI
  callCenter: ['voiceAI'],
  // Risk Scoring requires Voice AI (for callback analysis)
  riskScoring: ['voiceAI'],
  // Predictive Analytics benefits from Lead Engine (warn but still works)
  // predictiveAnalytics: ['leadEngine'],  // soft dependency — don't enforce
};

// ── Reverse Dependencies ─────────────────────────────────────────────────────
// When turning OFF a module, also turn off everything that depends on it.
// Computed from MODULE_DEPENDENCIES.

export function getDependents(module: keyof FeatureFlags): (keyof FeatureFlags)[] {
  const dependents: (keyof FeatureFlags)[] = [];
  for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
    if (deps?.includes(module)) {
      dependents.push(mod as keyof FeatureFlags);
    }
  }
  return dependents;
}

// ── Resolve Flags with Dependencies ──────────────────────────────────────────
// Given raw flags, enforce dependency rules: if a parent is off, children are off.

export function resolveFlags(raw: Partial<FeatureFlags>): FeatureFlags {
  const flags: FeatureFlags = { ...DEFAULT_FLAGS, ...raw, core: true };

  // Enforce dependencies: if any dependency is off, the module is off
  for (const [mod, deps] of Object.entries(MODULE_DEPENDENCIES)) {
    if (deps) {
      for (const dep of deps) {
        if (!flags[dep]) {
          (flags as unknown as Record<string, boolean>)[mod] = false;
        }
      }
    }
  }

  return flags;
}

// ── Default Flags (everything on) ────────────────────────────────────────────

export const DEFAULT_FLAGS: FeatureFlags = {
  core: true,
  leadEngine: true,
  voiceAI: true,
  communications: true,
  marketplace: true,
  reportBuilder: true,
  presentationBuilder: true,
  predictiveAnalytics: true,
  smartScheduling: true,
  customerPortal: true,
  contracts: true,
  remoteSignature: true,
  financials: true,
  emailAutomation: true,
  webhooksAPI: true,
  callCenter: true,
  riskScoring: true,
  offlinePWA: true,
  inventory: true,
};

// ── Module Display Info (for admin UI) ───────────────────────────────────────

export const MODULE_INFO: Record<keyof FeatureFlags, { label: string; description: string; alwaysOn?: boolean }> = {
  core: { label: 'Core', description: 'Jobs, contractors, scheduling, dispatch, documents, portal', alwaysOn: true },
  leadEngine: { label: 'Lead Engine', description: 'Leads, campaigns, bulk import, ROI tracking, lead capture' },
  voiceAI: { label: 'Voice & AI', description: 'Inbound/outbound calls, AI dispatch, AI routing' },
  communications: { label: 'Communications', description: 'SMS (Telnyx), notifications' },
  marketplace: { label: 'Marketplace', description: 'Cross-dealer labor listings, bidding, requests' },
  reportBuilder: { label: 'Report Builder', description: 'Custom reports, PDF/CSV export, saved reports' },
  presentationBuilder: { label: 'Presentation Builder', description: 'AI PowerPoint generation from reports' },
  predictiveAnalytics: { label: 'Predictive Analytics', description: 'Revenue forecast, lead predictions, demand forecast' },
  smartScheduling: { label: 'Smart Scheduling', description: 'AI-powered scheduling optimization, bulk optimizer' },
  customerPortal: { label: 'Customer Portal', description: 'Job tracking, service requests, booking, find pros' },
  contracts: { label: 'Contracts', description: 'Contract signing flow, completion certs, addendums' },
  remoteSignature: { label: 'Remote E-Signature', description: 'Email-based token signing with audit trail' },
  financials: { label: 'Financials', description: 'Invoices, payouts, expenses, P&L, earnings' },
  emailAutomation: { label: 'Email Automation', description: 'Templates, triggers, queue, automated campaigns' },
  webhooksAPI: { label: 'Webhooks & API', description: 'Outbound webhooks, HMAC signing, API keys' },
  callCenter: { label: 'Call Center', description: 'Inbound call dashboard, queue, recording player' },
  riskScoring: { label: 'AI Risk Scoring', description: '6-factor weighted model, recommendations' },
  offlinePWA: { label: 'Offline PWA', description: 'IndexedDB queue, background sync' },
  inventory: { label: 'Inventory', description: 'Items, locations, stock levels, counts, receipts' },
};
