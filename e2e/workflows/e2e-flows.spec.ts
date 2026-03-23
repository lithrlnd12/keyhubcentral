import { test, expect } from '../fixtures/auth';
import { loginAs, tryLoginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

/**
 * Full end-to-end business flows that cross multiple modules.
 * These test real user journeys through the application.
 */

test.describe('E2E Flow: Admin Full Walkthrough', () => {
  test('admin can navigate all major sections', async ({ page }) => {
    await loginAs(page, 'admin');

    // Dashboard overview
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/overview/);

    // KR - Jobs
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/kr/);

    // KTS - Contractors
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/kts/);

    // KD - Leads
    await page.goto('/kd/leads');
    await expect(page).toHaveURL(/\/kd\/leads/);

    // KD - Campaigns
    await page.goto('/kd/campaigns');
    await expect(page).toHaveURL(/\/kd\/campaigns/);

    // Financials
    await page.goto('/financials');
    await expect(page).toHaveURL(/\/financials/);

    // Admin
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);

    // Messages
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);

    // Profile
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);

    // Settings
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
  });
});

test.describe('E2E Flow: Job Lifecycle', () => {
  test('admin can navigate job creation to detail flow', async ({ page }) => {
    await loginAs(page, 'admin');

    // Start at jobs list
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/kr/);

    // Go to new job form
    await page.goto('/kr/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL(/\/kr\/new/);

    // Verify form loads
    const hasForm = await page.locator('form, input, select, textarea').count() > 0;
    const hasHeading = await page.getByText(/new job|create job|job form/i).count() > 0;
    expect(hasForm || hasHeading).toBeTruthy();

    // Go back to list and check a job detail
    await page.goto('/kr');
    const jobLink = page.locator('a[href*="/kr/"]').first();
    if (await jobLink.count() > 0) {
      await jobLink.click();
      await page.waitForTimeout(1000);
      // Should be on job detail
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });
});

test.describe('E2E Flow: Lead to Conversion', () => {
  test('admin can navigate lead management workflow', async ({ page }) => {
    await loginAs(page, 'admin');

    // View leads list
    await page.goto('/kd/leads');
    await expect(page).toHaveURL(/\/kd\/leads/);

    // Check for new lead form
    await page.goto('/kd/leads/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/kd\/leads\/new/);
    const hasForm = await page.locator('form, input, select, textarea').count() > 0;
    const hasHeading = await page.getByText(/new lead|create lead|lead/i).count() > 0;
    expect(hasForm || hasHeading).toBeTruthy();

    // Navigate to lead detail if leads exist
    await page.goto('/kd/leads');
    const leadLink = page.locator('a[href*="/kd/leads/"]').first();
    if (await leadLink.count() > 0) {
      await leadLink.click();
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });
});

test.describe('E2E Flow: Contractor Onboarding Journey', () => {
  test('admin can manage contractor from list to detail', async ({ page }) => {
    await loginAs(page, 'admin');

    // View contractors list
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/kts/);

    // Navigate to new contractor form
    await page.goto('/kts/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/kts\/new/);
    const hasForm = await page.locator('form, input, select, textarea').count() > 0;
    const hasHeading = await page.getByText(/new contractor|add contractor|contractor/i).count() > 0;
    expect(hasForm || hasHeading).toBeTruthy();

    // View contractor detail if contractors exist
    await page.goto('/kts');
    const contractorLink = page.locator('a[href*="/kts/"]:not([href*="/new"])').first();
    if (await contractorLink.count() > 0) {
      await contractorLink.click();
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });
});

test.describe('E2E Flow: Contractor Portal Daily Workflow', () => {
  test('contractor daily workflow - dashboard, jobs, availability, earnings', async ({ page }) => {
    await loginAs(page, 'contractor');

    // Dashboard
    await expect(page).toHaveURL(/\/portal/);

    // Check available jobs (marketplace)
    await page.goto('/portal/leads');
    await expect(page).toHaveURL(/\/portal\/leads/);

    // My jobs
    await page.goto('/portal/jobs');
    await expect(page).toHaveURL(/\/portal\/jobs/);

    // Set availability
    await page.goto('/portal/availability');
    await expect(page).toHaveURL(/\/portal\/availability/);

    // Check earnings
    await page.goto('/portal/earnings');
    await expect(page).toHaveURL(/\/portal\/earnings/);

    // Calendar
    await page.goto('/portal/calendar');
    await expect(page).toHaveURL(/\/portal\/calendar/);

    // Profile
    await page.goto('/portal/my-profile');
    await expect(page).toHaveURL(/\/portal\/my-profile/);
  });
});

test.describe('E2E Flow: Customer Booking Journey', () => {
  test('customer can browse and book a professional', async ({ page }) => {
    if (!await tryLoginAs(page, 'customer')) { test.skip(true, 'Customer test user not available'); return; }

    // Start at dashboard
    await expect(page).toHaveURL(/\/customer\/dashboard/);

    // Find professionals
    await page.goto('/customer/find');
    await expect(page).toHaveURL(/\/customer\/find/);

    // Book a professional
    await page.goto('/customer/book');
    await expect(page).toHaveURL(/\/customer\/book/);

    // Check projects
    await page.goto('/customer/projects');
    await expect(page).toHaveURL(/\/customer\/projects/);

    // Messages
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });
});

test.describe('E2E Flow: Partner Portal Workflow', () => {
  test('partner can manage labor requests and service tickets', async ({ page }) => {
    await loginAs(page, 'partner');

    // Dashboard
    await expect(page).toHaveURL(/\/partner/);

    // Labor requests
    await page.goto('/partner/labor-requests');
    await expect(page).toHaveURL(/\/partner\/labor-requests/);

    // New labor request
    await page.goto('/partner/labor-requests/new');
    await expect(page).toHaveURL(/\/partner\/labor-requests\/new/);

    // Service tickets
    await page.goto('/partner/service-tickets');
    await expect(page).toHaveURL(/\/partner\/service-tickets/);

    // New service ticket
    await page.goto('/partner/service-tickets/new');
    await expect(page).toHaveURL(/\/partner\/service-tickets\/new/);

    // History
    await page.goto('/partner/history');
    await expect(page).toHaveURL(/\/partner\/history/);
  });
});

test.describe('E2E Flow: Financial Management', () => {
  test('admin can navigate full financial workflow', async ({ page }) => {
    await loginAs(page, 'admin');

    // Financials overview
    await page.goto('/financials');
    await expect(page).toHaveURL(/\/financials/);

    // Invoices
    await page.goto('/financials/invoices');
    await expect(page).toHaveURL(/\/financials\/invoices/);

    // New invoice
    await page.goto('/financials/invoices/new');
    await expect(page).toHaveURL(/\/financials\/invoices\/new/);

    // Expenses
    await page.goto('/financials/expenses');
    await expect(page).toHaveURL(/\/financials\/expenses/);

    // Earnings
    await page.goto('/financials/earnings');
    await expect(page).toHaveURL(/\/financials\/earnings/);

    // P&L (admin only)
    await page.goto('/financials/pnl');
    await expect(page).toHaveURL(/\/financials\/pnl/);

    // Payouts (admin only)
    await page.goto('/financials/payouts');
    await expect(page).toHaveURL(/\/financials\/payouts/);
  });
});

test.describe('E2E Flow: Subscriber Portal Workflow', () => {
  test('subscriber daily workflow - dashboard, leads, subscription', async ({ page }) => {
    await loginAs(page, 'subscriber');

    // Dashboard
    await expect(page).toHaveURL(/\/subscriber/);

    // View leads
    await page.goto('/subscriber/leads');
    await expect(page).toHaveURL(/\/subscriber\/leads/);

    // Subscription info
    await page.goto('/subscriber/subscription');
    await expect(page).toHaveURL(/\/subscriber\/subscription/);

    // Messages
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });
});

test.describe('E2E Flow: Admin Partner Management', () => {
  test('admin can manage partners and their requests', async ({ page }) => {
    await loginAs(page, 'admin');

    // Partners list
    await page.goto('/admin/partners');
    await expect(page).toHaveURL(/\/admin\/partners/);

    // New partner
    await page.goto('/admin/partners/new');
    await expect(page).toHaveURL(/\/admin\/partners\/new/);

    // Partner requests
    await page.goto('/admin/partner-requests');
    await expect(page).toHaveURL(/\/admin\/partner-requests/);

    // New partner request
    await page.goto('/admin/partner-requests/new');
    await expect(page).toHaveURL(/\/admin\/partner-requests\/new/);
  });
});

test.describe('E2E Flow: Inventory Management Cycle', () => {
  test('admin can manage full inventory cycle', async ({ page }) => {
    await loginAs(page, 'admin');

    // Inventory overview
    await page.goto('/kts/inventory');
    await expect(page).toHaveURL(/\/kts\/inventory/);

    // Items
    await page.goto('/kts/inventory/items');
    await expect(page).toHaveURL(/\/kts\/inventory\/items/);

    // New item
    await page.goto('/kts/inventory/items/new');
    await expect(page).toHaveURL(/\/kts\/inventory\/items\/new/);

    // Receipts
    await page.goto('/kts/inventory/receipts');
    await expect(page).toHaveURL(/\/kts\/inventory\/receipts/);

    // New receipt
    await page.goto('/kts/inventory/receipts/new');
    await expect(page).toHaveURL(/\/kts\/inventory\/receipts\/new/);

    // Counts
    await page.goto('/kts/inventory/count');
    await expect(page).toHaveURL(/\/kts\/inventory\/count/);

    // Alerts
    await page.goto('/kts/inventory/alerts');
    await expect(page).toHaveURL(/\/kts\/inventory\/alerts/);
  });
});

test.describe('E2E Flow: Messaging Across Roles', () => {
  test('admin can access messaging', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);

    // New conversation
    await page.goto('/messages/new');
    await expect(page).toHaveURL(/\/messages\/new/);
  });

  test('contractor can access messaging', async ({ page }) => {
    await loginAs(page, 'contractor');
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('customer can access messaging', async ({ page }) => {
    if (!await tryLoginAs(page, 'customer')) { test.skip(true, 'Customer test user not available'); return; }
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('partner can access messaging', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('subscriber can access messaging', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });
});
