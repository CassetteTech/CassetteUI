import assert from 'node:assert/strict';
import test from 'node:test';
import { shouldUseSecureCookies } from '../cookie-security';

for (const { name, options, secure } of [
  { name: 'allows local HTTP cookies when running a production Next server', options: { appDomain: 'http://local.cassette.tech:3000' }, secure: false },
  { name: 'keeps hosted HTTPS cookies secure', options: { appDomain: 'https://dev.cassette.tech' }, secure: true },
  { name: 'uses an HTTPS fallback URL when the primary domain is invalid', options: { appDomain: 'not a URL', nextAuthUrl: 'https://www.cassette.tech' }, secure: true },
  { name: 'uses an HTTP fallback URL when the primary domain is invalid', options: { appDomain: 'not a URL', nextAuthUrl: 'http://local.cassette.tech:3000' }, secure: false },
  { name: 'defaults to secure cookies in production when URLs are absent', options: {}, secure: true },
]) {
  test(name, () => {
    assert.equal(shouldUseSecureCookies({ nodeEnv: 'production', ...options }), secure);
  });
}
