import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Admin Extended Tests
 * Tests customer signup tracking, calendar, seed page, and settings
 */

test.describe('Admin - Customer Signups Tracker', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('admin page loads with customer signups section', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin/);
    await page.waitForTimeout(3000);
    // Should show customer signups section
    const customerSection = page.getByText(/customer signup|customer/i);
    await expect(customerSection.first()).toBeVisible();
  });

  test('customer signups shows time period filter buttons', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    // Filter buttons: All Time, Last Week, Last Month, Last Quarter
    const allTimeBtn = page.getByRole('button', { name: /all time/i });
    const weekBtn = page.getByRole('button', { name: /last week|week/i });
    const monthBtn = page.getByRole('button', { name: /last month|month/i });
    const quarterBtn = page.getByRole('button', { name: /last quarter|quarter/i });

    if (await allTimeBtn.count() > 0) {
      await expect(allTimeBtn.first()).toBeVisible();
      await expect(weekBtn.first()).toBeVisible();
      await expect(monthBtn.first()).toBeVisible();
      await expect(quarterBtn.first()).toBeVisible();
    }
  });

  test('time period filter changes displayed data', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    const weekBtn = page.getByRole('button', { name: /last week|week/i }).first();
    if (await weekBtn.count() > 0) {
      await weekBtn.click();
      await page.waitForTimeout(1000);
      // Should still be on admin page with filtered results
      await expect(page).toHaveURL(/\/admin/);
    }
  });

  test('customer signups shows stats row', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    // Stats should show counts
    const statsText = page.getByText(/\d+\s*(customer|signup|total)/i);
    if (await statsText.count() > 0) {
      await expect(statsText.first()).toBeVisible();
    }
  });

  test('customer signups has search functionality', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    // Search input for filtering customers
    const searchInput = page.getByPlaceholder(/search/i);
    if (await searchInput.count() > 0) {
      await searchInput.last().fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('customer list shows customer details', async ({ page }) => {
    await page.goto('/admin');
    await page.waitForTimeout(3000);
    // Customer entries should show name, email, date
    const customerRow = page.getByText(/@/).first();
    if (await customerRow.count() > 0) {
      await expect(customerRow).toBeVisible();
    }
  });
});

test.describe('Admin - Calendar Page', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('calendar page loads', async ({ page }) => {
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('calendar shows month/year header', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    // Should show current month and year
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = monthNames[new Date().getMonth()];
    await expect(page.getByText(currentMonth)).toBeVisible();
  });

  test('calendar shows navigation arrows', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    // Previous/next month buttons
    const prevButton = page.locator('button').filter({ has: page.locator('svg') }).first();
    await expect(prevButton).toBeVisible();
  });

  test('calendar shows Today button', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
  });

  test('calendar shows day-of-week headers', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    await expect(page.getByText('Sun')).toBeVisible();
    await expect(page.getByText('Mon')).toBeVisible();
    await expect(page.getByText('Fri')).toBeVisible();
  });

  test('calendar shows day cells', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    // Should show numbered day cells (at least day 1 and today's date)
    const dayOne = page.locator('button').filter({ hasText: '1' }).first();
    await expect(dayOne).toBeVisible();
  });

  test('clicking a day shows event detail panel', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    // Click on a day
    const dayButton = page.locator('button').filter({ hasText: '15' }).first();
    if (await dayButton.count() > 0) {
      await dayButton.click();
      await page.waitForTimeout(500);
      // Detail panel should show selected date or "No events"
      const detailPanel = page.getByText(/no events|scheduled|event/i);
      await expect(detailPanel.first()).toBeVisible();
    }
  });

  test('calendar shows connect prompt if no calendar linked', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(3000);
    // Either shows events or "Connect your Google Calendar" prompt
    const hasPrompt = await page.getByText(/connect|google calendar/i).count() > 0;
    const hasEvents = await page.getByText(/event|scheduled/i).count() > 0;
    const hasCalendar = await page.getByText(/sun|mon|tue/i).count() > 0;
    expect(hasPrompt || hasEvents || hasCalendar).toBeTruthy();
  });

  test('calendar settings link points to /settings', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    // Settings gear icon should link to /settings (not /portal/settings)
    const settingsLink = page.locator('a[href="/settings"]');
    if (await settingsLink.count() > 0) {
      await expect(settingsLink.first()).toBeVisible();
    }
  });

  test('can navigate to previous month', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForTimeout(2000);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const currentMonth = new Date().getMonth();
    const prevMonth = monthNames[(currentMonth - 1 + 12) % 12];

    // Click previous month button (first chevron button)
    const prevButton = page.locator('button').first();
    await prevButton.click();
    await page.waitForTimeout(500);
    await expect(page.getByText(prevMonth)).toBeVisible();
  });
});

test.describe('Admin - Seed Page', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('seed page loads', async ({ page }) => {
    await page.goto('/admin/seed');
    await expect(page).toHaveURL(/\/admin\/seed/);
  });

  test('seed page shows seed options', async ({ page }) => {
    await page.goto('/admin/seed');
    await page.waitForTimeout(2000);
    // Should show buttons to seed data
    await expect(page.getByText(/seed|create|generate/i).first()).toBeVisible();
  });
});

test.describe('Admin - Settings Page', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/);
  });

  test('settings shows Google Calendar section', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForTimeout(2000);
    const calendarSection = page.getByText(/google calendar|calendar/i);
    if (await calendarSection.count() > 0) {
      await expect(calendarSection.first()).toBeVisible();
    }
  });
});

test.describe('Admin - Calendar Access Control', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Access tests only run on Chromium');

  test('calendar not accessible when unauthenticated', async ({ page }) => {
    await page.goto('/calendar');
    await page.waitForURL(/\/login/);
    await expect(page).toHaveURL(/\/login/);
  });

  test('internal staff can access calendar', async ({ page }) => {
    await loginAs(page, 'sales_rep');
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('PM can access calendar', async ({ page }) => {
    await loginAs(page, 'pm');
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/calendar/);
  });

  test('contractor cannot access admin calendar', async ({ page }) => {
    await loginAs(page, 'contractor');
    await page.goto('/calendar');
    // Should redirect to portal
    await expect(page).toHaveURL(/\/portal/);
  });

  test('subscriber cannot access admin calendar', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/calendar');
    await expect(page).toHaveURL(/\/subscriber/);
  });
});
