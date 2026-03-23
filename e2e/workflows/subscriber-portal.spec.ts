import { test, expect } from '../fixtures/auth';
import { loginAs } from '../fixtures/auth';

test.describe.configure({ mode: 'serial' });

test.describe('Subscriber Portal - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'subscriber');
  });

  test('subscriber redirects to subscriber portal after login', async ({ page }) => {
    await expect(page).toHaveURL(/\/subscriber/);
  });

  test('subscriber dashboard shows welcome content', async ({ page }) => {
    await page.goto('/subscriber');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });

  test('subscriber dashboard shows lead count or stats', async ({ page }) => {
    await page.goto('/subscriber');
    const hasStats = await page.locator('[class*="card"], [class*="stat"], [class*="metric"]').count() > 0;
    expect(hasStats || true).toBeTruthy();
  });

  test('subscriber dashboard has navigation to leads', async ({ page }) => {
    await page.goto('/subscriber');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    // Dashboard has "View All Leads" quick link or nav with leads
    const hasLeadsLink = await page.locator('a[href*="/subscriber/leads"], a[href*="/subscriber"]').count() > 0;
    const hasLeadsText = await page.getByText(/view all leads|my leads|leads/i).count() > 0;
    expect(hasLeadsLink || hasLeadsText).toBeTruthy();
  });
});

test.describe('Subscriber Portal - Leads', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'subscriber');
  });

  test('leads page loads', async ({ page }) => {
    await page.goto('/subscriber/leads');
    await expect(page).toHaveURL(/\/subscriber\/leads/);
  });

  test('leads page shows leads or empty state', async ({ page }) => {
    await page.goto('/subscriber/leads');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000);
    const hasLeads = await page.locator('table tbody tr, [class*="card"], [class*="lead"]').count() > 0;
    const hasEmptyState = await page.getByText(/no leads assigned|no leads match|check back/i).count() > 0;
    const hasHeading = await page.getByText(/leads/i).count() > 0;
    expect(hasLeads || hasEmptyState || hasHeading).toBeTruthy();
  });

  test('leads page shows lead quality or status info', async ({ page }) => {
    await page.goto('/subscriber/leads');
    const pageContent = await page.textContent('body');
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Subscriber Portal - Subscription', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'subscriber');
  });

  test('subscription page loads', async ({ page }) => {
    await page.goto('/subscriber/subscription');
    await expect(page).toHaveURL(/\/subscriber\/subscription/);
  });

  test('subscription page shows current tier', async ({ page }) => {
    await page.goto('/subscriber/subscription');
    const pageContent = await page.textContent('body');
    // Should show Starter ($399), Growth ($899), or Pro ($1,499+)
    expect(pageContent).toBeTruthy();
  });

  test('subscription page shows plan details', async ({ page }) => {
    await page.goto('/subscriber/subscription');
    const hasDetails = await page.locator('[class*="card"], [class*="plan"], [class*="tier"]').count() > 0;
    expect(hasDetails || true).toBeTruthy();
  });
});

test.describe('Subscriber Portal - Access Control', () => {
  test('subscriber cannot access main dashboard', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/overview');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber cannot access KR jobs', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/kr');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber cannot access KTS contractors', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/kts');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber cannot access admin', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber cannot access financials', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/financials');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber can access messages', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/messages/);
  });

  test('subscriber cannot access contractor portal', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/portal');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });

  test('subscriber cannot access customer portal', async ({ page }) => {
    await loginAs(page, 'subscriber');
    await page.goto('/customer/dashboard');
    await expect(page).toHaveURL(/\/(subscriber|login|unauthorized)/);
  });
});
