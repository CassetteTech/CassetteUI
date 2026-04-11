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
    is_creator_view: false,
    is_repost: false,
    element_type: 'track',
    post_id: 'post-123',
    source_domain: 'https://open.spotify.com/track/abc?si=secret',
    signup_source: 'friend',
    signup_medium: 'dm',
    signup_campaign: 'beta_batch',
    first_referrer_domain: 'https://www.instagram.com/cassette',
    first_touch_source: 'friend',
    user_id: 'user-1',
    internal_actor: true,
    playlist_track_count: 212,
    tracks_added: 180,
    tracks_failed: 20,
    total_tracks: 200,
    connection_state: 'connection_required',
    description: 'should-not-pass',
    query_text: 'secret search',
    made_up: 'nope',
  } as unknown as Partial<AnalyticsBaseProps>);

  assert.equal(result.route, '/post/123');
  assert.equal(result.source_platform, 'apple');
  assert.equal(result.target_platform, 'spotify');
  assert.equal(result.source_context, 'playlist_convert_button');
  assert.equal(result.is_creator_view, false);
  assert.equal(result.is_repost, false);
  assert.equal(result.element_type, 'track');
  assert.equal(result.post_id, 'post-123');
  assert.equal(result.source_domain, 'open.spotify.com');
  assert.equal(result.signup_source, 'friend');
  assert.equal(result.signup_medium, 'dm');
  assert.equal(result.signup_campaign, 'beta_batch');
  assert.equal(result.first_referrer_domain, 'www.instagram.com');
  assert.equal(result.first_touch_source, 'friend');
  assert.equal(result.user_id, 'user-1');
  assert.equal(result.internal_actor, true);
  assert.equal(result.playlist_track_count, 212);
  assert.equal(result.tracks_added, 180);
  assert.equal(result.tracks_failed, 20);
  assert.equal(result.total_tracks, 200);
  assert.equal(result.connection_state, 'connection_required');
  assert.equal((result as Record<string, unknown>).description, undefined);
  assert.equal((result as Record<string, unknown>).query_text, undefined);
  assert.equal((result as Record<string, unknown>).made_up, undefined);
});
