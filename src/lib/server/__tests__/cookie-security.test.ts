import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldUseSecureCookies } from '../cookie-security';

test('allows local HTTP cookies when running a production Next server', () => {
  assert.equal(
    shouldUseSecureCookies({
      nodeEnv: 'production',
      appDomain: 'http://local.cassette.tech:3000',
    }),
    false,
  );
});

test('keeps hosted HTTPS cookies secure', () => {
  assert.equal(
    shouldUseSecureCookies({
      nodeEnv: 'production',
      appDomain: 'https://dev.cassette.tech',
    }),
    true,
  );
});

test('uses an HTTPS fallback URL when the primary domain is invalid', () => {
  assert.equal(
    shouldUseSecureCookies({
      nodeEnv: 'production',
      appDomain: 'not a URL',
      nextAuthUrl: 'https://www.cassette.tech',
    }),
    true,
  );
});

test('defaults to secure cookies in production when URLs are absent', () => {
  assert.equal(shouldUseSecureCookies({ nodeEnv: 'production' }), true);
});
