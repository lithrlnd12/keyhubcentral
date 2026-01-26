import { test as base, Page, expect } from '@playwright/test';

// Test user credentials - these should be created in Firebase for testing
// In production, use environment variables or a test seed script
export const TEST_USERS = {
  owner: {
    email: 'owner@keyhub.test',
    password: 'TestPassword123!',
    role: 'owner',
  },
  admin: {
    email: 'admin@keyhub.test',
    password: 'TestPassword123!',
    role: 'admin',
  },
  sales_rep: {
    email: 'salesrep@keyhub.test',
    password: 'TestPassword123!',
    role: 'sales_rep',
  },
  contractor: {
    email: 'contractor@keyhub.test',
    password: 'TestPassword123!',
    role: 'contractor',
  },
  pm: {
    email: 'pm@keyhub.test',
    password: 'TestPassword123!',
    role: 'pm',
  },
  subscriber: {
    email: 'subscriber@keyhub.test',
    password: 'TestPassword123!',
    role: 'subscriber',
  },
  partner: {
    email: 'partner@keyhub.test',
    password: 'TestPassword123!',
    role: 'partner',
  },
  pending: {
    email: 'pending@keyhub.test',
    password: 'TestPassword123!',
    role: 'pending',
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;

/**
 * Login helper function
 */
export async function loginAs(page: Page, role: TestUserRole): Promise<void> {
  const user = TEST_USERS[role];

  // Clear any existing session to ensure clean login
  await page.context().clearCookies();

  // Small delay to avoid Firebase rate limiting (auth/quota-exceeded)
  await page.waitForTimeout(500);

  // Navigate to login page
  await page.goto('/login');

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  // Dismiss any modal that might be blocking (PWA install prompt, etc.)
  const maybeLater = page.getByRole('button', { name: /maybe later|close|dismiss/i });
  if (await maybeLater.count() > 0) {
    await maybeLater.first().click();
    await page.waitForTimeout(300);
  }

  // Fill in credentials
  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);

  await emailInput.click();
  await emailInput.fill(user.email);

  await passwordInput.click();
  await passwordInput.fill(user.password);

  // Submit form
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for navigation away from login page (or error message for rate limiting)
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), {
      timeout: 15000,
    });
  } catch {
    // Check if we hit rate limiting
    const errorText = await page.getByText(/quota|rate limit|too many/i).count();
    if (errorText > 0) {
      // Wait much longer for quota reset and retry multiple times
      for (let attempt = 0; attempt < 3; attempt++) {
        await page.waitForTimeout(5000 * (attempt + 1)); // 5s, 10s, 15s

        // Dismiss modal if present
        const maybeLater = page.getByRole('button', { name: /maybe later|close|dismiss/i });
        if (await maybeLater.count() > 0) {
          await maybeLater.first().click();
          await page.waitForTimeout(300);
        }

        await page.getByRole('button', { name: /sign in|log in/i }).click();

        try {
          await page.waitForURL((url) => !url.pathname.includes('/login'), {
            timeout: 10000,
          });
          return; // Success
        } catch {
          // Continue to next attempt
        }
      }
      throw new Error('Login failed after multiple retries - Firebase quota exceeded');
    } else {
      throw new Error('Login timeout - not rate limiting');
    }
  }
}

/**
 * Check if user is redirected to login
 */
export async function expectRedirectToLogin(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/login/);
}

/**
 * Check if user is on a specific page
 */
export async function expectToBeOnPage(page: Page, path: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(path));
}

/**
 * Check if access is denied (redirect to login, pending, portal, subscriber, partner, or overview)
 */
export async function expectAccessDenied(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/(login|pending|unauthorized|portal|subscriber|partner|overview)/);
}

/**
 * Extended test fixture with authentication helpers
 */
export const test = base.extend<{
  loginAs: (role: TestUserRole) => Promise<void>;
}>({
  loginAs: async ({ page }, use) => {
    await use(async (role: TestUserRole) => {
      await loginAs(page, role);
    });
  },
});

export { expect } from '@playwright/test';
