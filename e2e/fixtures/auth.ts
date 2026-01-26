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

  // Navigate to login page
  await page.goto('/login');

  // Wait for form to be ready
  await page.waitForSelector('input[type="email"]');

  // Fill in credentials
  const emailInput = page.getByLabel(/email/i);
  const passwordInput = page.getByLabel(/password/i);

  await emailInput.click();
  await emailInput.fill(user.email);

  await passwordInput.click();
  await passwordInput.fill(user.password);

  // Submit form
  await page.getByRole('button', { name: /sign in|log in/i }).click();

  // Wait for navigation away from login page
  await page.waitForURL((url) => !url.pathname.includes('/login'), {
    timeout: 10000,
  });
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
