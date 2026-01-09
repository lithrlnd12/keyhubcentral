import { test, expect } from '@playwright/test';

test.describe('Dashboard Routes', () => {
  test.describe('Route Protection', () => {
    test('redirects from /overview to login when unauthenticated', async ({ page }) => {
      await page.goto('/overview');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /kts to login when unauthenticated', async ({ page }) => {
      await page.goto('/kts');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /kr to login when unauthenticated', async ({ page }) => {
      await page.goto('/kr');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /kd to login when unauthenticated', async ({ page }) => {
      await page.goto('/kd');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /financials to login when unauthenticated', async ({ page }) => {
      await page.goto('/financials');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /admin to login when unauthenticated', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /profile to login when unauthenticated', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /settings to login when unauthenticated', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Portal Routes', () => {
    test('redirects from /portal to login when unauthenticated', async ({ page }) => {
      await page.goto('/portal');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /portal/jobs to login when unauthenticated', async ({ page }) => {
      await page.goto('/portal/jobs');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /portal/earnings to login when unauthenticated', async ({ page }) => {
      await page.goto('/portal/earnings');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Partner Routes', () => {
    test('redirects from /partner to login when unauthenticated', async ({ page }) => {
      await page.goto('/partner');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /partner/labor-requests to login when unauthenticated', async ({ page }) => {
      await page.goto('/partner/labor-requests');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /partner/service-tickets to login when unauthenticated', async ({ page }) => {
      await page.goto('/partner/service-tickets');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Subscriber Routes', () => {
    test('redirects from /subscriber to login when unauthenticated', async ({ page }) => {
      await page.goto('/subscriber');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('redirects from /subscriber/leads to login when unauthenticated', async ({ page }) => {
      await page.goto('/subscriber/leads');
      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

test.describe('Pending Approval Page', () => {
  test('pending page loads correctly', async ({ page }) => {
    await page.goto('/pending');

    // Should show pending approval content
    await expect(page.getByRole('heading', { name: /pending.*approval|account.*pending/i })).toBeVisible();
  });

  test('pending page has check status button', async ({ page }) => {
    await page.goto('/pending');

    const checkStatusButton = page.getByRole('button', { name: /check status/i });
    await expect(checkStatusButton).toBeVisible();
  });

  test('pending page has sign out button', async ({ page }) => {
    await page.goto('/pending');

    const signOutButton = page.getByRole('button', { name: /sign out/i });
    await expect(signOutButton).toBeVisible();
  });
});
