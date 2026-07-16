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

void test('rejects unknown status rollups and inconsistent campaign counts', () => {
  const unknownStatus = subject();
  unknownStatus.campaignStatusCounts = { future_state: 3 };
  assert.throws(
    () => parsePaidPromotionSubject(unknownStatus),
    /campaignStatusCounts\.future_state/,
  );

  const inconsistentCount = subject();
  inconsistentCount.campaignCount = 4;
  assert.throws(
    () => parsePaidPromotionSubject(inconsistentCount),
    /campaignStatusCounts/,
  );
});

void test('rejects malformed canonical track and artwork data', () => {
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), trackId: 'track-from-route-state' }),
    /trackId/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), trackId: 't_000000000000' }),
    /trackId/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), coverArtUrl: 'javascript:alert(1)' }),
    /coverArtUrl/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), artists: [''] }),
    /artists\[0\]/,
  );
});

void test('rejects unsafe counts and inverted campaign windows', () => {
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), campaignCount: Number.MAX_SAFE_INTEGER + 1 }),
    /campaignCount/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({
      ...subject(),
      firstCampaignAtUtc: latestCampaignAtUtc,
      latestCampaignAtUtc: firstCampaignAtUtc,
    }),
    /campaignWindow/,
  );
});
