import { test, expect } from '@playwright/test';

test.describe('Baseline Authentication Flows (Old Frontend)', () => {
  test('TC-01A: Login Page Elements & Interaction', async ({ page }) => {
    await page.goto('/#/login');
    await expect(page).toHaveTitle(/FamDoc/);

    // Verify card header
    await expect(page.locator('h1.auth-title')).toHaveText('Welcome Back');
    await expect(page.locator('.auth-subtitle')).toContainText('family keepsake vault');

    // Verify form fields
    const emailInput = page.locator('input#email');
    const passwordInput = page.locator('input#password');
    const submitBtn = page.locator('button#btn-submit');

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
    await expect(submitBtn).toBeVisible();

    // Verify password visibility toggle
    const toggleBtn = page.locator('.password-toggle-btn');
    await expect(toggleBtn).toBeVisible();
    await passwordInput.fill('secret123');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Take baseline screenshot
    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_login.png' });
  });

  test('TC-01B: Registration Page Elements', async ({ page }) => {
    await page.goto('/#/register');
    await expect(page.locator('h1.auth-title')).toHaveText('Create Family Vault');
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_register.png' });
  });

  test('TC-01C: Join Family Page Elements', async ({ page }) => {
    await page.goto('/#/join');
    await expect(page.locator('h1.auth-title')).toHaveText('Join Family Vault');
    await expect(page.locator('input#secret-code')).toBeVisible();
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#email')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_join.png' });
  });

  test('TC-01D: Forgot Password 3-Step Wizard', async ({ page }) => {
    await page.goto('/#/forgot-password');
    await expect(page.locator('h1.auth-title')).toHaveText('Reset Vault Password');
    await expect(page.locator('input#reset-email')).toBeVisible();
    await expect(page.locator('button#btn-submit')).toBeVisible();

    await page.screenshot({ path: 'tests/e2e/screenshots/baseline_forgot_password.png' });
  });
});
