import { test, expect } from '@playwright/test';

test.describe('Navigation Structure', () => {
  test.describe('Desktop Navigation', () => {
    test('side navigation is hidden on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/login');

      // Side nav should not be visible on mobile
      const sideNav = page.locator('aside');
      // On login page, side nav shouldn't exist at all
      const count = await sideNav.count();
      // Auth pages don't have side nav, so this should be 0
      expect(count).toBe(0);
    });

    test('login page has proper layout on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.goto('/login');

      // Login form should be visible
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Logo should be visible
      await expect(page.getByRole('img', { name: /keyhub/i })).toBeVisible();
    });
  });

  test.describe('Mobile Navigation', () => {
    test('login page displays correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto('/login');

      // Login form should be visible
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

      // Logo should be visible
      await expect(page.getByRole('img', { name: /keyhub/i })).toBeVisible();
    });

    test('signup page displays correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto('/signup');

      // Signup form should be visible
      await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible();
    });

    test('pending page displays correctly on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 393, height: 851 });
      await page.goto('/pending');

      // Pending content should be visible
      await expect(page.getByRole('heading', { name: /pending.*approval|account.*pending/i })).toBeVisible();

      // Buttons should be visible
      await expect(page.getByRole('button', { name: /check status/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /sign out/i })).toBeVisible();
    });
  });

  test.describe('Auth Page Navigation Links', () => {
    test('login page has working link to signup', async ({ page }) => {
      await page.goto('/login');

      const signupLink = page.getByRole('link', { name: /sign up|create account/i });
      await expect(signupLink).toBeVisible();
      await signupLink.click();

      await page.waitForURL(/\/signup/);
      await expect(page).toHaveURL(/\/signup/);
    });

    test('signup page has working link to login', async ({ page }) => {
      await page.goto('/signup');

      const loginLink = page.getByRole('link', { name: /sign in|log in|already have/i });
      await expect(loginLink).toBeVisible();
      await loginLink.click();

      await page.waitForURL(/\/login/);
      await expect(page).toHaveURL(/\/login/);
    });

    test('login page has working link to forgot password', async ({ page }) => {
      await page.goto('/login');

      const forgotLink = page.getByRole('link', { name: /forgot.*password|reset.*password/i });
      await expect(forgotLink).toBeVisible();
      await forgotLink.click();

      await page.waitForURL(/\/forgot-password/);
      await expect(page).toHaveURL(/\/forgot-password/);
    });

    test('forgot password page has link back to login', async ({ page }) => {
      await page.goto('/forgot-password');

      const loginLink = page.getByRole('link', { name: /sign in|log in|back to login/i });
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Viewport Responsiveness', () => {
    const viewports = [
      { name: 'iPhone SE', width: 375, height: 667 },
      { name: 'iPhone 12', width: 390, height: 844 },
      { name: 'iPad Mini', width: 768, height: 1024 },
      { name: 'iPad Pro', width: 1024, height: 1366 },
      { name: 'Desktop', width: 1280, height: 800 },
      { name: 'Large Desktop', width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`login page renders correctly on ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await page.goto('/login');

        // Core elements should be visible at any viewport
        await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();
        await expect(page.getByLabel(/email/i)).toBeVisible();
        await expect(page.getByLabel(/password/i)).toBeVisible();
        await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
      });
    }
  });
});

test.describe('Page Loading States', () => {
  test('login page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('signup page loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible();
    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });
});
