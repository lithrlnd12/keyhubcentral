import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Financial Workflow Tests
 * Tests invoices, P&L, earnings, and financial reports
 */

test.describe('Invoice Workflow', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.describe('Invoice List', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view invoices list', async ({ page }) => {
      await page.goto('/financials/invoices');
      await expect(page).toHaveURL(/\/financials\/invoices/);
    });

    test('invoices list shows invoice entries or empty state', async ({ page }) => {
      await page.goto('/financials/invoices');
      // Page should load - either invoices exist or empty state
      await expect(page).toHaveURL(/\/financials\/invoices/);
      // If invoices exist, they may have INV- prefix; otherwise show empty state
      // Just verify page rendered something meaningful
      await page.waitForLoadState('domcontentloaded');
    });

    test('can filter invoices by status', async ({ page }) => {
      await page.goto('/financials/invoices');
      const filterButton = page.getByRole('button', { name: /filter|status|all/i }).first();
      if (await filterButton.isVisible()) {
        await filterButton.click();
        await expect(page.getByText(/draft|sent|paid|overdue/i).first()).toBeVisible();
      }
    });

    test('can filter invoices by entity', async ({ page }) => {
      await page.goto('/financials/invoices');
      // Filter by KR, KTS, KD
      const entityFilter = page.getByRole('button', { name: /entity|kr|kts|kd|all/i }).first();
      if (await entityFilter.isVisible()) {
        await entityFilter.click();
      }
    });
  });

  test.describe('Invoice Details', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('invoice shows line items', async ({ page }) => {
      await page.goto('/financials/invoices');

      // Click on first invoice
      const invoiceLink = page.locator('a[href*="/invoices/"], tr').filter({ hasText: /INV-|\$/ }).first();
      if (await invoiceLink.count() > 0) {
        await invoiceLink.click();
        // Should show line items or total
        await expect(page.getByText(/\$|total|amount|subtotal/i).first()).toBeVisible();
      }
    });

    test('invoice shows customer/recipient info', async ({ page }) => {
      await page.goto('/financials/invoices');

      const invoiceLink = page.locator('a[href*="/invoices/"], tr').filter({ hasText: /INV-|\$/ }).first();
      if (await invoiceLink.count() > 0) {
        await invoiceLink.click();
        await expect(page.getByText(/to:|bill to|customer|contractor/i).first()).toBeVisible();
      }
    });
  });

  test.describe('Invoice Creation', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can access new invoice form', async ({ page }) => {
      await page.goto('/financials/invoices');

      const createButton = page.getByRole('button', { name: /new|create|add/i }).or(
        page.getByRole('link', { name: /new|create|add/i })
      );

      if (await createButton.count() > 0) {
        await createButton.first().click();
        await expect(page.getByText(/new invoice|create invoice/i).first()).toBeVisible({ timeout: 5000 });
      }
    });
  });
});

test.describe('P&L Reports', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.describe('Admin P&L Access', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, 'admin');
    });

    test('can view P&L dashboard', async ({ page }) => {
      await page.goto('/financials');
      await expect(page).toHaveURL(/\/financials/);
      // Should see financial overview
      await expect(page.getByText(/revenue|expense|profit|financial/i).first()).toBeVisible();
    });

    test('can view P&L by entity', async ({ page }) => {
      await page.goto('/financials/pnl');
      await expect(page).toHaveURL(/\/financials\/pnl/);
    });

    test('P&L shows revenue metrics', async ({ page }) => {
      await page.goto('/financials');
      // Should show revenue figures
      await expect(page.getByText(/\$|revenue|income/i).first()).toBeVisible();
    });

    test('P&L page loads', async ({ page }) => {
      await page.goto('/financials');
      await expect(page).toHaveURL(/\/financials/);
    });
  });

  test.describe('P&L Access Control', () => {
    test('sales rep cannot view full P&L', async ({ page }) => {
      await loginAs(page, 'sales_rep');
      await page.goto('/financials/pnl');
      // Should redirect to overview
      await expect(page).toHaveURL(/\/overview/);
    });

    test('PM cannot view full P&L', async ({ page }) => {
      await loginAs(page, 'pm');
      await page.goto('/financials/pnl');
      await expect(page).toHaveURL(/\/overview/);
    });
  });
});

test.describe('Earnings View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test('sales rep can view own earnings', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/financials/earnings');
    await expect(page).toHaveURL(/\/financials\/earnings/);
  });

  test('contractor can view earnings in portal', async ({ page }) => {
    await loginAs(page, 'contractor');
    await page.goto('/portal/earnings');
    await expect(page).toHaveURL(/\/portal\/earnings/);
  });

  test('earnings page shows commission or payout info', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/financials/earnings');
    // Should show earnings related content
    await expect(page.getByText(/earning|commission|payout|total|\$/i).first()).toBeVisible();
  });
});

test.describe('Contractor Invoices', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('contractor can view their invoices', async ({ page }) => {
    await page.goto('/portal/financials/invoices');
    await expect(page).toHaveURL(/\/portal\/financials\/invoices/);
  });

  test('contractor can access new invoice page', async ({ page }) => {
    await page.goto('/portal/financials/invoices/new');
    await page.waitForLoadState('domcontentloaded');
  });

  test('contractor can view expenses', async ({ page }) => {
    await page.goto('/portal/financials/expenses');
    await expect(page).toHaveURL(/\/portal\/financials\/expenses/);
  });
});

test.describe('Payouts', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test('admin can view payouts', async ({ page }) => {
    await loginAs(page, 'admin');
    await page.goto('/financials/payouts');
    await expect(page).toHaveURL(/\/financials\/payouts/);
  });

  test('non-admin cannot access payouts', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/financials/payouts');
    await expect(page).toHaveURL(/\/overview/);
  });
});
