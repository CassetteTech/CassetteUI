import type { Page } from '@playwright/test';

export async function returnFromProvider(page: Page, providerUrl: string, returnPath: string) {
  const appOrigin = new URL(page.url()).origin;
  await page.route(providerUrl, (route) => route.fulfill({
    status: 302,
    headers: { location: `${appOrigin}${returnPath}` },
  }));
}

export async function pauseAtReturnRead(page: Page, returnPath: string, statusPath: RegExp, leave: () => Promise<void>) {
  const returned = page.waitForURL((url) => `${url.pathname}${url.search}` === returnPath, { waitUntil: 'commit' });
  await leave();
  await returned;
  await page.waitForResponse((response) => statusPath.test(new URL(response.url()).pathname));
  const now = await page.evaluate(() => Date.now());
  await page.clock.setFixedTime(now);
  await page.clock.pauseAt(now);
  await page.clock.setSystemTime(now);
}
