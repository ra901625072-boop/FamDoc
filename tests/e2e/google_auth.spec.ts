import { test, expect } from '@playwright/test';

test.describe('Google OAuth SSO Integration', () => {
  test('TC-G01: Google Sign-In Button on Login Page', async ({ page }) => {
    await page.goto('/#/login');
    await page.waitForLoadState('domcontentloaded');

    // Check Google Auth button is visible with SVG icon
    const googleBtn = page.locator('#btn-google-auth');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Continue with Google');

    const googleIcon = googleBtn.locator('svg.google-sso-icon');
    await expect(googleIcon).toBeVisible();

    // Check divider
    const divider = page.locator('.auth-divider');
    await expect(divider).toBeVisible();
    await expect(divider).toContainText(/or continue with email/i);
  });

  test('TC-G02: Google Sign-Up Button on Register Page', async ({ page }) => {
    await page.goto('/#/register');
    await page.waitForLoadState('domcontentloaded');

    // Check Google Auth button is visible with SVG icon
    const googleBtn = page.locator('#btn-google-auth');
    await expect(googleBtn).toBeVisible();
    await expect(googleBtn).toContainText('Sign up with Google');

    const googleIcon = googleBtn.locator('svg.google-sso-icon');
    await expect(googleIcon).toBeVisible();

    // Check divider
    const divider = page.locator('.auth-divider');
    await expect(divider).toBeVisible();
    await expect(divider).toContainText(/or register with email/i);
  });

  test('TC-G03: Backend Google Verify API Contract', async ({ request }) => {
    // 1. Verify endpoint rejects invalid token
    const invalidRes = await request.post('http://127.0.0.1:8000/api/auth/google/verify', {
      data: { id_token: 'bogus_token' },
    });
    expect(invalidRes.status()).toBe(401);

    // 2. Verify endpoint successfully handles token and returns JWT
    const mockRes = await request.post('http://127.0.0.1:8000/api/auth/google/verify', {
      data: { id_token: 'mock_google_playwright_tester' },
    });
    expect(mockRes.status()).toBe(200);
    const body = await mockRes.json();
    expect(body).toHaveProperty('access_token');
    expect(body.token_type).toBe('bearer');
  });
});
