import { expect, type Page } from '@playwright/test';

export async function expectNoHorizontalOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => Math.max(
    document.documentElement.scrollWidth,
    document.body.scrollWidth,
  ) - window.innerWidth)).toBeLessThanOrEqual(1);
}
