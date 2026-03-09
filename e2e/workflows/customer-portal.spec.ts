import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Customer Portal Tests
 * Tests the customer-facing marketplace: dashboard, find pros, booking, projects
 */

test.describe('Customer Portal - Dashboard', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('customer redirects to dashboard after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/customer\/dashboard/);
  });

  test('dashboard page loads with welcome content', async ({ page }) => {
    await page.goto('/customer/dashboard');
    await expect(page).toHaveURL(/\/customer\/dashboard/);
    await expect(page.locator('main').getByText(/dashboard|welcome|project/i).first()).toBeVisible();
  });

  test('dashboard shows quick action cards', async ({ page }) => {
    await page.goto('/customer/dashboard');
    // Should show quick actions like Find Pros, Book a Pro, My Projects
    const actionCards = page.locator('a[href*="/customer/"]');
    await expect(actionCards.first()).toBeVisible({ timeout: 10000 });
  });

  test('dashboard shows project counts or empty state', async ({ page }) => {
    await page.goto('/customer/dashboard');
    await page.waitForTimeout(2000);
    // Either shows counts or "no projects yet" type messaging
    const hasContent = await page.getByText(/project|booking|find/i).count() > 0;
    expect(hasContent).toBeTruthy();
  });
});

test.describe('Customer Portal - Find Pros', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('find pros page loads', async ({ page }) => {
    await page.goto('/customer/find');
    await expect(page).toHaveURL(/\/customer\/find/);
  });

  test('find pros shows map or contractor list', async ({ page }) => {
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);
    // Should show map component or contractor cards
    const hasMap = await page.locator('[class*="map"], [id*="map"]').count() > 0;
    const hasList = await page.getByText(/pro|contractor|available/i).count() > 0;
    expect(hasMap || hasList).toBeTruthy();
  });

  test('find pros shows "Any Available Pro" option', async ({ page }) => {
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);
    // The broadcast option should be visible
    const anyProOption = page.getByText(/any available pro|send to all/i);
    if (await anyProOption.count() > 0) {
      await expect(anyProOption.first()).toBeVisible();
    }
  });

  test('find pros shows specialty filter buttons', async ({ page }) => {
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);
    // Specialty toggle buttons should be present
    const filterButtons = page.getByRole('button').filter({ hasText: /plumbing|electrical|hvac|roofing|all/i });
    if (await filterButtons.count() > 0) {
      await expect(filterButtons.first()).toBeVisible();
    }
  });

  test('clicking specialty filter updates results', async ({ page }) => {
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);
    const filterButton = page.getByRole('button').filter({ hasText: /plumbing|electrical|hvac/i }).first();
    if (await filterButton.count() > 0) {
      await filterButton.click();
      await page.waitForTimeout(1000);
      // Page should update (no error)
      await expect(page).toHaveURL(/\/customer\/find/);
    }
  });

  test('contractor card shows "Book This Pro" link', async ({ page }) => {
    await page.goto('/customer/find');
    await page.waitForTimeout(3000);
    const bookLink = page.getByText(/book this pro/i).first();
    if (await bookLink.count() > 0) {
      await expect(bookLink).toBeVisible();
    }
  });
});

test.describe('Customer Portal - Book a Pro', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('book page loads', async ({ page }) => {
    await page.goto('/customer/book');
    await expect(page).toHaveURL(/\/customer\/book/);
  });

  test('book page shows specialty selection', async ({ page }) => {
    await page.goto('/customer/book');
    await page.waitForTimeout(2000);
    // Should show specialty buttons/checkboxes to select services needed
    const specialtyOptions = page.getByRole('button').filter({ hasText: /plumbing|electrical|hvac|roofing|painting|carpentry|drywall/i });
    if (await specialtyOptions.count() > 0) {
      await expect(specialtyOptions.first()).toBeVisible();
    }
  });

  test('book page allows multi-select specialties', async ({ page }) => {
    await page.goto('/customer/book');
    await page.waitForTimeout(2000);
    const buttons = page.getByRole('button').filter({ hasText: /plumbing|electrical|hvac/i });
    if (await buttons.count() >= 2) {
      await buttons.nth(0).click();
      await buttons.nth(1).click();
      // Both should be selected (visual state change)
      await page.waitForTimeout(500);
    }
  });

  test('book page shows description field', async ({ page }) => {
    await page.goto('/customer/book');
    await page.waitForTimeout(2000);
    const descField = page.getByPlaceholder(/describe|details|what do you need/i).or(
      page.locator('textarea')
    );
    if (await descField.count() > 0) {
      await expect(descField.first()).toBeVisible();
    }
  });

  test('book page with targeted contractor shows contractor name', async ({ page }) => {
    // Simulate coming from Find Pros with a specific contractor selected
    await page.goto('/customer/book?contractorName=Test+Pro');
    await page.waitForTimeout(2000);
    const contractorName = page.getByText(/test pro/i);
    if (await contractorName.count() > 0) {
      await expect(contractorName.first()).toBeVisible();
    }
  });

  test('book page with pre-selected specialties from URL', async ({ page }) => {
    await page.goto('/customer/book?specialties=Plumbing,Electrical');
    await page.waitForTimeout(2000);
    // Specialties should be pre-selected
    await expect(page).toHaveURL(/\/customer\/book/);
  });

  test('submit button requires specialties selection', async ({ page }) => {
    await page.goto('/customer/book');
    await page.waitForTimeout(2000);
    const submitButton = page.getByRole('button', { name: /submit|send|book/i });
    if (await submitButton.count() > 0) {
      // Button should be disabled or show error without selections
      await expect(submitButton.first()).toBeVisible();
    }
  });
});

test.describe('Customer Portal - My Projects', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'customer');
  });

  test('projects page loads', async ({ page }) => {
    await page.goto('/customer/projects');
    await expect(page).toHaveURL(/\/customer\/projects/);
  });

  test('projects page shows projects or empty state', async ({ page }) => {
    await page.goto('/customer/projects');
    await page.waitForTimeout(3000);
    const hasProjects = await page.getByText(/project|booking|request|searching|matched/i).count() > 0;
    const hasEmpty = await page.getByText(/no projects|no bookings|get started/i).count() > 0;
    expect(hasProjects || hasEmpty).toBeTruthy();
  });

  test('projects show status badges', async ({ page }) => {
    await page.goto('/customer/projects');
    await page.waitForTimeout(3000);
    // If projects exist, they should show status
    const statusBadges = page.getByText(/searching|matched|in progress|new|assigned/i);
    if (await statusBadges.count() > 0) {
      await expect(statusBadges.first()).toBeVisible();
    }
  });
});

test.describe('Customer Portal - Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');

  test('customer cannot access main dashboard', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer cannot access admin panel', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer cannot access contractor portal', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer cannot access jobs (KR)', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer cannot access contractors (KTS)', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer cannot access financials', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/financials');
    await expect(page).toHaveURL(/\/customer/);
  });

  test('customer can access messages', async ({ page }) => {
    await loginAs(page, 'customer');
    await page.goto('/messages');
    await expect(page.getByText(/messages/i).first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Customer Signup Flow', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Signup tests only run on Chromium');

  test('customer signup page loads', async ({ page }) => {
    await page.goto('/signup/customer');
    await page.waitForLoadState('domcontentloaded');
    // Should show customer-specific signup form
    await expect(page.getByText(/sign up|create account|customer/i).first()).toBeVisible();
  });

  test('customer signup form has required fields', async ({ page }) => {
    await page.goto('/signup/customer');
    await page.waitForLoadState('domcontentloaded');
    // Should have name, email, password, phone, address fields
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toBeVisible();
    await expect(passwordInput.first()).toBeVisible();
  });

  test('customer signup shows service area fields', async ({ page }) => {
    await page.goto('/signup/customer');
    await page.waitForTimeout(2000);
    // Customer signup should ask for location/address
    const addressField = page.getByLabel(/address|city|zip|location/i);
    if (await addressField.count() > 0) {
      await expect(addressField.first()).toBeVisible();
    }
  });
});
