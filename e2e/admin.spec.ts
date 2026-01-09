import { test, expect } from '@playwright/test';

test.describe('Admin Page', () => {
  test('redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from admin seed page when unauthenticated', async ({ page }) => {
    await page.goto('/admin/seed');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from admin partners page when unauthenticated', async ({ page }) => {
    await page.goto('/admin/partners');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects from admin partner requests page when unauthenticated', async ({ page }) => {
    await page.goto('/admin/partner-requests');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('User Management Routes', () => {
  test.describe('KTS Contractor Management', () => {
    test('redirects from contractor list when unauthenticated', async ({ page }) => {
      await page.goto('/kts');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from new contractor page when unauthenticated', async ({ page }) => {
      await page.goto('/kts/new');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from contractor availability when unauthenticated', async ({ page }) => {
      await page.goto('/kts/availability');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Inventory Management', () => {
    test('redirects from inventory page when unauthenticated', async ({ page }) => {
      await page.goto('/kts/inventory');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from inventory items when unauthenticated', async ({ page }) => {
      await page.goto('/kts/inventory/items');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from inventory receipts when unauthenticated', async ({ page }) => {
      await page.goto('/kts/inventory/receipts');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from inventory count when unauthenticated', async ({ page }) => {
      await page.goto('/kts/inventory/count');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from inventory alerts when unauthenticated', async ({ page }) => {
      await page.goto('/kts/inventory/alerts');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Financial Management', () => {
    test('redirects from financials page when unauthenticated', async ({ page }) => {
      await page.goto('/financials');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from invoices page when unauthenticated', async ({ page }) => {
      await page.goto('/financials/invoices');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from new invoice page when unauthenticated', async ({ page }) => {
      await page.goto('/financials/invoices/new');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from earnings page when unauthenticated', async ({ page }) => {
      await page.goto('/financials/earnings');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from expenses page when unauthenticated', async ({ page }) => {
      await page.goto('/financials/expenses');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from P&L page when unauthenticated', async ({ page }) => {
      await page.goto('/financials/pnl');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
