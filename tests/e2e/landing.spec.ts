import { test, expect } from '@playwright/test';

test.describe('Baseline Landing & Showcase (Old Frontend)', () => {
  test('TC-02: Public Landing Hero, Categories & Actions', async ({ page }) => {
    await page.goto('/#/');
    await expect(page).toHaveTitle(/FamDoc/);

    // Verify main brand and hero
    await expect(page.locator('h1.hero-title, .landing-hero-title')).toBeVisible();

    // Verify category chips
    const categoryTabs = page.locator('.category-tab, .vault-category-pill, [data-category]');
    if (await categoryTabs.count() > 0) {
      await expect(categoryTabs.first()).toBeVisible();
    }

    // Verify CTAs
    const loginLink = page.locator('a[href="#/login"]');
    const registerLink = page.locator('a[href="#/register"]');
    await expect(loginLink.first()).toBeVisible();
    await expect(registerLink.first()).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_landing.png' });
  });
});
