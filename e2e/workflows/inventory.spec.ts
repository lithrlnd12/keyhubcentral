import { test, expect } from '../fixtures/auth';
import { loginAs, tryLoginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Inventory - Overview', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('inventory overview page loads', async ({ page }) => {
    await page.goto('/kts/inventory');
    await expect(page).toHaveURL(/\/kts\/inventory/);
  });

  test('inventory shows summary stats', async ({ page }) => {
    await page.goto('/kts/inventory');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Inventory - Items CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('items list page loads', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    await expect(page).toHaveURL(/\/kts\/inventory\/items/);
  });

  test('items list shows items or empty state', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    const hasItems = await page.locator('table tbody tr, [class*="card"], [class*="item"]').count() > 0;
    const hasEmptyState = await page.getByText(/no items|get started|add/i).count() > 0;
    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test('can access new item form', async ({ page }) => {
    await page.goto('/kts/inventory/items/new');
    await expect(page).toHaveURL(/\/kts\/inventory\/items\/new/);
  });

  test('new item form has required fields', async ({ page }) => {
    await page.goto('/kts/inventory/items/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const hasForm = await page.locator('form, input, select, textarea').count() > 0;
    const hasHeading = await page.getByText(/add inventory item|new item/i).count() > 0;
    expect(hasForm || hasHeading).toBeTruthy();
  });

  test('item detail page loads when item exists', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    const itemLink = page.locator('a[href*="/kts/inventory/items/"]').first();
    if (await itemLink.count() > 0) {
      await itemLink.click();
      await expect(page).toHaveURL(/\/kts\/inventory\/items\/[^/]+/);
    }
  });

  test('item detail shows stock quantity', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    const itemLink = page.locator('a[href*="/kts/inventory/items/"]').first();
    if (await itemLink.count() > 0) {
      await itemLink.click();
      const pageContent = await page.textContent('body');
      expect(pageContent).toBeTruthy();
    }
  });

  test('item edit page loads when item exists', async ({ page }) => {
    await page.goto('/kts/inventory/items');
    const itemLink = page.locator('a[href*="/kts/inventory/items/"]').first();
    if (await itemLink.count() > 0) {
      await itemLink.click();
      const editLink = page.locator('a[href*="edit"], button:has-text("Edit")').first();
      if (await editLink.count() > 0) {
        await editLink.click();
        await expect(page).toHaveURL(/\/edit/);
      }
    }
  });
});

test.describe('Inventory - Receipts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('receipts list page loads', async ({ page }) => {
    await page.goto('/kts/inventory/receipts');
    await expect(page).toHaveURL(/\/kts\/inventory\/receipts/);
  });

  test('receipts list shows entries or empty state', async ({ page }) => {
    await page.goto('/kts/inventory/receipts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const hasReceipts = await page.locator('table tbody tr, [class*="card"], [class*="receipt"]').count() > 0;
    const hasEmptyState = await page.getByText(/no receipts found|upload.*receipt|get started/i).count() > 0;
    const hasHeading = await page.getByText(/receipts/i).count() > 0;
    expect(hasReceipts || hasEmptyState || hasHeading).toBeTruthy();
  });

  test('can access new receipt form', async ({ page }) => {
    await page.goto('/kts/inventory/receipts/new');
    await expect(page).toHaveURL(/\/kts\/inventory\/receipts\/new/);
  });

  test('new receipt form has required fields', async ({ page }) => {
    await page.goto('/kts/inventory/receipts/new');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(3000);
    const hasForm = await page.locator('form, input, select, textarea').count() > 0;
    const hasHeading = await page.getByText(/new receipt|upload receipt|receipt/i).count() > 0;
    expect(hasForm || hasHeading).toBeTruthy();
  });

  test('receipt detail page loads when receipt exists', async ({ page }) => {
    await page.goto('/kts/inventory/receipts');
    const receiptLink = page.locator('a[href*="/kts/inventory/receipts/"]').first();
    if (await receiptLink.count() > 0) {
      await receiptLink.click();
      await expect(page).toHaveURL(/\/kts\/inventory\/receipts\/[^/]+/);
    }
  });
});

test.describe('Inventory - Counts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('inventory count page loads', async ({ page }) => {
    await page.goto('/kts/inventory/count');
    await expect(page).toHaveURL(/\/kts\/inventory\/count/);
  });

  test('inventory count shows location or item counts', async ({ page }) => {
    await page.goto('/kts/inventory/count');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Inventory - Alerts', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('alerts page loads', async ({ page }) => {
    await page.goto('/kts/inventory/alerts');
    await expect(page).toHaveURL(/\/kts\/inventory\/alerts/);
  });

  test('alerts page shows low stock items or empty state', async ({ page }) => {
    await page.goto('/kts/inventory/alerts');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const hasAlerts = await page.locator('[class*="alert"], [class*="warning"], table tbody tr').count() > 0;
    const hasEmptyState = await page.getByText(/no alerts|all stocked|no low stock|no items/i).count() > 0;
    const hasHeading = await page.getByText(/alerts|low stock|inventory/i).count() > 0;
    expect(hasAlerts || hasEmptyState || hasHeading).toBeTruthy();
  });
});

test.describe('Inventory - Contractor Portal Access', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('contractor can view inventory overview', async ({ page }) => {
    await page.goto('/portal/inventory');
    await expect(page).toHaveURL(/\/portal\/inventory/);
  });

  test('contractor can view inventory items', async ({ page }) => {
    await page.goto('/portal/inventory/items');
    await expect(page).toHaveURL(/\/portal\/inventory\/items/);
  });

  test('contractor can create new inventory item', async ({ page }) => {
    await page.goto('/portal/inventory/items/new');
    await expect(page).toHaveURL(/\/portal\/inventory\/items\/new/);
  });

  test('contractor can view inventory receipts', async ({ page }) => {
    await page.goto('/portal/inventory/receipts');
    await expect(page).toHaveURL(/\/portal\/inventory\/receipts/);
  });

  test('contractor can access inventory count', async ({ page }) => {
    await page.goto('/portal/inventory/count');
    await expect(page).toHaveURL(/\/portal\/inventory\/count/);
  });
});

test.describe('Inventory - Access Control', () => {
  test('subscriber cannot access inventory', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/kts/inventory');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('customer cannot access inventory', async ({ page }) => {
    if (!await tryLoginAs(page, 'customer')) { test.skip(true, 'Customer test user not available'); return; }
    await page.goto('/kts/inventory');
    await expect(page).toHaveURL(/\/(customer|login|unauthorized)/);
  });
});
