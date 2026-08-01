import test from 'node:test';
import assert from 'node:assert/strict';

import { parseProfileLink } from '../profile-links';

test('parses known platforms with handles', () => {
  const ig = parseProfileLink('https://www.instagram.com/cassette.tech');
  assert.equal(ig?.platform, 'Instagram');
  assert.equal(ig?.label, '@cassette.tech');
  assert.ok(ig?.iconPath);

  const tiktok = parseProfileLink('https://www.tiktok.com/@cassette.tech');
  assert.equal(tiktok?.platform, 'TikTok');
  assert.equal(tiktok?.label, '@cassette.tech');

  const spotify = parseProfileLink('https://open.spotify.com/user/spotifyfan');
  assert.equal(spotify?.platform, 'Spotify');
  assert.equal(spotify?.label, '@spotifyfan');

  const youtube = parseProfileLink('https://youtube.com/@somechannel');
  assert.equal(youtube?.platform, 'YouTube');
  assert.equal(youtube?.label, '@somechannel');
});

test('maps twitter.com and x.com to X', () => {
  assert.equal(parseProfileLink('https://twitter.com/someone')?.platform, 'X');
  assert.equal(parseProfileLink('https://x.com/someone')?.label, '@someone');
});

test('known platform without a glyph falls back to no iconPath but keeps identity', () => {
  const sc = parseProfileLink('https://soundcloud.com/some-artist');
  assert.equal(sc?.platform, 'SoundCloud');
  assert.equal(sc?.label, '@some-artist');
  assert.equal(sc?.iconPath, undefined);
});

test('unknown hosts use hostname as platform', () => {
  const link = parseProfileLink('https://linktr.ee/someone');
  assert.equal(link?.platform, 'linktr.ee');
  assert.equal(link?.label, '@someone');
  assert.equal(link?.iconPath, undefined);

  const bare = parseProfileLink('https://example.com');
  assert.equal(bare?.platform, 'example.com');
  assert.equal(bare?.label, 'example.com');
});

test('rejects invalid and non-http URLs', () => {
  assert.equal(parseProfileLink('not a url'), null);
  assert.equal(parseProfileLink('javascript:alert(1)'), null);
  assert.equal(parseProfileLink('ftp://example.com/file'), null);
});
