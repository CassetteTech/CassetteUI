import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildRobotsDisallowList, DEFAULT_SOCIAL_PREVIEW } from '../seo';

test('default social preview uses available landscape artwork', () => {
  const [image] = DEFAULT_SOCIAL_PREVIEW.images;
  assert.equal(fs.existsSync(`public${image.url}`), true);
  assert.ok(image.width / image.height > 1.7);
});

/** Mirrors how crawlers apply robots.txt: prefix match, `$` anchors the end. */
function isDisallowed(path: string): boolean {
  return buildRobotsDisallowList().some((rule) =>
    rule.endsWith('$') ? path === rule.slice(0, -1) : path.startsWith(rule),
  );
}

test('robots disallow rules keep public pages crawlable', () => {
  // The regression that matters: an unanchored `/profile` rule would prefix-match
  // every public profile and deindex them all.
  assert.equal(isDisallowed('/profile/miagroove'), false);
  assert.equal(isDisallowed('/post/some-post-id'), false);
  assert.equal(isDisallowed('/'), false);
  assert.equal(isDisallowed('/explore'), false);
  assert.equal(isDisallowed('/release-notes'), false);
});

test('robots disallow rules block private routes and subtrees', () => {
  assert.equal(isDisallowed('/profile'), true);
  assert.equal(isDisallowed('/profile/edit'), true);
  assert.equal(isDisallowed('/add-music'), true);
  assert.equal(isDisallowed('/internal/users'), true);
  assert.equal(isDisallowed('/auth/signin'), true);
  assert.equal(isDisallowed('/api/v1/social/posts'), true);
});
