import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_TEMPLATE_DESTINATION,
  POST_SHARE_DESTINATION,
  buildAttributedPostPath,
  buildTemplateRelativePath,
  buildTemplateUrl,
  isPostShareTemplate,
  isValidDestinationPath,
} from '../attribution-links';

test('isValidDestinationPath accepts bare internal paths', () => {
  assert.equal(isValidDestinationPath('/'), true);
  assert.equal(isValidDestinationPath('/signup'), true);
  assert.equal(isValidDestinationPath('/explore'), true);
  assert.equal(isValidDestinationPath('/collections/spring-2026'), true);
  assert.equal(isValidDestinationPath('  /about  '), true);
});

test('isValidDestinationPath rejects external URLs and injection attempts', () => {
  assert.equal(isValidDestinationPath('https://evil.com'), false);
  assert.equal(isValidDestinationPath('//evil.com'), false);
  assert.equal(isValidDestinationPath('/x?y=1'), false);
  assert.equal(isValidDestinationPath('/x#fragment'), false);
  assert.equal(isValidDestinationPath('/x\\y'), false);
  assert.equal(isValidDestinationPath('signup'), false);
  assert.equal(isValidDestinationPath(''), false);
  assert.equal(isValidDestinationPath('/a b'), false);
  assert.equal(isValidDestinationPath(`/${'a'.repeat(200)}`), false);
});

test('buildTemplateRelativePath defaults to /signup and appends utm params', () => {
  assert.equal(
    buildTemplateRelativePath({ source: 'instagram', medium: 'paid-social', campaign: 'spring-2026' }),
    '/signup?src=instagram&utm_medium=paid-social&utm_campaign=spring-2026',
  );
  assert.equal(DEFAULT_TEMPLATE_DESTINATION, '/signup');
});

test('buildTemplateRelativePath respects destinationPath and skips blank values', () => {
  assert.equal(
    buildTemplateRelativePath({ source: 'twitter', medium: '', campaign: null, destinationPath: '/' }),
    '/?src=twitter',
  );
  assert.equal(
    buildTemplateRelativePath({ source: '', medium: '', campaign: '', destinationPath: '/explore' }),
    '/explore',
  );
});

test('buildTemplateRelativePath encodes param values', () => {
  const path = buildTemplateRelativePath({ source: 'a b&c', medium: null, campaign: null });
  assert.equal(path, '/signup?src=a+b%26c');
});

test('buildTemplateUrl joins origin without double slashes', () => {
  assert.equal(
    buildTemplateUrl('https://www.cassette.tech/', { source: 'reddit', medium: null, campaign: null }),
    'https://www.cassette.tech/signup?src=reddit',
  );
});

test('buildAttributedPostPath tags the post via utm_content and inherits nothing else', () => {
  const path = buildAttributedPostPath('abc-123', {
    source: 'instagram',
    medium: 'social',
    campaign: 'launch',
    destinationPath: '/explore', // ignored: post path wins
  });
  assert.equal(path, '/post/abc-123?src=instagram&utm_medium=social&utm_campaign=launch&utm_content=post-abc-123');
});

test('isPostShareTemplate only matches the post sentinel destination', () => {
  assert.equal(isPostShareTemplate({ destinationPath: POST_SHARE_DESTINATION }), true);
  assert.equal(isPostShareTemplate({ destinationPath: '/signup' }), false);
  assert.equal(isPostShareTemplate({ destinationPath: null }), false);
  assert.equal(isPostShareTemplate({}), false);
});

test('buildAttributedPostPath works with source-only templates', () => {
  assert.equal(
    buildAttributedPostPath('xyz', { source: 'tiktok', medium: null, campaign: null }),
    '/post/xyz?src=tiktok&utm_content=post-xyz',
  );
});
