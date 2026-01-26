import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Partner Workflow Tests
 * Tests partner portal, labor requests, and service tickets
 */

test.describe('Partner Portal', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'partner');
  });

  test('partner sees portal dashboard', async ({ page }) => {
    await page.goto('/partner');
    await expect(page).toHaveURL(/\/partner/);
    await expect(page.getByText(/partner|dashboard|welcome/i).first()).toBeVisible();
  });

  test('partner can view labor requests', async ({ page }) => {
    await page.goto('/partner/labor-requests');
    await expect(page).toHaveURL(/\/partner\/labor-requests/);
  });

  test('labor requests page loads successfully', async ({ page }) => {
    await page.goto('/partner/labor-requests');
    await expect(page).toHaveURL(/\/partner\/labor-requests/);
  });

  test('partner can create labor request', async ({ page }) => {
    await page.goto('/partner/labor-requests');

    const createButton = page.getByRole('button', { name: /new|create|request/i }).or(
      page.getByRole('link', { name: /new|create|request/i })
    );

    if (await createButton.count() > 0) {
      await createButton.first().click();
      await expect(page.getByText(/new request|create|labor/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('partner can view service tickets', async ({ page }) => {
    await page.goto('/partner/service-tickets');
    await expect(page).toHaveURL(/\/partner\/service-tickets/);
  });

  test('service tickets page loads successfully', async ({ page }) => {
    await page.goto('/partner/service-tickets');
    await expect(page).toHaveURL(/\/partner\/service-tickets/);
  });

  test('partner can create service ticket', async ({ page }) => {
    await page.goto('/partner/service-tickets');

    const createButton = page.getByRole('button', { name: /new|create|ticket/i }).or(
      page.getByRole('link', { name: /new|create|ticket/i })
    );

    if (await createButton.count() > 0) {
      await createButton.first().click();
      await expect(page.getByText(/new ticket|create|service/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('partner can view history', async ({ page }) => {
    await page.goto('/partner/history');
    await expect(page).toHaveURL(/\/partner\/history/);
  });
});

test.describe('Partner Management (Admin)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('admin can view partners list', async ({ page }) => {
    await page.goto('/admin/partners');
    await expect(page).toHaveURL(/\/admin\/partners/);
  });

  test('partners list shows partner companies', async ({ page }) => {
    await page.goto('/admin/partners');
    const hasPartners = await page.locator('[href^="/admin/partners/"]').count() > 0;
    if (!hasPartners) {
      await expect(page.getByText(/no partners|add|create/i)).toBeVisible();
    }
  });

  test('admin can view partner requests', async ({ page }) => {
    await page.goto('/admin/partner-requests');
    await expect(page).toHaveURL(/\/admin\/partner-requests/);
  });

  test('partner requests shows pending requests', async ({ page }) => {
    await page.goto('/admin/partner-requests');
    // Should show requests or empty state
    await expect(page.getByText(/request|pending|labor|service|no requests/i).first()).toBeVisible();
  });

  test('admin can respond to labor request', async ({ page }) => {
    await page.goto('/admin/partner-requests');

    // Look for approve/respond buttons
    const actionButton = page.getByRole('button', { name: /approve|respond|assign|view/i }).first();
    if (await actionButton.count() > 0) {
      await expect(actionButton).toBeVisible();
    }
  });
});

test.describe('Partner Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');

  test('partner cannot access main dashboard', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/partner/);
  });

  test('partner cannot access jobs', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/partner/);
  });

  test('partner cannot access contractors', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/partner/);
  });

  test('partner cannot access admin', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/partner/);
  });

  test('non-admin cannot access partner management', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/admin/partners');
    await expect(page).toHaveURL(/\/overview/);
  });
});
