import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../.well-known/apple-app-site-association/route';

type Component = { '/': string; exclude?: boolean };

// Apple's rule: the first component whose path pattern matches decides; `*` matches any run of
// characters and `?` one character. A path that no component matches stays on the web.
function opensInApp(components: Component[], path: string): boolean {
  const match = components.find((component) => {
    const pattern = component['/'].replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.');
    return new RegExp(`^${pattern}$`).test(path);
  });
  return match !== undefined && !match.exclude;
}

void test('the app site association is JSON that opens only profile, post, memberships, and feed links in the iOS app', async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.deepEqual(await response.json(), {
    applinks: {
      details: [
        {
          appIDs: ['9LYHZBVHB7.com.matttoppi.CassetteApp'],
          components: [
            { '/': '/profile/edit', exclude: true },
            { '/': '/profile/edit/*', exclude: true },
            { '/': '/profile/?*' },
            { '/': '/post/?*' },
            { '/': '/memberships' },
            { '/': '/feed' },
          ],
        },
      ],
    },
  });
});

void test('the app site association keeps the profile editor and every other web path on the web', async () => {
  const body: { applinks: { details: Array<{ components: Component[] }> } } = await GET().json();
  const components = body.applinks.details[0].components;

  for (const path of ['/profile/alice', '/profile/editor', '/post/p_123', '/memberships', '/feed']) {
    assert.equal(opensInApp(components, path), true, path);
  }
  for (const path of [
    '/profile/edit',
    '/profile/edit/',
    '/profile/edit/avatar',
    '/profile',
    '/profile/',
    '/post',
    '/post/',
    '/feed/',
    '/memberships/msb_1',
    '/studio/payouts',
    '/auth/signin',
    '/explore',
    '/',
  ]) {
    assert.equal(opensInApp(components, path), false, path);
  }
});
