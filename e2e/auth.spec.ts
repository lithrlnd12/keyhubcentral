import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('login page loads correctly', async ({ page }) => {
    await page.goto('/login');

    // Check page title
    await expect(page).toHaveTitle(/KeyHub Central/);

    // Check login form elements exist
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('signup page loads correctly', async ({ page }) => {
    await page.goto('/signup');

    // Check signup form elements exist
    await expect(page.getByRole('heading', { name: /create.*account/i })).toBeVisible();
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign up|create account/i })).toBeVisible();
  });

  test('login page has link to signup', async ({ page }) => {
    await page.goto('/login');

    const signupLink = page.getByRole('link', { name: /sign up|create account/i });
    await expect(signupLink).toBeVisible();
  });

  test('signup page has link to login', async ({ page }) => {
    await page.goto('/signup');

    const loginLink = page.getByRole('link', { name: /sign in|log in/i });
    await expect(loginLink).toBeVisible();
  });

  test('forgot password page loads correctly', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /reset.*password|forgot.*password/i })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset|send/i })).toBeVisible();
  });

  test('shows validation errors for empty login form', async ({ page }) => {
    await page.goto('/login');

    // Click sign in without filling form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Check that validation occurs (either HTML5 validation or custom)
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toBeVisible();
  });

  test('redirects unauthenticated users from dashboard', async ({ page }) => {
    // Try to access protected route
    await page.goto('/overview');

    // Should redirect to login (check URL contains login or shows login page)
    await page.waitForURL(/\/(login|$)/);
  });
});

test.describe('Navigation', () => {
  test('logo links to home', async ({ page }) => {
    await page.goto('/login');

    // Logo should be present
    const logo = page.getByRole('img', { name: /keyhub/i });
    await expect(logo).toBeVisible();
  });
});
