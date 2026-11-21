import { test, expect } from '@playwright/test';

test.describe('Baseline Dashboard (Old Frontend)', () => {
  test('TC-03: Dashboard Protected Shell & Layout', async ({ page }) => {
    // Seed authenticated session in localStorage
    await page.addInitScript(() => {
      localStorage.setItem('famdoc_token', 'mock_e2e_jwt_token_for_baseline_testing');
      localStorage.setItem('famdoc_user', JSON.stringify({
        id: 1,
        username: 'FamilyAdmin',
        email: 'admin@famdoc.com',
        role: 'admin',
        family_id: 'fam_123'
      }));
    });

    await page.goto('/#/dashboard');

    // Verify layout shell elements
    await expect(page.locator('.sidebar, nav#sidebarMenu')).toBeVisible();
    await expect(page.locator('.sidebar-nav a[data-route="/vault"]')).toBeVisible();

    // Verify dashboard cards
    await expect(page.locator('#card-stat-files')).toBeVisible();
    await expect(page.locator('#card-stat-folders')).toBeVisible();
    await expect(page.locator('#card-stat-size')).toBeVisible();
    await expect(page.locator('#card-stat-members')).toBeVisible();

    // Verify quick action toolbar
    await expect(page.locator('#btn-quick-upload')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_dashboard.png' });
  });
});
