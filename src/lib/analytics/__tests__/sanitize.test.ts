import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeAnalyticsProps } from '../sanitize';
import type { AnalyticsBaseProps } from '../events';

test('sanitizeAnalyticsProps strips forbidden and unknown fields', () => {
  const result = sanitizeAnalyticsProps({
    route: '/post/123?token=abc',
    source_platform: 'appleMusic',
    target_platform: 'spotify',
    source_context: 'playlist_convert_button',
    element_type: 'track',
    post_id: 'post-123',
    source_domain: 'https://open.spotify.com/track/abc?si=secret',
    user_id: 'user-1',
    internal_actor: true,
    description: 'should-not-pass',
    query_text: 'secret search',
    made_up: 'nope',
  } as unknown as Partial<AnalyticsBaseProps>);

  assert.equal(result.route, '/post/123');
  assert.equal(result.source_platform, 'apple');
  assert.equal(result.target_platform, 'spotify');
  assert.equal(result.source_context, 'playlist_convert_button');
  assert.equal(result.element_type, 'track');
  assert.equal(result.post_id, 'post-123');
  assert.equal(result.source_domain, 'open.spotify.com');
  assert.equal(result.user_id, 'user-1');
  assert.equal(result.internal_actor, true);
  assert.equal((result as Record<string, unknown>).description, undefined);
  assert.equal((result as Record<string, unknown>).query_text, undefined);
  assert.equal((result as Record<string, unknown>).made_up, undefined);
});
