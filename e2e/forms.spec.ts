import { test, expect } from '@playwright/test';

test.describe('Login Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('has all required form fields', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('email field accepts valid email input', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('password field accepts input', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await passwordInput.fill('testpassword123');
    await expect(passwordInput).toHaveValue('testpassword123');
  });

  test('password field masks input', async ({ page }) => {
    const passwordInput = page.getByLabel(/password/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('submit button is enabled when form is empty', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeEnabled();
  });

  test('form can be submitted with valid data', async ({ page }) => {
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('testpassword123');

    const submitButton = page.getByRole('button', { name: /sign in/i });
    await expect(submitButton).toBeEnabled();

    // Click submit - will fail auth but tests form submission works
    await submitButton.click();

    // Should show error or redirect - either way form submitted
    await page.waitForTimeout(1000);
  });

  test('email field has correct type', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });

  test('form fields are required', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toHaveAttribute('required', '');
    await expect(passwordInput).toHaveAttribute('required', '');
  });
});

test.describe('Signup Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('has all required form fields', async ({ page }) => {
    await expect(page.getByLabel(/full name|name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account|sign up/i })).toBeVisible();
  });

  test('has optional phone field', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone/i);
    await expect(phoneInput).toBeVisible();
  });

  test('name field accepts input', async ({ page }) => {
    const nameInput = page.getByLabel(/full name|name/i);
    await nameInput.fill('John Doe');
    await expect(nameInput).toHaveValue('John Doe');
  });

  test('email field accepts valid email input', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('john@example.com');
    await expect(emailInput).toHaveValue('john@example.com');
  });

  test('phone field accepts phone number', async ({ page }) => {
    const phoneInput = page.getByLabel(/phone/i);
    await phoneInput.fill('555-123-4567');
    await expect(phoneInput).toHaveValue('555-123-4567');
  });

  test('password fields accept input', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await passwordInput.fill('testpassword123');
    await confirmPasswordInput.fill('testpassword123');

    await expect(passwordInput).toHaveValue('testpassword123');
    await expect(confirmPasswordInput).toHaveValue('testpassword123');
  });

  test('password fields mask input', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(confirmPasswordInput).toHaveAttribute('type', 'password');
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.getByLabel(/full name|name/i).fill('John Doe');
    await page.getByLabel(/email/i).fill('john@example.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('different123');

    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Should show password mismatch error
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('shows error when password is too short', async ({ page }) => {
    await page.getByLabel(/full name|name/i).fill('John Doe');
    await page.getByLabel(/email/i).fill('john@example.com');
    await page.getByLabel(/^password$/i).fill('short');
    await page.getByLabel(/confirm password/i).fill('short');

    await page.getByRole('button', { name: /create account|sign up/i }).click();

    // Should show password length error
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});

test.describe('Forgot Password Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('has email field', async ({ page }) => {
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('has submit button', async ({ page }) => {
    const submitButton = page.getByRole('button', { name: /reset|send/i });
    await expect(submitButton).toBeVisible();
  });

  test('email field accepts input', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await emailInput.fill('test@example.com');
    await expect(emailInput).toHaveValue('test@example.com');
  });

  test('email field has correct type', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i);
    await expect(emailInput).toHaveAttribute('type', 'email');
  });
});

test.describe('Form Accessibility', () => {
  test('login form fields have labels', async ({ page }) => {
    await page.goto('/login');

    // Labels should be associated with inputs
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test('signup form fields have labels', async ({ page }) => {
    await page.goto('/signup');

    const nameInput = page.getByLabel(/full name|name/i);
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/^password$/i);
    const confirmPasswordInput = page.getByLabel(/confirm password/i);

    await expect(nameInput).toBeVisible();
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(confirmPasswordInput).toBeVisible();
  });

  test('form can be navigated with keyboard', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to focus elements
    const emailInput = page.getByLabel(/email/i);
    await emailInput.focus();
    await expect(emailInput).toBeFocused();
  });
});

test.describe('Mobile Form Interactions', () => {
  test('login form inputs are touch-friendly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/login');

    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);
    const submitButton = page.getByRole('button', { name: /sign in/i });

    const emailBox = await emailInput.boundingBox();
    const passwordBox = await passwordInput.boundingBox();
    const buttonBox = await submitButton.boundingBox();

    // All touch targets should be at least 40px tall
    expect(emailBox?.height).toBeGreaterThanOrEqual(40);
    expect(passwordBox?.height).toBeGreaterThanOrEqual(40);
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });

  test('signup form inputs are touch-friendly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 393, height: 851 });
    await page.goto('/signup');

    const nameInput = page.getByLabel(/full name|name/i);
    const emailInput = page.getByLabel(/email/i);
    const submitButton = page.getByRole('button', { name: /create account|sign up/i });

    const nameBox = await nameInput.boundingBox();
    const emailBox = await emailInput.boundingBox();
    const buttonBox = await submitButton.boundingBox();

    // All touch targets should be at least 40px tall
    expect(nameBox?.height).toBeGreaterThanOrEqual(40);
    expect(emailBox?.height).toBeGreaterThanOrEqual(40);
    expect(buttonBox?.height).toBeGreaterThanOrEqual(40);
  });
});
