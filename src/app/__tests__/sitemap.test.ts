import '../../services/__tests__/browser-service-environment';
import assert from 'node:assert/strict';
import test from 'node:test';
import { PUBLIC_STATIC_ROUTES, SITE_URL } from '../../lib/seo';
import sitemap from '../sitemap';

void test('the sitemap lists static routes only, so crawlers never fan out into per-post or per-profile metadata reads', () => {
  const urls = sitemap().map((entry) => entry.url);
  assert.deepEqual(urls, PUBLIC_STATIC_ROUTES.map((route) => new URL(route, SITE_URL).href));
  assert.ok(urls.every((url) => !url.includes('/post/') && !url.includes('/profile/')));
});
