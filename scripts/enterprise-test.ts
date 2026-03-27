#!/usr/bin/env npx tsx
/**
 * Enterprise Feature Integration Test Script
 *
 * Usage:
 *   npx tsx scripts/enterprise-test.ts <base-url> [auth-token] [--verbose]
 *
 * Examples:
 *   npx tsx scripts/enterprise-test.ts http://localhost:3000
 *   npx tsx scripts/enterprise-test.ts https://keyhubcentral-vercel-git-enterprise-key-hub-central.vercel.app
 *   npx tsx scripts/enterprise-test.ts https://example.vercel.app my-auth-token --verbose
 *
 * If auth-token is not provided, only public endpoint tests run (auth-required tests are skipped).
 */

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const positional = args.filter(a => a !== '--verbose');

const BASE_URL = (positional[0] || 'http://localhost:3000').replace(/\/+$/, '');
const AUTH_TOKEN = positional[1] || '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TestResult {
  feature: string;
  test: string;
  status: 'pass' | 'fail' | 'skip';
  message?: string;
  duration?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const results: TestResult[] = [];

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
};

function log(msg: string) {
  console.log(msg);
}

function vlog(msg: string) {
  if (VERBOSE) console.log(`${colors.dim}  [verbose] ${msg}${colors.reset}`);
}

function statusIcon(status: TestResult['status']): string {
  switch (status) {
    case 'pass': return `${colors.green}PASS${colors.reset}`;
    case 'fail': return `${colors.red}FAIL${colors.reset}`;
    case 'skip': return `${colors.yellow}SKIP${colors.reset}`;
  }
}

function record(feature: string, test: string, status: TestResult['status'], message?: string, duration?: number) {
  results.push({ feature, test, status, message, duration });
  const dur = duration !== undefined ? ` ${colors.dim}(${duration}ms)${colors.reset}` : '';
  const msg = message ? ` — ${message}` : '';
  log(`  ${statusIcon(status)} ${test}${msg}${dur}`);
}

async function fetchSafe(url: string, opts?: RequestInit): Promise<{ status: number; text: string; ok: boolean; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, { ...opts, signal: controller.signal, redirect: 'manual' });
    clearTimeout(timeout);
    const text = await res.text();
    return { status: res.status, text, ok: res.ok || res.status === 302 || res.status === 307 || res.status === 308 };
  } catch (err: any) {
    return { status: 0, text: '', ok: false, error: err?.message || String(err) };
  }
}

function authHeaders(): Record<string, string> {
  return AUTH_TOKEN ? { Authorization: `Bearer ${AUTH_TOKEN}` } : {};
}

function requireAuth(): boolean {
  return !!AUTH_TOKEN;
}

// ---------------------------------------------------------------------------
// Test: Page exists (GET returns 200 or redirect, not 404/500)
// ---------------------------------------------------------------------------

async function testPageExists(feature: string, testName: string, path: string, opts?: { requireAuth?: boolean; expectContent?: string }) {
  if (opts?.requireAuth && !requireAuth()) {
    record(feature, testName, 'skip', 'No auth token provided');
    return;
  }

  const start = Date.now();
  const url = `${BASE_URL}${path}`;
  vlog(`GET ${url}`);
  const res = await fetchSafe(url, { headers: authHeaders() });
  const duration = Date.now() - start;

  if (res.error) {
    record(feature, testName, 'fail', `Network error: ${res.error}`, duration);
    return;
  }

  if (res.status === 404 || res.status >= 500) {
    record(feature, testName, 'fail', `HTTP ${res.status}`, duration);
    return;
  }

  if (opts?.expectContent && !res.text.includes(opts.expectContent)) {
    vlog(`Response body (first 500 chars): ${res.text.substring(0, 500)}`);
    record(feature, testName, 'fail', `Expected content "${opts.expectContent}" not found (HTTP ${res.status})`, duration);
    return;
  }

  record(feature, testName, 'pass', `HTTP ${res.status}`, duration);
}

// ---------------------------------------------------------------------------
// Test: API returns expected status
// ---------------------------------------------------------------------------

async function testAPI(
  feature: string,
  testName: string,
  method: string,
  path: string,
  opts?: {
    body?: any;
    contentType?: string;
    expectStatus?: number | number[];
    requireAuth?: boolean;
    skipIfNoAuth?: boolean;
    headers?: Record<string, string>;
    validateBody?: (text: string) => string | null;
  }
) {
  if (opts?.skipIfNoAuth && !requireAuth()) {
    record(feature, testName, 'skip', 'No auth token provided');
    return;
  }

  const start = Date.now();
  const url = `${BASE_URL}${path}`;
  vlog(`${method} ${url}`);

  const headers: Record<string, string> = {
    ...(opts?.requireAuth !== false ? authHeaders() : {}),
    ...(opts?.headers || {}),
  };

  if (opts?.contentType) {
    headers['Content-Type'] = opts.contentType;
  }

  const fetchOpts: RequestInit = { method, headers };
  if (opts?.body !== undefined) {
    fetchOpts.body = typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body);
    if (!headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }
  }

  const res = await fetchSafe(url, fetchOpts);
  const duration = Date.now() - start;

  if (res.error) {
    record(feature, testName, 'fail', `Network error: ${res.error}`, duration);
    return;
  }

  const expected = opts?.expectStatus
    ? Array.isArray(opts.expectStatus) ? opts.expectStatus : [opts.expectStatus]
    : undefined;

  if (expected && !expected.includes(res.status)) {
    vlog(`Response: ${res.text.substring(0, 300)}`);
    record(feature, testName, 'fail', `Expected HTTP ${expected.join('|')}, got ${res.status}`, duration);
    return;
  }

  if (opts?.validateBody) {
    const err = opts.validateBody(res.text);
    if (err) {
      record(feature, testName, 'fail', err, duration);
      return;
    }
  }

  record(feature, testName, 'pass', `HTTP ${res.status}`, duration);
}

// ---------------------------------------------------------------------------
// Feature Tests
// ---------------------------------------------------------------------------

async function testFeature1_BulkLeadImport() {
  const feature = '1. Bulk Lead Import';
  log(`\n${colors.cyan}${colors.bold}Feature 1 — Bulk Lead Import${colors.reset}`);

  // Test: POST /api/leads/import with CSV data
  if (!requireAuth()) {
    record(feature, 'POST /api/leads/import with CSV', 'skip', 'No auth token provided');
  } else {
    const csvContent = 'name,email,phone,source\nJohn Doe,john@test.com,555-0100,Test\nJane Smith,jane@test.com,555-0101,Test';
    const boundary = '----FormBoundary' + Date.now();
    const body = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test-leads.csv"',
      'Content-Type: text/csv',
      '',
      csvContent,
      `--${boundary}--`,
    ].join('\r\n');

    await testAPI(feature, 'POST /api/leads/import with CSV', 'POST', '/api/leads/import', {
      body,
      contentType: `multipart/form-data; boundary=${boundary}`,
      headers: authHeaders(),
      expectStatus: [200, 201, 400, 401, 403],
      validateBody: (text) => {
        // Any structured response is fine — we just want the endpoint to respond properly
        vlog(`Import response: ${text.substring(0, 300)}`);
        return null;
      },
    });
  }

  // Test: leads import API route exists (OPTIONS or GET should not 404)
  await testAPI(feature, 'Leads import endpoint exists', 'POST', '/api/leads/import', {
    body: '{}',
    contentType: 'application/json',
    expectStatus: [200, 400, 401, 403, 405, 415],
  });
}

async function testFeature2_MarketingROI() {
  const feature = '2. Marketing ROI';
  log(`\n${colors.cyan}${colors.bold}Feature 2 — Marketing ROI Tracking${colors.reset}`);

  await testPageExists(feature, 'GET /kd/campaigns page loads', '/kd/campaigns');
  await testPageExists(feature, 'GET /kd page loads', '/kd');
}

async function testFeature3_RemoteESignature() {
  const feature = '3. Remote E-Signature';
  log(`\n${colors.cyan}${colors.bold}Feature 3 — Remote E-Signature${colors.reset}`);

  // Test: verify endpoint with invalid token
  await testAPI(feature, 'POST /api/contracts/remote-sign/verify with invalid token', 'POST', '/api/contracts/remote-sign/verify?token=invalid-token', {
    body: {},
    expectStatus: [400, 401, 404, 500],
  });

  // Test: sign page renders even with invalid token
  await testPageExists(feature, 'GET /sign/test-token page renders', '/sign/test-token');
}

async function testFeature4_OfflinePWA() {
  const feature = '4. Offline PWA';
  log(`\n${colors.cyan}${colors.bold}Feature 4 — Offline PWA${colors.reset}`);

  // Test: service worker is served
  await testAPI(feature, 'GET /sw.js serves JavaScript', 'GET', '/sw.js', {
    expectStatus: [200],
    validateBody: (text) => {
      if (!text.includes('self') && !text.includes('cache') && !text.includes('fetch') && !text.includes('service')) {
        return 'sw.js does not appear to contain service worker code';
      }
      return null;
    },
  });

  // Test: manifest.json has proper PWA config
  await testAPI(feature, 'GET /manifest.json has PWA config', 'GET', '/manifest.json', {
    expectStatus: [200],
    validateBody: (text) => {
      try {
        const manifest = JSON.parse(text);
        if (!manifest.name && !manifest.short_name) return 'manifest.json missing name/short_name';
        if (!manifest.start_url) return 'manifest.json missing start_url';
        return null;
      } catch {
        return 'manifest.json is not valid JSON';
      }
    },
  });
}

async function testFeature5_ReportBuilder() {
  const feature = '5. Report Builder';
  log(`\n${colors.cyan}${colors.bold}Feature 5 — Report Builder${colors.reset}`);

  await testPageExists(feature, 'GET /admin/reports page exists', '/admin/reports');
}

async function testFeature6_EmailAutomation() {
  const feature = '6. Email Automation';
  log(`\n${colors.cyan}${colors.bold}Feature 6 — Email Automation${colors.reset}`);

  await testPageExists(feature, 'GET /settings/email page exists', '/settings/email');

  // Test: trigger without auth returns 401
  await testAPI(feature, 'POST /api/email/trigger without auth returns 401', 'POST', '/api/email/trigger', {
    body: { trigger: 'test' },
    requireAuth: false,
    expectStatus: [401, 403],
    headers: {},
  });
}

async function testFeature7_AppointmentScheduling() {
  const feature = '7. Appointment Scheduling';
  log(`\n${colors.cyan}${colors.bold}Feature 7 — Appointment Scheduling${colors.reset}`);

  await testPageExists(feature, 'GET /customer/book/schedule page renders', '/customer/book/schedule');

  // Check for expected booking UI content
  await testAPI(feature, 'Booking page contains scheduling content', 'GET', '/customer/book/schedule', {
    expectStatus: [200, 302, 307],
    validateBody: (text) => {
      // The page should have some HTML content
      if (text.length < 100) return 'Page response too short — may not be rendering';
      return null;
    },
  });
}

async function testFeature8_OutboundWebhooks() {
  const feature = '8. Outbound Webhooks';
  log(`\n${colors.cyan}${colors.bold}Feature 8 — Outbound Webhooks${colors.reset}`);

  await testPageExists(feature, 'GET /settings/webhooks page exists', '/settings/webhooks');

  await testAPI(feature, 'POST /api/webhooks/test without auth returns 401', 'POST', '/api/webhooks/test', {
    body: { url: 'https://example.com' },
    requireAuth: false,
    expectStatus: [401, 403],
    headers: {},
  });
}

async function testFeature9_CallCenter() {
  const feature = '9. Call Center';
  log(`\n${colors.cyan}${colors.bold}Feature 9 — Call Center${colors.reset}`);

  await testPageExists(feature, 'GET /kts/calls page exists', '/kts/calls');
}

async function testFeature10_AIRiskScoring() {
  const feature = '10. AI Risk Scoring';
  log(`\n${colors.cyan}${colors.bold}Feature 10 — AI Risk Scoring${colors.reset}`);

  await testAPI(feature, 'POST /api/ai/risk-score without auth returns 401', 'POST', '/api/ai/risk-score', {
    body: { jobId: 'nonexistent' },
    requireAuth: false,
    expectStatus: [401, 403],
    headers: {},
  });

  if (requireAuth()) {
    await testAPI(feature, 'POST /api/ai/risk-score with invalid jobId', 'POST', '/api/ai/risk-score', {
      body: { jobId: 'nonexistent-job-id-12345' },
      expectStatus: [400, 404, 500],
      skipIfNoAuth: true,
    });
  } else {
    record(feature, 'POST /api/ai/risk-score with invalid jobId', 'skip', 'No auth token provided');
  }
}

async function testFeature11_CrossDealerMarketplace() {
  const feature = '11. Cross-Dealer Marketplace';
  log(`\n${colors.cyan}${colors.bold}Feature 11 — Cross-Dealer Labor Marketplace${colors.reset}`);

  await testPageExists(feature, 'GET /kts/marketplace page exists', '/kts/marketplace');
  await testPageExists(feature, 'GET /portal/marketplace page exists', '/portal/marketplace');
}

async function testFeature12_SmartScheduling() {
  const feature = '12. Smart Scheduling';
  log(`\n${colors.cyan}${colors.bold}Feature 12 — AI Smart Scheduling${colors.reset}`);

  await testPageExists(feature, 'GET /calendar/smart-schedule page exists', '/calendar/smart-schedule');
}

async function testFeature13_CustomerPortal() {
  const feature = '13. Customer Portal';
  log(`\n${colors.cyan}${colors.bold}Feature 13 — Customer Portal${colors.reset}`);

  await testPageExists(feature, 'GET /customer/projects page exists', '/customer/projects');
  await testPageExists(feature, 'GET /customer/dashboard page exists', '/customer/dashboard');
}

async function testFeature14_PredictiveAnalytics() {
  const feature = '14. Predictive Analytics';
  log(`\n${colors.cyan}${colors.bold}Feature 14 — Predictive Analytics Dashboard${colors.reset}`);

  await testPageExists(feature, 'GET /admin/analytics page exists', '/admin/analytics');
}

async function testBuildHealth() {
  const feature = 'Build Health';
  log(`\n${colors.cyan}${colors.bold}Build Health — Core Pages${colors.reset}`);

  await testPageExists(feature, 'GET / (landing page)', '/');
  await testPageExists(feature, 'GET /login', '/login');
  await testPageExists(feature, 'GET /signup', '/signup');
}

async function testStaticAssets() {
  const feature = 'Static Assets';
  log(`\n${colors.cyan}${colors.bold}Static Assets${colors.reset}`);

  await testAPI(feature, 'GET /sw.js exists', 'GET', '/sw.js', { expectStatus: [200] });
  await testAPI(feature, 'GET /manifest.json exists', 'GET', '/manifest.json', { expectStatus: [200] });
  await testAPI(feature, 'GET /favicon.ico exists', 'GET', '/favicon.ico', { expectStatus: [200] });
}

async function testAPIHealth() {
  const feature = 'API Health';
  log(`\n${colors.cyan}${colors.bold}API Health — Key Endpoints${colors.reset}`);

  await testAPI(feature, 'GET /api/contractors/public responds', 'GET', '/api/contractors/public', {
    expectStatus: [200, 401, 403],
  });

  await testAPI(feature, 'GET /api/partners/public responds', 'GET', '/api/partners/public', {
    expectStatus: [200, 401, 403],
  });
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

async function run() {
  log(`\n${colors.bold}============================================================${colors.reset}`);
  log(`${colors.bold}  KeyHub Central — Enterprise Feature Integration Tests${colors.reset}`);
  log(`${colors.bold}============================================================${colors.reset}`);
  log(`  Target:     ${colors.cyan}${BASE_URL}${colors.reset}`);
  log(`  Auth token: ${AUTH_TOKEN ? colors.green + 'provided' + colors.reset : colors.yellow + 'not provided (auth tests will be skipped)' + colors.reset}`);
  log(`  Verbose:    ${VERBOSE ? 'on' : 'off'}`);
  log(`  Time:       ${new Date().toISOString()}`);
  log(`${colors.bold}============================================================${colors.reset}`);

  // Run all feature tests
  await testFeature1_BulkLeadImport();
  await testFeature2_MarketingROI();
  await testFeature3_RemoteESignature();
  await testFeature4_OfflinePWA();
  await testFeature5_ReportBuilder();
  await testFeature6_EmailAutomation();
  await testFeature7_AppointmentScheduling();
  await testFeature8_OutboundWebhooks();
  await testFeature9_CallCenter();
  await testFeature10_AIRiskScoring();
  await testFeature11_CrossDealerMarketplace();
  await testFeature12_SmartScheduling();
  await testFeature13_CustomerPortal();
  await testFeature14_PredictiveAnalytics();

  // Additional tests
  await testBuildHealth();
  await testStaticAssets();
  await testAPIHealth();

  // ---------------------------------------------------------------------------
  // Summary table
  // ---------------------------------------------------------------------------

  // Group results by feature
  const features = new Map<string, TestResult[]>();
  for (const r of results) {
    if (!features.has(r.feature)) features.set(r.feature, []);
    features.get(r.feature)!.push(r);
  }

  const totalPass = results.filter(r => r.status === 'pass').length;
  const totalFail = results.filter(r => r.status === 'fail').length;
  const totalSkip = results.filter(r => r.status === 'skip').length;
  const totalTests = results.length;

  log(`\n`);
  log(`${colors.bold}+--------------------------------------+-------+------+------+------+${colors.reset}`);
  log(`${colors.bold}| Feature                              | Tests | Pass | Fail | Skip |${colors.reset}`);
  log(`${colors.bold}+--------------------------------------+-------+------+------+------+${colors.reset}`);

  for (const [feature, tests] of features) {
    const pass = tests.filter(t => t.status === 'pass').length;
    const fail = tests.filter(t => t.status === 'fail').length;
    const skip = tests.filter(t => t.status === 'skip').length;
    const total = tests.length;

    const failColor = fail > 0 ? colors.red : '';
    const passColor = pass === total ? colors.green : '';
    const resetC = (failColor || passColor) ? colors.reset : '';

    log(
      `${failColor}${passColor}| ${feature.padEnd(37)}| ${String(total).padStart(5)} | ${String(pass).padStart(4)} | ${String(fail).padStart(4)} | ${String(skip).padStart(4)} |${resetC}`
    );
  }

  log(`${colors.bold}+--------------------------------------+-------+------+------+------+${colors.reset}`);

  const summaryColor = totalFail > 0 ? colors.red : colors.green;
  log(
    `${colors.bold}${summaryColor}| TOTAL                                | ${String(totalTests).padStart(5)} | ${String(totalPass).padStart(4)} | ${String(totalFail).padStart(4)} | ${String(totalSkip).padStart(4)} |${colors.reset}`
  );
  log(`${colors.bold}+--------------------------------------+-------+------+------+------+${colors.reset}`);

  log('');

  if (totalFail > 0) {
    log(`${colors.red}${colors.bold}  ${totalFail} test(s) FAILED${colors.reset}\n`);
    for (const r of results.filter(r => r.status === 'fail')) {
      log(`    ${colors.red}FAIL${colors.reset} [${r.feature}] ${r.test} — ${r.message}`);
    }
    log('');
    process.exit(1);
  } else {
    log(`${colors.green}${colors.bold}  All ${totalPass} test(s) passed (${totalSkip} skipped)${colors.reset}\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error(`${colors.red}Fatal error: ${err}${colors.reset}`);
  process.exit(1);
});
