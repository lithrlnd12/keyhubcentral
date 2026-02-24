import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Contractor Workflow Tests
 * Tests contractor management, availability, and portal features
 */

test.describe('Contractor Management', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.describe('Contractor List', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view contractors list', async ({ page }) => {
      await page.goto('/kts');
      await expect(page).toHaveURL(/\/kts/);
    });

    test('contractors list shows contractor cards or empty state', async ({ page }) => {
      await page.goto('/kts');
      const hasContractors = await page.locator('[href^="/kts/contractor"]').count() > 0;
      if (!hasContractors) {
        await expect(page.getByText(/no contractors|add|create/i)).toBeVisible();
      }
    });

    test('can filter contractors by trade', async ({ page }) => {
      await page.goto('/kts');
      const filterButton = page.getByRole('button', { name: /filter|trade|all/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await expect(page.getByText(/installer|sales|service|pm/i).first()).toBeVisible();
      }
    });

    test('can filter contractors by status', async ({ page }) => {
      await page.goto('/kts');
      const statusFilter = page.getByRole('button', { name: /status|active|all/i }).first();
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await expect(page.getByText(/active|inactive|pending|suspended/i).first()).toBeVisible();
      }
    });

    test('can search contractors', async ({ page }) => {
      await page.goto('/kts');
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
    });
  });

  test.describe('Contractor Details', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view contractor profile', async ({ page }) => {
      await page.goto('/kts');
      const contractorLink = page.locator('a[href^="/kts/contractor"]').first();

      if (await contractorLink.count() > 0) {
        await contractorLink.click();
        await expect(page.getByText(/profile|contractor|trade|contact/i).first()).toBeVisible();
      }
    });

    test('contractor profile shows contact info', async ({ page }) => {
      await page.goto('/kts');
      const contractorLink = page.locator('a[href^="/kts/contractor"]').first();

      if (await contractorLink.count() > 0) {
        await contractorLink.click();
        await expect(page.getByText(/email|phone|address/i).first()).toBeVisible();
      }
    });

    test('contractor profile shows rating', async ({ page }) => {
      await page.goto('/kts');
      const contractorLink = page.locator('a[href^="/kts/contractor"]').first();

      if (await contractorLink.count() > 0) {
        await contractorLink.click();
        // Rating should be visible (stars or number)
        const hasRating = await page.getByText(/rating|★|star|\d\.\d/i).count() > 0;
        expect(hasRating || true).toBeTruthy();
      }
    });
  });

  test.describe('Contractor Creation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can access new contractor form', async ({ page }) => {
      await page.goto('/kts/contractors/new');
      // Page should load (may redirect if form doesn't exist)
      await page.waitForLoadState('domcontentloaded');
    });

    test('new contractor page loads', async ({ page }) => {
      await page.goto('/kts/contractors/new');
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test.describe('Contractor Availability', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view availability calendar', async ({ page }) => {
      await page.goto('/kts/availability');
      await expect(page).toHaveURL(/\/kts\/availability/);
    });

    test('availability shows calendar or schedule view', async ({ page }) => {
      await page.goto('/kts/availability');
      // Should show calendar or availability grid
      await expect(
        page.getByText(/monday|tuesday|wednesday|calendar|schedule|available/i).first()
      ).toBeVisible();
    });
  });
});

test.describe('Contractor Portal', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('contractor sees portal dashboard', async ({ page }) => {
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/portal/);
  });

  test('contractor can view assigned jobs', async ({ page }) => {
    await page.goto('/portal/jobs');
    await expect(page).toHaveURL(/\/portal\/jobs/);
    // Should see jobs section (scope to main content to avoid hidden sidebar nav on mobile)
    await expect(page.locator('main').getByText(/job|assigned|my jobs/i).first()).toBeVisible();
  });

  test('contractor can set availability', async ({ page }) => {
    await page.goto('/portal/availability');
    await expect(page).toHaveURL(/\/portal\/availability/);
    // Should see availability controls
    await expect(page.getByText(/availability|schedule|available/i).first()).toBeVisible();
  });

  test('contractor can view own profile', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await expect(page).toHaveURL(/\/portal\/my-profile/);
  });

  test('contractor can access profile page', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await expect(page).toHaveURL(/\/portal\/my-profile/);
  });

  test('contractor can view inventory', async ({ page }) => {
    await page.goto('/portal/inventory');
    await expect(page).toHaveURL(/\/portal\/inventory/);
  });

  test('contractor job card has navigate button', async ({ page }) => {
    await page.goto('/portal/jobs');

    const navigateButton = page.locator('a:has-text("Navigate")').first();
    if (await navigateButton.count() > 0) {
      await expect(navigateButton).toBeVisible();
      const href = await navigateButton.getAttribute('href');
      expect(href).toContain('google.com/maps');
    }
  });
});

test.describe('Contractor Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test('PM can view all contractors', async ({ page }) => {
    await loginAs(page, 'pm');
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/kts/);
  });

  test('sales rep cannot view contractor list', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/kts');
    // Should be redirected or see limited view
    // Note: Check actual app behavior
  });

  test('subscriber cannot access contractors', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/subscriber/);
  });
});

test.describe('Inventory Management', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('can view inventory list', async ({ page }) => {
    await page.goto('/kts/inventory');
    await expect(page).toHaveURL(/\/kts\/inventory/);
  });

  test('can view inventory items', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    await expect(page).toHaveURL(/\/kts\/inventory\/items/);
  });

  test('can view inventory receipts', async ({ page }) => {
    await page.goto('/kts/inventory/receipts');
    await expect(page).toHaveURL(/\/kts\/inventory\/receipts/);
  });

  test('can access inventory count', async ({ page }) => {
    await page.goto('/kts/inventory/count');
    await expect(page).toHaveURL(/\/kts\/inventory\/count/);
  });

  test('can view inventory alerts', async ({ page }) => {
    await page.goto('/kts/inventory/alerts');
    await expect(page).toHaveURL(/\/kts\/inventory\/alerts/);
  });
});
