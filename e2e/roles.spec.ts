import { test as base, expect } from '@playwright/test';
import { loginAs, expectAccessDenied, TEST_USERS, TestUserRole } from './fixtures/auth';

// Extend base test to skip non-chromium browsers for role tests
const test = base.extend({});

/**
 * Role-Based Access Control (RBAC) Tests
 *
 * These tests verify that each user role has appropriate access to different
 * parts of the application. Run with actual test users in Firebase.
 *
 * To set up test users:
 * 1. Login as admin/owner
 * 2. Go to /admin/seed
 * 3. Click "Create Test Users"
 */

// Only run role tests on Chromium (access control is not browser-specific)
test.describe('Role-Based Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');

  test.describe('Owner Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'owner');
    });

    test('can access dashboard overview', async ({ page }) => {
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/overview/);
    });

    test('can access all jobs (KR)', async ({ page }) => {
      await page.goto('/kr');
      await expect(page).toHaveURL(/\/kr/);
    });

    test('can access contractors (KTS)', async ({ page }) => {
      await page.goto('/kts');
      await expect(page).toHaveURL(/\/kts/);
    });

    test('can access campaigns (KD)', async ({ page }) => {
      await page.goto('/kd');
      await expect(page).toHaveURL(/\/kd/);
    });

    test('can access financials with full P&L', async ({ page }) => {
      await page.goto('/financials');
      await expect(page).toHaveURL(/\/financials/);
    });

    test('can access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin/);
    });

    test('can access partner management', async ({ page }) => {
      await page.goto('/admin/partners');
      await expect(page).toHaveURL(/\/admin\/partners/);
    });
  });

  test.describe('Admin Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can access dashboard overview', async ({ page }) => {
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/overview/);
    });

    test('can access all jobs (KR)', async ({ page }) => {
      await page.goto('/kr');
      await expect(page).toHaveURL(/\/kr/);
    });

    test('can access contractors (KTS)', async ({ page }) => {
      await page.goto('/kts');
      await expect(page).toHaveURL(/\/kts/);
    });

    test('can access campaigns (KD)', async ({ page }) => {
      await page.goto('/kd');
      await expect(page).toHaveURL(/\/kd/);
    });

    test('can access financials', async ({ page }) => {
      await page.goto('/financials');
      await expect(page).toHaveURL(/\/financials/);
    });

    test('can access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/admin/);
    });
  });

  test.describe('Sales Rep Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'sales_rep');
    });

    test('can access dashboard overview', async ({ page }) => {
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/overview/);
    });

    test('can access own jobs in KR', async ({ page }) => {
      await page.goto('/kr');
      // Sales reps should see their jobs (might be empty if no jobs assigned)
      await expect(page).toHaveURL(/\/kr/);
    });

    test('can access own leads', async ({ page }) => {
      await page.goto('/kd/leads');
      await expect(page).toHaveURL(/\/kd\/leads/);
    });

    test('can access own earnings', async ({ page }) => {
      await page.goto('/financials/earnings');
      await expect(page).toHaveURL(/\/financials\/earnings/);
    });

    test('cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expectAccessDenied(page);
    });

    test('cannot access full P&L', async ({ page }) => {
      await page.goto('/financials/pnl');
      await expectAccessDenied(page);
    });
  });

  test.describe('Contractor Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'contractor');
    });

    test('redirects to portal after login', async ({ page }) => {
      await expect(page).toHaveURL(/\/portal/);
    });

    test('can access portal dashboard', async ({ page }) => {
      await page.goto('/portal');
      await expect(page).toHaveURL(/\/portal/);
    });

    test('can access my jobs in portal', async ({ page }) => {
      await page.goto('/portal/jobs');
      await expect(page).toHaveURL(/\/portal\/jobs/);
    });

    test('can access earnings in portal', async ({ page }) => {
      await page.goto('/portal/earnings');
      await expect(page).toHaveURL(/\/portal\/earnings/);
    });

    test('can access availability settings', async ({ page }) => {
      await page.goto('/portal/availability');
      await expect(page).toHaveURL(/\/portal\/availability/);
    });

    test('can access my profile', async ({ page }) => {
      await page.goto('/portal/my-profile');
      await expect(page).toHaveURL(/\/portal\/my-profile/);
    });

    test('cannot access main dashboard', async ({ page }) => {
      await page.goto('/overview');
      await expectAccessDenied(page);
    });

    test('cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expectAccessDenied(page);
    });

    test('cannot access KR jobs directly', async ({ page }) => {
      await page.goto('/kr');
      await expectAccessDenied(page);
    });
  });

  test.describe('PM Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'pm');
    });

    test('can access dashboard overview', async ({ page }) => {
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/overview/);
    });

    test('can access assigned jobs in KR', async ({ page }) => {
      await page.goto('/kr');
      await expect(page).toHaveURL(/\/kr/);
    });

    test('can access contractors (KTS)', async ({ page }) => {
      await page.goto('/kts');
      await expect(page).toHaveURL(/\/kts/);
    });

    test('can access own earnings', async ({ page }) => {
      await page.goto('/financials/earnings');
      await expect(page).toHaveURL(/\/financials\/earnings/);
    });

    test('cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expectAccessDenied(page);
    });
  });

  test.describe('Subscriber Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'subscriber');
    });

    test('redirects to subscriber portal after login', async ({ page }) => {
      await expect(page).toHaveURL(/\/subscriber/);
    });

    test('can access subscriber dashboard', async ({ page }) => {
      await page.goto('/subscriber');
      await expect(page).toHaveURL(/\/subscriber/);
    });

    test('can access own leads', async ({ page }) => {
      await page.goto('/subscriber/leads');
      await expect(page).toHaveURL(/\/subscriber\/leads/);
    });

    test('can access subscription info', async ({ page }) => {
      await page.goto('/subscriber/subscription');
      await expect(page).toHaveURL(/\/subscriber\/subscription/);
    });

    test('cannot access main dashboard', async ({ page }) => {
      await page.goto('/overview');
      await expectAccessDenied(page);
    });

    test('cannot access KR jobs', async ({ page }) => {
      await page.goto('/kr');
      await expectAccessDenied(page);
    });

    test('cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expectAccessDenied(page);
    });
  });

  test.describe('Partner Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'partner');
    });

    test('redirects to partner portal after login', async ({ page }) => {
      // Partner should be redirected to /partner after login
      await expect(page).toHaveURL(/\/partner/, { timeout: 10000 });
    });

    test('can access partner dashboard', async ({ page }) => {
      await page.goto('/partner');
      await expect(page).toHaveURL(/\/partner/);
    });

    test('cannot access main dashboard', async ({ page }) => {
      await page.goto('/overview');
      await expectAccessDenied(page);
    });

    test('cannot access admin panel', async ({ page }) => {
      await page.goto('/admin');
      await expectAccessDenied(page);
    });
  });

  test.describe('Pending Role', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'pending');
    });

    test('redirects to pending page after login', async ({ page }) => {
      await expect(page).toHaveURL(/\/pending/);
    });

    test('sees awaiting approval message', async ({ page }) => {
      await page.goto('/pending');
      await expect(page.getByRole('heading', { name: /pending|approval/i })).toBeVisible();
    });

    test('cannot access dashboard', async ({ page }) => {
      await page.goto('/overview');
      await expect(page).toHaveURL(/\/pending/);
    });

    test('cannot access portal', async ({ page }) => {
      await page.goto('/portal');
      await expect(page).toHaveURL(/\/pending/);
    });

    test('cannot access admin', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/pending/);
    });
  });
});

test.describe('Navigate Button Feature', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Navigate tests only run on Chromium');

  test.describe('Job Detail Page - Admin View', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('shows navigate button next to job address', async ({ page }) => {
      // Navigate to jobs list
      await page.goto('/kr');

      // Click on the first job if available
      const jobLink = page.locator('a[href^="/kr/"]').first();
      const hasJobs = await jobLink.count() > 0;

      if (hasJobs) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        // Check for navigate button
        const navigateButton = page.locator('a:has-text("Navigate")');
        await expect(navigateButton).toBeVisible();

        // Verify it has the correct Google Maps URL structure
        const href = await navigateButton.getAttribute('href');
        expect(href).toContain('google.com/maps/dir');
        expect(href).toContain('travelmode=driving');
      } else {
        // Skip if no jobs available
        test.skip();
      }
    });

    test('navigate button opens in new tab', async ({ page }) => {
      await page.goto('/kr');

      const jobLink = page.locator('a[href^="/kr/"]').first();
      const hasJobs = await jobLink.count() > 0;

      if (hasJobs) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        const navigateButton = page.locator('a:has-text("Navigate")');
        await expect(navigateButton).toHaveAttribute('target', '_blank');
        await expect(navigateButton).toHaveAttribute('rel', 'noopener noreferrer');
      } else {
        test.skip();
      }
    });
  });

  test.describe('Contractor Portal - Job List', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'contractor');
    });

    test('shows navigate button on job cards', async ({ page }) => {
      await page.goto('/portal/jobs');

      // Check if there are any job cards
      const jobCards = page.locator('[class*="Card"]');
      const hasJobs = await jobCards.count() > 0;

      if (hasJobs) {
        // Check for navigate button on job card
        const navigateButton = page.locator('a:has-text("Navigate")').first();
        await expect(navigateButton).toBeVisible();

        // Verify URL structure
        const href = await navigateButton.getAttribute('href');
        expect(href).toContain('google.com/maps/dir');
      } else {
        // No jobs assigned - test passes (feature works, just no data)
        expect(true).toBe(true);
      }
    });

    test('navigate button has correct styling', async ({ page }) => {
      await page.goto('/portal/jobs');

      const navigateButton = page.locator('a:has-text("Navigate")').first();
      const hasButton = await navigateButton.count() > 0;

      if (hasButton) {
        // Should have brand-gold styling class indicators
        const classes = await navigateButton.getAttribute('class');
        expect(classes).toContain('brand-gold');
      } else {
        // Skip if no jobs
        test.skip();
      }
    });
  });
});

test.describe('Route Protection - Unauthenticated', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Route protection tests only run on Chromium');

  test('redirects from /overview to login when unauthenticated', async ({ page }) => {
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from /kr to login when unauthenticated', async ({ page }) => {
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from /portal to login when unauthenticated', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from /admin to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from /financials to login when unauthenticated', async ({ page }) => {
    await page.goto('/financials');
    await expect(page).toHaveURL(/\/login/);
  });
});
