import type { Page, Request, Route } from '@playwright/test';

export function trackRequests(page: Page, pathname: string) {
  const requests: Request[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === pathname) requests.push(request);
  });
  return requests;
}

// Playwright rejects an answer to a request that the page aborted while the test held it.
export const fallbackUnlessAborted = (route: Route) => route.fallback().catch(() => {});
export const fulfillUnlessAborted = (route: Route, response: Parameters<Route['fulfill']>[0]) =>
  route.fulfill(response).catch(() => {});

export async function holdRoute(
  page: Page,
  url: string | ((url: URL) => boolean),
  hold: (request: Request) => boolean = () => true,
) {
  let release = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(url, async (route) => {
    if (hold(route.request())) await released;
    await fallbackUnlessAborted(route);
  });
  return () => release();
}
