import { test, expect } from '@playwright/test';

test.describe('Baseline Shared File Public Download (Old Frontend)', () => {
  test('TC-05: Public Shared File Download Route', async ({ page }) => {
    await page.goto('/#/share/test-sample-token-123');

    // Verify public share card container
    await expect(page.locator('.shared-layout')).toBeVisible();

    // Verify logo and brand
    await expect(page.locator('.brand-text')).toContainText('FamDoc');

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_share.png' });
  });
});
