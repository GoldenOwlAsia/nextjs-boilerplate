import { expect, test } from '@playwright/test';

test('home page renders', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});

test('body text uses the font loaded by next/font, not the browser default', async ({ page }) => {
  await page.goto('/');

  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily);

  expect(fontFamily).toContain('Geist');
});

test('unknown routes render the not-found page', async ({ page }) => {
  const response = await page.goto('/this-route-does-not-exist');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { name: /could not be found/i })).toBeVisible();
});

test('security headers are applied and the stack is not advertised', async ({ page }) => {
  const response = await page.goto('/');
  const headers = response?.headers() ?? {};

  expect(headers['x-content-type-options']).toBe('nosniff');
  expect(headers['x-frame-options']).toBe('DENY');
  expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  expect(headers['permissions-policy']).toBeTruthy();
  expect(headers['x-powered-by']).toBeUndefined();
});

test('health endpoint answers without touching the proxy', async ({ request }) => {
  const response = await request.get('/api/health');

  expect(response.status()).toBe(200);
  expect(await response.json()).toMatchObject({ status: 'ok' });
});
