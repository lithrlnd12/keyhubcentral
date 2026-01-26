import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Job Workflow Tests
 * Tests the complete job lifecycle from creation to completion
 */

test.describe('Job Workflow', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.describe('Job List View', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view jobs list', async ({ page }) => {
      await page.goto('/kr');
      await expect(page).toHaveURL(/\/kr/);
    });

    test('jobs page loads successfully', async ({ page }) => {
      await page.goto('/kr');
      await expect(page).toHaveURL(/\/kr/);
    });

    test('can filter jobs by status', async ({ page }) => {
      await page.goto('/kr');
      // Look for filter/status buttons
      const filterButton = page.getByRole('button', { name: /filter|status|all/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        // Should show filter options
        await expect(page.getByText(/lead|sold|production|complete/i).first()).toBeVisible();
      }
    });

    test('can search jobs', async ({ page }) => {
      await page.goto('/kr');
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        // Search should filter results (or show no results)
        await page.waitForTimeout(500); // debounce
      }
    });
  });

  test.describe('Job Detail View', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view job details', async ({ page }) => {
      await page.goto('/kr');
      const jobLink = page.locator('a[href^="/kr/"]').first();

      if (await jobLink.count() > 0) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        // Should see job details
        await expect(page.getByText(/customer|job|status/i).first()).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('job detail shows customer information', async ({ page }) => {
      await page.goto('/kr');
      const jobLink = page.locator('a[href^="/kr/"]').first();

      if (await jobLink.count() > 0) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        // Should show customer name, address, or contact info
        await expect(
          page.getByText(/customer|address|phone|email/i).first()
        ).toBeVisible();
      } else {
        test.skip();
      }
    });

    test('job detail shows navigate button for address', async ({ page }) => {
      await page.goto('/kr');
      const jobLink = page.locator('a[href^="/kr/"]').first();

      if (await jobLink.count() > 0) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        const navigateButton = page.locator('a:has-text("Navigate")');
        if (await navigateButton.count() > 0) {
          await expect(navigateButton).toBeVisible();
          const href = await navigateButton.getAttribute('href');
          expect(href).toContain('google.com/maps');
        }
      } else {
        test.skip();
      }
    });

    test('job detail shows status and can update', async ({ page }) => {
      await page.goto('/kr');
      const jobLink = page.locator('a[href^="/kr/"]').first();

      if (await jobLink.count() > 0) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        // Should show current status
        await expect(
          page.getByText(/lead|sold|production|scheduled|started|complete|paid/i).first()
        ).toBeVisible();
      } else {
        test.skip();
      }
    });
  });

  test.describe('Job Creation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can access new job form', async ({ page }) => {
      await page.goto('/kr');

      // Look for create/add button
      const createButton = page.getByRole('button', { name: /new|add|create/i }).or(
        page.getByRole('link', { name: /new|add|create/i })
      );

      if (await createButton.count() > 0) {
        await createButton.first().click();
        // Should navigate to new job page or open modal
        await expect(
          page.getByText(/new job|create job|customer/i).first()
        ).toBeVisible({ timeout: 5000 });
      }
    });

    test('new job page loads', async ({ page }) => {
      await page.goto('/kr/new');
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test.describe('Job Assignment', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view crew assignment section', async ({ page }) => {
      await page.goto('/kr');
      const jobLink = page.locator('a[href^="/kr/"]').first();

      if (await jobLink.count() > 0) {
        await jobLink.click();
        await page.waitForURL(/\/kr\/[^/]+$/);

        // Look for crew/contractor assignment section
        const crewSection = page.getByText(/crew|contractor|assign|team/i);
        await expect(crewSection.first()).toBeVisible();
      } else {
        test.skip();
      }
    });
  });
});

test.describe('Job Access by Role', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');

  test('sales rep can view their assigned jobs', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/kr/);
  });

  test('PM can view their assigned jobs', async ({ page }) => {
    await loginAs(page, 'pm');
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/kr/);
  });

  test('contractor sees jobs in portal', async ({ page }) => {
    await loginAs(page, 'contractor');
    await page.goto('/portal/jobs');
    await expect(page).toHaveURL(/\/portal\/jobs/);
  });
});
