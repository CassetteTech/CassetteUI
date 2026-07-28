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
    elementId: 't_123456789ABC',
    elementType: 'track',
    title: 'Signal Fire',
    coverArtUrl: 'https://images.cassette.test/signal-fire.jpg',
    subtitleNames: ['Mia Groove'],
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

  assert.equal(parsed.elementId, 't_123456789ABC');
  assert.equal(parsed.elementType, 'track');
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
    () => parsePaidPromotionSubject({ ...subject(), title: 42 }),
    /title/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), coverArtUrl: 'javascript:alert(1)' }),
    /coverArtUrl/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), subtitleNames: [''] }),
    /subtitleNames\[0\]/,
  );
  assert.throws(
    () => parsePaidPromotionSubject({ ...subject(), campaignCount: Number.MAX_SAFE_INTEGER + 1 }),
    /campaignCount/,
  );
});

void test('renders a subject type that carries no secondary names', () => {
  // Artist and playlist subjects have an empty subtitle list by design; that
  // is a valid rollup, not a malformed one.
  const parsed = parsePaidPromotionSubject({
    ...subject(),
    elementId: 'r_123456789ABC',
    elementType: 'artist',
    title: 'Mia Groove',
    subtitleNames: [],
  });
  assert.equal(parsed.elementType, 'artist');
  assert.deepEqual(parsed.subtitleNames, []);

  // A missing list is still a boundary failure.
  const missing = { ...subject() } as Record<string, unknown>;
  delete missing.subtitleNames;
  assert.throws(() => parsePaidPromotionSubject(missing), /subtitleNames/);
});
