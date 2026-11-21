import { test, expect } from '@playwright/test';

test.describe('Baseline Shared Vault Explorer (Old Frontend)', () => {
  test('TC-04: Vault Navigation, Toolbar, Search & Modals', async ({ page }) => {
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

    await page.goto('/#/vault');

    // Verify breadcrumbs container
    await expect(page.locator('#breadcrumbs')).toBeVisible();

    // Verify search input & filter dropdown
    await expect(page.locator('#vault-search')).toBeVisible();
    await expect(page.locator('#filter-type')).toBeVisible();

    // Verify view toggle buttons (grid & list)
    await expect(page.locator('#toggle-grid')).toBeVisible();
    await expect(page.locator('#toggle-list')).toBeVisible();

    // Verify explorer item container
    await expect(page.locator('#items-wrapper')).toBeVisible();

    // Verify drag overlay existence
    await expect(page.locator('#drag-overlay')).toBeAttached();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_vault.png' });
  });
});
