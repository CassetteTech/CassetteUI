import { expect, test } from '@playwright/test';
import { GET } from '../src/app/.well-known/apple-app-site-association/route';

test('the built server serves the app site association as prerendered JSON with no redirect or attribution cookie', async ({ request }) => {
  const response = await request.get('/.well-known/apple-app-site-association?utm_source=review', { maxRedirects: 0 });

  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toBe('application/json');
  expect(response.headers()['x-nextjs-cache']).toBe('HIT');
  expect(response.headers()['cache-control']).toBe('s-maxage=31536000');
  expect(response.headers()['set-cookie']).toBeUndefined();
  expect(await response.json()).toEqual(await GET().json());
});
