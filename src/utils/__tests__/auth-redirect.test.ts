import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeAuthRedirect } from '../auth-redirect';

test('accepts internal auth return routes', () => {
  assert.equal(normalizeAuthRedirect('/add-music'), '/add-music');
  assert.equal(normalizeAuthRedirect('/post/post-1?from=%2Fexplore'), '/post/post-1?from=%2Fexplore');
});

test('rejects external and encoded protocol-relative auth redirects', () => {
  assert.equal(normalizeAuthRedirect('https://evil.example'), null);
  assert.equal(normalizeAuthRedirect('//evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\\evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%5Cevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%255Cevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%2F%2Fevil.example'), null);
  assert.equal(normalizeAuthRedirect('/%252F%252Fevil.example'), null);
  assert.equal(normalizeAuthRedirect('/\t/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\n/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/\r/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%09/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%0A/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/%0D/evil.example'), null);
  assert.equal(normalizeAuthRedirect('/bad%escape'), null);
});
