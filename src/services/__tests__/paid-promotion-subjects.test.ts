import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePaidPromotionSubject,
  parsePaidPromotionSubjects,
} from '../paid-promotion-subject-contract';

const firstCampaignAtUtc = '2026-07-10T12:00:00Z';
const latestCampaignAtUtc = '2026-07-15T12:00:00Z';

function subject(): Record<string, unknown> {
  return {
    trackId: 't_123456789ABC',
    trackTitle: 'Signal Fire',
    coverArtUrl: 'https://images.cassette.test/signal-fire.jpg',
    artists: ['Mia Groove'],
    campaignCount: 3,
    campaignStatusCounts: {
      in_review: 1,
      scheduled: 2,
    },
    firstCampaignAtUtc,
    latestCampaignAtUtc,
  };
}

void test('parses the shared owner and team subject contract', () => {
  const parsed = parsePaidPromotionSubject(subject());

  assert.equal(parsed.trackId, 't_123456789ABC');
  assert.equal(parsed.campaignCount, 3);
  assert.deepEqual(parsed.campaignStatusCounts, { in_review: 1, scheduled: 2 });
  assert.deepEqual(parsePaidPromotionSubjects([subject()]), [parsed]);
});

void test('tolerates additive backend changes in rollups', () => {
  // New status keys and rollups that don't sum to campaignCount pass through;
  // auditing rollup arithmetic is a server-side job.
  const evolved = subject();
  evolved.campaignStatusCounts = { in_review: 1, future_state: 5 };
  evolved.campaignCount = 4;
  const parsed = parsePaidPromotionSubject(evolved);
  assert.equal(parsed.campaignCount, 4);
  assert.deepEqual(parsed.campaignStatusCounts, { in_review: 1, future_state: 5 });
});

void test('rejects malformed rendered fields at the boundary', () => {
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), trackTitle: 42 }),
    /trackTitle/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), coverArtUrl: 'javascript:alert(1)' }),
    /coverArtUrl/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), artists: [''] }),
    /artists\[0\]/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), campaignCount: Number.MAX_SAFE_INTEGER + 1 }),
    /campaignCount/,
  );
});
