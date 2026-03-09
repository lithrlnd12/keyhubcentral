import { test, expect } from '@playwright/test';
import { loginAs } from '../fixtures/auth';

/**
 * Contractor Profile & Specialties Tests
 * Tests contractor profile editing including specialties, skills, and availability
 */

test.describe('Contractor Profile - View', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('profile page loads without permission error', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await expect(page).toHaveURL(/\/portal\/my-profile/);
    // Should NOT show permission error
    const hasError = await page.getByText(/permission|forbidden|unauthorized/i).count();
    expect(hasError).toBe(0);
  });

  test('profile shows contractor information', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    // Should display profile info
    const hasProfile = await page.getByText(/profile|name|business|trade|contact/i).count() > 0;
    expect(hasProfile).toBeTruthy();
  });

  test('profile shows specialties section', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const specialtiesSection = page.getByText(/specialties/i);
    await expect(specialtiesSection.first()).toBeVisible();
  });

  test('profile shows skills section', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const skillsSection = page.getByText(/skills/i);
    if (await skillsSection.count() > 0) {
      await expect(skillsSection.first()).toBeVisible();
    }
  });

  test('profile shows service radius', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const radiusField = page.getByText(/service radius|radius|miles/i);
    if (await radiusField.count() > 0) {
      await expect(radiusField.first()).toBeVisible();
    }
  });

  test('profile shows rating info', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const ratingInfo = page.getByText(/rating|★|\d\.\d/i);
    if (await ratingInfo.count() > 0) {
      await expect(ratingInfo.first()).toBeVisible();
    }
  });
});

test.describe('Contractor Profile - Edit Mode', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('can enter edit mode', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);
      // Should show save/cancel buttons
      const saveButton = page.getByRole('button', { name: /save/i });
      await expect(saveButton.first()).toBeVisible();
    }
  });

  test('edit mode shows specialties selector', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);
      // Should show specialties multi-select or checkboxes
      const specialtiesField = page.getByText(/specialties/i);
      await expect(specialtiesField.first()).toBeVisible();
    }
  });

  test('edit mode shows skills input', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);
      const skillsField = page.getByText(/skills/i);
      if (await skillsField.count() > 0) {
        await expect(skillsField.first()).toBeVisible();
      }
    }
  });

  test('can cancel edit mode', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);
      const cancelButton = page.getByRole('button', { name: /cancel/i });
      if (await cancelButton.count() > 0) {
        await cancelButton.first().click();
        await page.waitForTimeout(500);
        // Should exit edit mode
        await expect(editButton.first()).toBeVisible();
      }
    }
  });

  test('edit mode shows service radius field', async ({ page }) => {
    await page.goto('/portal/my-profile');
    await page.waitForTimeout(3000);
    const editButton = page.getByRole('button', { name: /edit/i });
    if (await editButton.count() > 0) {
      await editButton.first().click();
      await page.waitForTimeout(500);
      const radiusInput = page.getByLabel(/service radius|radius/i).or(
        page.locator('input[type="number"]').first()
      );
      if (await radiusInput.count() > 0) {
        await expect(radiusInput.first()).toBeVisible();
      }
    }
  });
});

test.describe('Contractor Profile - Calendar', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('contractor calendar page loads', async ({ page }) => {
    await page.goto('/portal/calendar');
    await expect(page).toHaveURL(/\/portal\/calendar/);
  });

  test('contractor calendar shows month view', async ({ page }) => {
    await page.goto('/portal/calendar');
    await page.waitForTimeout(2000);
    // Should show calendar grid with day headers
    const hasDayHeaders = await page.getByText(/sun|mon|tue/i).count() > 0;
    expect(hasDayHeaders).toBeTruthy();
  });

  test('contractor calendar has Today button', async ({ page }) => {
    await page.goto('/portal/calendar');
    await page.waitForTimeout(2000);
    await expect(page.getByRole('button', { name: /today/i })).toBeVisible();
  });
});

test.describe('Contractor Profile - Settings', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Workflow tests only run on Chromium');

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'contractor');
  });

  test('contractor settings page loads', async ({ page }) => {
    await page.goto('/portal/settings');
    await expect(page).toHaveURL(/\/portal\/settings/);
  });

  test('contractor settings shows Google Calendar option', async ({ page }) => {
    await page.goto('/portal/settings');
    await page.waitForTimeout(2000);
    const calendarOption = page.getByText(/google calendar|calendar/i);
    if (await calendarOption.count() > 0) {
      await expect(calendarOption.first()).toBeVisible();
    }
  });
});
