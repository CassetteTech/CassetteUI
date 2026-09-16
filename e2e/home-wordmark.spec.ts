import { expect, test } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

for (const width of [1280, 390]) {
  test(`home wordmark settles once and respects reduced motion at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mockCassetteApp(page);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const logo = page.getByTestId('home-wordmark');
    await expect(logo).toHaveAccessibleName('Cassette');
    await expect(logo.locator('use')).toHaveCount(8);
    await expect.poll(() => logo.evaluate(element =>
      element.getAnimations({ subtree: true }).length,
    )).toBe(8);

    await expect.poll(() => logo.evaluate(element =>
      element.getAnimations({ subtree: true }).length,
    )).toBe(0);
    await expect.poll(() => logo.locator('use').evaluateAll(elements =>
      elements.every(element => getComputedStyle(element).transform === 'none'),
    )).toBe(true);

    const settledBounds = await logo.boundingBox();
    if (!settledBounds) throw new Error('The home wordmark has no visible bounds');
    expect(settledBounds.x).toBeGreaterThanOrEqual(0);
    expect(settledBounds.x + settledBounds.width).toBeLessThanOrEqual(width);

    await page.getByText('beta.', { exact: true }).hover();
    await expect(page.getByText('Welcome to the Cassette Beta!')).toBeVisible();

    await page.getByTestId('home-search-input').fill('test');
    await expect(logo).toHaveJSProperty('isConnected', true);
    expect(await logo.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);
    await page.getByTestId('home-search-input').press('Escape');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByTestId('home-search-input')).toBeVisible();
    await expect(logo).toBeVisible();
    expect(await logo.evaluate(element => element.getAnimations({ subtree: true }).length)).toBe(0);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect.poll(() => logo.evaluate(element =>
      element.getAnimations({ subtree: true }).length,
    )).toBe(8);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect.poll(() => logo.evaluate(element =>
      element.getAnimations({ subtree: true }).length,
    )).toBe(0);
  });
}
