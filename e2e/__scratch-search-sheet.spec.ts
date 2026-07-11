import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test.describe('mobile sheet', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('add-music search sheet keeps the bar visible at the top', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });
    await page.goto('/add-music');

    const input = page.locator('[data-testid="add-music-input"]:visible');
    await input.click();
    await page.waitForTimeout(900);

    await page.screenshot({ path: 'test-results/scratch-mobile-sheet-open.png' });

    const box = await input.boundingBox();
    console.log('OPEN input box:', JSON.stringify(box));
    await expect(input).toBeVisible();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeLessThan(120);

    const covered = await input.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      return { hitTag: hit?.tagName, hitIsInputOrChild: hit === el || el.contains(hit) || hit?.contains(el) };
    });
    console.log('hit test:', JSON.stringify(covered));
    expect(covered.hitIsInputOrChild).toBe(true);
  });
});

test.describe('desktop swap', () => {
  test('add-music bar stays visible when results replace the form', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });
    await page.goto('/add-music');

    const input = page.locator('[data-testid="add-music-input"]:visible');
    await input.click();
    await page.waitForTimeout(900);

    await page.screenshot({ path: 'test-results/scratch-desktop-open.png' });

    const box = await input.boundingBox();
    console.log('OPEN desktop input box:', JSON.stringify(box));
    await expect(input).toBeVisible();
  });
});
