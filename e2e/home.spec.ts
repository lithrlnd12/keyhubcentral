import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test('home page redirects to login for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // Should redirect to login
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('has correct meta tags', async ({ page }) => {
    await page.goto('/login');

    // Check meta description
    const description = await page.getAttribute('meta[name="description"]', 'content');
    expect(description).toContain('KeyHub');
  });

  test('has PWA manifest linked', async ({ page }) => {
    await page.goto('/login');

    // Check manifest link exists
    const manifest = await page.getAttribute('link[rel="manifest"]', 'href');
    expect(manifest).toBe('/manifest.json');
  });

  test('has correct theme color', async ({ page }) => {
    await page.goto('/login');

    const themeColor = await page.getAttribute('meta[name="theme-color"]', 'content');
    expect(themeColor).toBe('#1A1A1A');
  });
});

test.describe('404 Page', () => {
  test('shows 404 page for non-existent routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should show 404 content
    await expect(page.getByText(/404|not found/i)).toBeVisible();
  });

  test('404 page has navigation options', async ({ page }) => {
    await page.goto('/this-page-does-not-exist');

    // Should have button to go back or to home
    const homeButton = page.getByRole('link', { name: /dashboard|home|login/i });
    await expect(homeButton).toBeVisible();
  });
});
