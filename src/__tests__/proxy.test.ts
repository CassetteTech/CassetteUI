import '../services/__tests__/browser-service-environment';
import assert from 'node:assert/strict';
import test from 'node:test';
import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { config, proxy } from '../proxy';

process.env.NEXT_PUBLIC_APP_DOMAIN = 'https://www.cassette.tech';

const associationPath = '/.well-known/apple-app-site-association';

void test('the proxy runs on the app site association, so its apex redirect applies', () => {
  assert.equal(unstable_doesMiddlewareMatch({ config, url: associationPath }), true);
  assert.equal(unstable_doesMiddlewareMatch({ config, url: '/api/v1/curators/golden-curator/page' }), false);
});

void test('the apex host redirects to www, the app site association included', () => {
  for (const path of [associationPath, '/explore']) {
    const response = proxy(new NextRequest(`https://cassette.tech${path}`));
    assert.equal(response.status, 308, path);
    assert.equal(response.headers.get('location'), `https://www.cassette.tech${path}`);
  }
});

void test('a utm query sets the attribution cookie on pages but not on the app site association', () => {
  const page = proxy(new NextRequest('https://www.cassette.tech/explore?utm_source=x'));
  assert.match(page.headers.get('set-cookie') ?? '', /^cassette_attribution=/);

  const association = proxy(new NextRequest(`https://www.cassette.tech${associationPath}?utm_source=x`));
  assert.equal(association.status, 200);
  assert.equal(association.headers.get('location'), null);
  assert.equal(association.headers.get('set-cookie'), null);
});
