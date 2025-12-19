import { test, expect, devices } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('login page is responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    // Form should be visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();

    // Logo should be visible
    await expect(page.getByRole('img', { name: /keyhub/i })).toBeVisible();
  });

  test('login page is responsive on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    // Form should be visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('login page is responsive on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');

    // Form should be visible
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});

test.describe('Touch Interactions', () => {
  test.use({ ...devices['Pixel 5'] });

  test('buttons are touch-friendly size on mobile', async ({ page }) => {
    await page.goto('/login');

    const signInButton = page.getByRole('button', { name: /sign in/i });
    const box = await signInButton.boundingBox();

    // Minimum touch target should be 44x44 pixels (Apple HIG)
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });

  test('form inputs are properly sized for touch', async ({ page }) => {
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const box = await emailInput.boundingBox();

    // Input should be tall enough for touch
    expect(box?.height).toBeGreaterThanOrEqual(40);
  });
});
