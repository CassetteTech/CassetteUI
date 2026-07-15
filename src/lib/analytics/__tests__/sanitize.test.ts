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
    paid_promotion_campaign_id: 'pmc_0123AbCd',
    source_domain: 'https://open.spotify.com/track/abc?si=secret',
    signup_source: 'friend',
    signup_medium: 'dm',
    signup_campaign: 'beta_batch',
    traffic_source: 'redditbot',
    traffic_medium: 'reddit_comment',
    traffic_campaign: 'playlist_link',
    traffic_content: 'cassetteclub',
    reddit_subreddit: 'cassetteclub',
    reddit_post_id: 't3_abc123',
    first_referrer_domain: 'https://www.instagram.com/cassette',
    first_touch_source: 'friend',
    user_id: 'user-1',
    internal_actor: true,
    playlist_track_count: 212,
    tracks_added: 180,
    tracks_failed: 20,
    total_tracks: 200,
    connection_state: 'connection_required',
    correlation_id: '44444444-4444-4444-4444-444444444444',
    conversion_job_id: 'cj_123',
    lambda_request_id: 'lambda-request-1',
    source_link_hash: 'a'.repeat(64),
    source_link: 'https://open.spotify.com/track/secret',
    amount_minor: 25000,
    checkout_url: 'https://checkout.stripe.test/secret',
    brief: 'private campaign details',
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
  assert.equal(result.paid_promotion_campaign_id, 'pmc_0123AbCd');
  assert.equal(result.source_domain, 'open.spotify.com');
  assert.equal(result.signup_source, 'friend');
  assert.equal(result.signup_medium, 'dm');
  assert.equal(result.signup_campaign, 'beta_batch');
  assert.equal(result.traffic_source, 'redditbot');
  assert.equal(result.traffic_medium, 'reddit_comment');
  assert.equal(result.traffic_campaign, 'playlist_link');
  assert.equal(result.traffic_content, 'cassetteclub');
  assert.equal(result.reddit_subreddit, 'cassetteclub');
  assert.equal(result.reddit_post_id, 't3_abc123');
  assert.equal(result.first_referrer_domain, 'www.instagram.com');
  assert.equal(result.first_touch_source, 'friend');
  assert.equal(result.user_id, 'user-1');
  assert.equal(result.internal_actor, true);
  assert.equal(result.playlist_track_count, 212);
  assert.equal(result.tracks_added, 180);
  assert.equal(result.tracks_failed, 20);
  assert.equal(result.total_tracks, 200);
  assert.equal(result.connection_state, 'connection_required');
  assert.equal(result.correlation_id, '44444444-4444-4444-4444-444444444444');
  assert.equal(result.conversion_job_id, 'cj_123');
  assert.equal(result.lambda_request_id, 'lambda-request-1');
  assert.equal(result.source_link_hash, 'a'.repeat(64));
  assert.equal((result as Record<string, unknown>).source_link, undefined);
  assert.equal((result as Record<string, unknown>).amount_minor, undefined);
  assert.equal((result as Record<string, unknown>).checkout_url, undefined);
  assert.equal((result as Record<string, unknown>).brief, undefined);
  assert.equal((result as Record<string, unknown>).description, undefined);
  assert.equal((result as Record<string, unknown>).query_text, undefined);
  assert.equal((result as Record<string, unknown>).made_up, undefined);
});

test('sanitizeAnalyticsProps keeps only opaque bounded paid-promotion campaign ids', () => {
  assert.equal(
    sanitizeAnalyticsProps({ paid_promotion_campaign_id: 'pmc_0123AbCd' })
      .paid_promotion_campaign_id,
    'pmc_0123AbCd',
  );
  assert.equal(
    sanitizeAnalyticsProps({ paid_promotion_campaign_id: 'campaign-123' })
      .paid_promotion_campaign_id,
    undefined,
  );
  assert.equal(
    sanitizeAnalyticsProps({ paid_promotion_campaign_id: 'pmc_bad/value' })
      .paid_promotion_campaign_id,
    undefined,
  );
  assert.equal(
    sanitizeAnalyticsProps({ paid_promotion_campaign_id: `pmc_${'a'.repeat(37)}` })
      .paid_promotion_campaign_id,
    undefined,
  );
});
