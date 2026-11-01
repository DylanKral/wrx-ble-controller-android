import { expect, test } from '@playwright/test';
import { mockBluetooth, navigate } from './mockBluetooth';

test('Main always uses Combined, including saved preferences and returning from testing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wrx-playback-output-v1', 'hardware'));
  await page.goto('./');
  await expect(page.getByLabel('Playback output', { exact: true })).toHaveCount(0);
  await expect(page.locator('#home-view .preview-status')).toHaveText('Combined');
  await expect(page.locator('#home-view .sim-art')).toBeVisible();
  await navigate(page, 'Custom Testing');
  await page.getByLabel('Playback output', { exact: true }).selectOption('simulation');
  await navigate(page, 'Main presets');
  await expect(page.locator('#home-view .preview-status')).toHaveText('Combined');
  expect(await page.evaluate(() => localStorage.getItem('wrx-playback-output-v1'))).toBe('combined');
});

test('Android system bar insets keep the sticky preview and Stop + Red accessible', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    document.documentElement.style.setProperty('--safe-area-inset-top', '32px');
    document.documentElement.style.setProperty('--safe-area-inset-bottom', '24px');
  });
  await page.evaluate(() => window.scrollTo(0, 500));
  const nav = await page.locator('.site-nav').boundingBox();
  const preview = await page.locator('#home-view .sim-compact').boundingBox();
  expect(preview!.y).toBeGreaterThanOrEqual(nav!.y + nav!.height - 1);
  const stop = page.getByRole('button', { name: 'Stop + Red', exact: true });
  await expect(stop).toBeInViewport();
  const bounds = await stop.boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(844 - 24);
});

test('Combined playback stops on disconnect and stays stopped after automatic reconnect', async ({ page }) => {
  await mockBluetooth(page, true);
  await page.goto('./');
  await expect(page.locator('.connection-action .dot.on')).toHaveCount(2);

  await page.locator('[data-profile-id="overlap-cut"]').click();
  await expect(page.locator('.global-playbar')).not.toHaveAttribute('data-profile', '');
  await page.evaluate(() => window.__ble.disconnect('left'));
  await expect(page.locator('.global-playbar')).toHaveAttribute('data-profile', '');
  const count = await page.evaluate(() => window.__ble.writes.length);
  await expect(page.locator('.connection-action .dot.on')).toHaveCount(2);
  expect(await page.evaluate(() => window.__ble.writes.length)).toBe(count);
});
