import { expect, test } from '@playwright/test';
import { mockBluetooth } from './mockBluetooth';

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
  await page.getByLabel('Playback output', { exact: true }).selectOption('combined');
  await page.locator('[data-profile-id="overlap-cut"]').click();
  await expect(page.locator('.global-playbar')).not.toHaveAttribute('data-profile', '');
  await page.evaluate(() => window.__ble.disconnect('left'));
  await expect(page.locator('.global-playbar')).toHaveAttribute('data-profile', '');
  const count = await page.evaluate(() => window.__ble.writes.length);
  await expect(page.locator('.connection-action .dot.on')).toHaveCount(2);
  expect(await page.evaluate(() => window.__ble.writes.length)).toBe(count);
});
