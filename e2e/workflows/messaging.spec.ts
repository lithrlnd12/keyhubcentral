import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';
import path from 'path';

/**
 * Messaging Workflow Tests
 * Tests conversation list, chat view, image upload, archive/delete,
 * new conversation flow, and read receipts.
 */

test.describe('Messaging - Conversation List', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
  });

  test('messages page loads correctly', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
    await expect(page.getByRole('heading', { name: /messages/i }).first()).toBeVisible();
  });

  test('conversation list shows conversations or empty state', async ({ page }) => {
    await page.goto('/messages');

    const hasConversations = await page.locator('[class*="cursor-pointer"]').count() > 0;
    if (hasConversations) {
      // At least one conversation visible
      await expect(page.locator('[class*="cursor-pointer"]').first()).toBeVisible();
    } else {
      // Empty state
      await expect(page.getByText(/no conversations/i)).toBeVisible();
    }
  });

  test('new message button is visible', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('button', { name: /new message/i }).first()).toBeVisible();
  });

  test('FAB compose button is visible', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByLabel(/new message/i)).toBeVisible();
  });

  test('right-click shows context menu on desktop', async ({ page }) => {
    await page.goto('/messages');

    // Wait for conversations to load
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click({ button: 'right' });

      // Context menu should appear with Archive and Delete
      await expect(page.getByRole('button', { name: /archive/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();

      // Dismiss by clicking elsewhere
      await page.locator('body').click();
      await expect(page.getByRole('button', { name: /archive/i })).not.toBeVisible();
    }
  });
});

test.describe('Messaging - New Conversation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
  });

  test('new conversation page loads', async ({ page }) => {
    await page.goto('/messages/new');
    await expect(page).toHaveURL(/\/messages\/new/);
    await expect(page.getByRole('heading', { name: /new message/i })).toBeVisible();
  });

  test('search input works', async ({ page }) => {
    await page.goto('/messages/new');

    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
  });

  test('role filter buttons are visible', async ({ page }) => {
    await page.goto('/messages/new');
    await page.waitForTimeout(2000); // Wait for users to load

    // "All" filter should be present
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
  });

  test('user list shows active users', async ({ page }) => {
    await page.goto('/messages/new');
    await page.waitForTimeout(3000); // Wait for users to load

    // Should show at least a loading state or user entries
    const hasUsers = await page.locator('button').filter({ hasText: /@|\.com/ }).count() > 0;
    const hasNoUsers = await page.getByText(/no users found/i).count() > 0;
    expect(hasUsers || hasNoUsers).toBeTruthy();
  });

  test('selecting a user enables start button', async ({ page }) => {
    await page.goto('/messages/new');
    await page.waitForTimeout(3000);

    // Click first user in the list (skip filter buttons)
    const userButtons = page.locator('button').filter({ hasText: /@|\.com/ });
    if (await userButtons.count() > 0) {
      await userButtons.first().click();

      // Start/message button should appear
      await expect(
        page.getByRole('button', { name: /message|start/i }).last()
      ).toBeVisible();
    }
  });

  test('group name input appears when selecting multiple users', async ({ page }) => {
    await page.goto('/messages/new');
    await page.waitForTimeout(3000);

    const userButtons = page.locator('button').filter({ hasText: /@|\.com/ });
    if (await userButtons.count() >= 2) {
      await userButtons.nth(0).click();
      await userButtons.nth(1).click();

      // Group name input should appear
      await expect(page.getByPlaceholder(/group name/i)).toBeVisible();
      // Start group button
      await expect(page.getByRole('button', { name: /start group/i })).toBeVisible();
    }
  });
});

test.describe('Messaging - Chat View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
  });

  test('clicking a conversation opens chat view', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Chat view should show message input
      await expect(page.getByPlaceholder(/type a message/i)).toBeVisible();
    }
  });

  test('chat header shows conversation name', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Header should have a name (h3)
      const header = page.locator('h3').first();
      await expect(header).toBeVisible();
      const text = await header.textContent();
      expect(text?.length).toBeGreaterThan(0);
    }
  });

  test('send button is visible', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Send button should be present (disabled when no text)
      const sendButton = page.locator('button').filter({ has: page.locator('svg') }).last();
      await expect(sendButton).toBeVisible();
    }
  });

  test('image upload button is visible on desktop', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Upload image button (title="Upload image")
      await expect(page.getByTitle(/upload image/i)).toBeVisible();
    }
  });

  test('can type a message', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      const input = page.getByPlaceholder(/type a message/i);
      await input.fill('Hello from Playwright test');
      await expect(input).toHaveValue('Hello from Playwright test');
    }
  });

  test('send button activates when text is entered', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      const input = page.getByPlaceholder(/type a message/i);
      await input.fill('Test message');

      // Send button should be gold/active (has bg-brand-gold class)
      const sendButton = page.locator('button[class*="bg-brand-gold"]').last();
      await expect(sendButton).toBeVisible();
    }
  });

  test('add people button is visible', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      await expect(page.getByTitle(/add people/i)).toBeVisible();
    }
  });

  test('image file input exists for upload', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Hidden file input should exist with accept="image/*"
      const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
      await expect(fileInput).toBeAttached();
    }
  });
});

test.describe('Messaging - Send & Receive', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  let conversationUrl: string;

  test('owner can send a message', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() === 0) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(1000);
    conversationUrl = page.url();

    const input = page.getByPlaceholder(/type a message/i);
    const testMessage = `E2E test ${Date.now()}`;
    await input.fill(testMessage);
    await input.press('Enter');

    // Wait for message to appear in chat
    await page.waitForTimeout(2000);
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 10000 });
  });

  test('sent message shows read receipt (single check)', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() === 0) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(2000);

    // Look for check mark SVGs (read receipt indicators)
    const checks = page.locator('svg[class*="w-3 h-3"]');
    if (await checks.count() > 0) {
      await expect(checks.last()).toBeVisible();
    }
  });
});

test.describe('Messaging - Image Upload', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test('selecting an image shows preview', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() === 0) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(1000);

    // Create a test image file and upload via the hidden input
    const fileInput = page.locator('input[type="file"][accept="image/*"]').first();

    // Create a minimal test PNG (1x1 pixel)
    const testImagePath = path.join(__dirname, '..', 'test-image.png');
    const fs = require('fs');
    if (!fs.existsSync(testImagePath)) {
      // Create a minimal valid PNG
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(testImagePath, pngHeader);
    }

    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(500);

    // Preview should appear (img with alt "Preview")
    await expect(page.getByAlt('Preview')).toBeVisible({ timeout: 5000 });
  });

  test('image preview has remove button', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() === 0) {
      test.skip();
      return;
    }

    await firstConv.click();
    await page.waitForTimeout(1000);

    const fileInput = page.locator('input[type="file"][accept="image/*"]').first();
    const testImagePath = path.join(__dirname, '..', 'test-image.png');

    await fileInput.setInputFiles(testImagePath);
    await page.waitForTimeout(500);

    // Remove button should be on the preview
    const removeButton = page.locator('button[class*="bg-red"]').first();
    await expect(removeButton).toBeVisible();

    // Click remove
    await removeButton.click();
    await expect(page.getByAlt('Preview')).not.toBeVisible();
  });
});

test.describe('Messaging - Delete Confirmation', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test('delete shows confirmation modal', async ({ page }) => {
    await loginAs(page, 'owner');
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() === 0) {
      test.skip();
      return;
    }

    // Right-click to open context menu
    await firstConv.click({ button: 'right' });
    await page.waitForTimeout(300);

    // Click Delete
    await page.getByRole('button', { name: /delete/i }).click();

    // Confirmation modal should appear
    await expect(page.getByText(/permanently delete/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).toBeVisible();

    // Cancel to not actually delete
    await page.getByRole('button', { name: /cancel/i }).click();
    await expect(page.getByText(/permanently delete/i)).not.toBeVisible();
  });
});

test.describe('Messaging - Mobile View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Mobile tests only run on Chromium');

  test.use({ viewport: { width: 390, height: 844 } }); // iPhone-like

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'owner');
  });

  test('messages page loads on mobile', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('FAB compose button visible on mobile', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);
    await expect(page.getByLabel(/new message/i)).toBeVisible();
  });

  test('opening chat shows back button on mobile', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Back button should be visible on mobile
      const backButton = page.locator('button').filter({
        has: page.locator('svg[class*="w-5 h-5"]'),
      }).first();
      await expect(backButton).toBeVisible();
    }
  });

  test('camera button visible on mobile chat', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Camera button (title="Take photo")
      await expect(page.getByTitle(/take photo/i)).toBeVisible();
    }
  });

  test('camera input has capture attribute', async ({ page }) => {
    await page.goto('/messages');
    await page.waitForTimeout(2000);

    const firstConv = page.locator('[class*="cursor-pointer"]').first();
    if (await firstConv.count() > 0) {
      await firstConv.click();
      await page.waitForTimeout(1000);

      // Camera file input should have capture="environment"
      const cameraInput = page.locator('input[type="file"][capture="environment"]');
      await expect(cameraInput).toBeAttached();
    }
  });
});

test.describe('Messaging - Partner Access', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Role tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test('partner can access messages', async ({ page }) => {
    await loginAs(page, 'partner');
    await page.goto('/messages');

    // Partner should be able to see messages page
    await expect(page.getByText(/messages/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('contractor can access messages', async ({ page }) => {
    await loginAs(page, 'contractor');
    await page.goto('/messages');

    await expect(page.getByText(/messages/i).first()).toBeVisible({ timeout: 10000 });
  });
});
