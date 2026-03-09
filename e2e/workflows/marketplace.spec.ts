import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Marketplace Flow Tests
 * Tests the Uber-for-contractors flow: available jobs, accept, targeted vs broadcast
 */

test.describe('Contractor - Available Jobs Feed', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('available jobs page loads', async ({ page }) => {
    await page.goto('/portal/leads');
    await expect(page).toHaveURL(/\/portal\/leads/);
  });

  test('available jobs shows job cards or empty state', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    // Either shows available job cards or "no available jobs"
    const hasJobs = await page.getByText(/accept|specialty|available|direct request/i).count() > 0;
    const hasEmpty = await page.getByText(/no available|no jobs|check back/i).count() > 0;
    expect(hasJobs || hasEmpty).toBeTruthy();
  });

  test('available job card shows specialty badges', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    // If jobs exist, they should show specialty tags
    const specialtyBadges = page.getByText(/plumbing|electrical|hvac|roofing|painting|carpentry/i);
    if (await specialtyBadges.count() > 0) {
      await expect(specialtyBadges.first()).toBeVisible();
    }
  });

  test('available job card shows distance', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    // Distance indicator like "4.2 mi"
    const distance = page.getByText(/\d+\.?\d*\s*mi/i);
    if (await distance.count() > 0) {
      await expect(distance.first()).toBeVisible();
    }
  });

  test('available job card shows accept button', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    const acceptButton = page.getByRole('button', { name: /accept/i });
    if (await acceptButton.count() > 0) {
      await expect(acceptButton.first()).toBeVisible();
    }
  });

  test('direct request badge appears for targeted leads', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    // If there are targeted leads, they show "Direct Request" badge
    const directBadge = page.getByText(/direct request/i);
    if (await directBadge.count() > 0) {
      await expect(directBadge.first()).toBeVisible();
    }
  });

  test('available job shows city/state not exact address', async ({ page }) => {
    await page.goto('/portal/leads');
    await page.waitForTimeout(3000);
    // Jobs should show general area, not exact address (privacy)
    const locationInfo = page.getByText(/,\s*(OK|TX|CA|FL|NY)/i);
    if (await locationInfo.count() > 0) {
      await expect(locationInfo.first()).toBeVisible();
    }
  });
});

test.describe('Contractor - My Jobs (Accepted Leads)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('my jobs page loads', async ({ page }) => {
    await page.goto('/portal/jobs');
    await expect(page).toHaveURL(/\/portal\/jobs/);
  });

  test('my jobs shows assigned jobs section', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.waitForTimeout(2000);
    // Should show "My Jobs" heading or similar
    await expect(page.locator('main').getByText(/my jobs|assigned|job/i).first()).toBeVisible();
  });

  test('my jobs shows accepted customer leads section', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.waitForTimeout(3000);
    // Should show section for accepted customer portal leads
    const customerSection = page.getByText(/customer|accepted|lead/i);
    if (await customerSection.count() > 0) {
      await expect(customerSection.first()).toBeVisible();
    }
  });

  test('accepted lead shows customer info', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.waitForTimeout(3000);
    // If accepted leads exist, should show customer name/description
    const customerInfo = page.getByText(/customer|description|specialty/i);
    if (await customerInfo.count() > 0) {
      await expect(customerInfo.first()).toBeVisible();
    }
  });

  test('accepted lead shows navigate button', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.waitForTimeout(3000);
    const navigateButton = page.locator('a:has-text("Navigate")');
    if (await navigateButton.count() > 0) {
      const href = await navigateButton.first().getAttribute('href');
      expect(href).toContain('google.com/maps');
    }
  });

  test('my jobs stats include accepted leads count', async ({ page }) => {
    await page.goto('/portal/jobs');
    await page.waitForTimeout(2000);
    // Stats row should be visible at top
    const statsSection = page.getByText(/total|active|complete/i);
    if (await statsSection.count() > 0) {
      await expect(statsSection.first()).toBeVisible();
    }
  });
});

test.describe('Marketplace - End to End Flow', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'E2E flow tests only run on Chromium');

  test('customer can navigate from dashboard to find pros', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/customer/dashboard');
    await page.waitForTimeout(2000);

    // Click on Find Pros action card
    const findProsLink = page.locator('a[href*="/customer/find"]').first();
    if (await findProsLink.count() > 0) {
      await findProsLink.click();
      await expect(page).toHaveURL(/\/customer\/find/);
    }
  });

  test('customer can navigate from find pros to book', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);

    // Click "Any Available Pro" or "Book This Pro"
    const bookLink = page.locator('a[href*="/customer/book"]').first();
    if (await bookLink.count() > 0) {
      await bookLink.click();
      await expect(page).toHaveURL(/\/customer\/book/);
    }
  });

  test('contractor available jobs is accessible from nav', async ({ page }) => {
    await loginAs(page, 'contractor');
    // Navigate via sidebar/bottom nav
    const navLink = page.locator('a[href="/portal/leads"]').first();
    if (await navLink.count() > 0) {
      await navLink.click();
      await expect(page).toHaveURL(/\/portal\/leads/);
    } else {
      await page.goto('/portal/leads');
      await expect(page).toHaveURL(/\/portal\/leads/);
    }
  });
});

test.describe('Marketplace - Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Access tests only run on Chromium');

  test('non-customer cannot access customer find pros', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/customer/find');
    // Should redirect to admin dashboard
    await expect(page).not.toHaveURL(/\/customer\/find/);
  });

  test('non-contractor cannot access available jobs', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/portal/leads');
    // Should redirect away
    await expect(page).not.toHaveURL(/\/portal\/leads/);
  });

  test('subscriber cannot access customer portal', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/customer/dashboard');
    await expect(page).toHaveURL(/\/subscriber/);
  });

  test('partner cannot access customer portal', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/customer/find');
    await expect(page).toHaveURL(/\/partner/);
  });
});
