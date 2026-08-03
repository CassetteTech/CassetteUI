import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getPaidPromotionResolutionFailure,
  PaidPromotionResolutionError,
} from '../paid-promotion-resolution-errors';

test('maps every intake-owned resolution failure to distinct customer copy and an action', () => {
  const cases = [
    new PaidPromotionResolutionError('invalid_link'),
    new PaidPromotionResolutionError('unsupported_link'),
    new PaidPromotionResolutionError('missing_post'),
    new PaidPromotionResolutionError('canonical_record'),
    { errorCode: 'paid_promotion_subject_conversion_required' },
    { errorCode: 'paid_promotion_subject_source_incomplete' },
    { status: 404, message: 'internal lookup details' },
    { status: 503, message: 'internal upstream details' },
    new Error('an internal exception that must not render'),
  ];

  const failures = cases.map(getPaidPromotionResolutionFailure);

  assert.equal(new Set(failures.map((failure) => failure.title)).size, cases.length);
  for (const failure of failures) {
    assert.ok(failure.message.length > 0);
    assert.ok(failure.actionLabel.length > 0);
  }
});

test('maps legacy and current paid-promotion error codes to the same recovery paths', () => {
  assert.deepEqual(
    getPaidPromotionResolutionFailure({ errorCode: 'paid_promotion_track_conversion_required' }),
    getPaidPromotionResolutionFailure({ errorCode: 'paid_promotion_subject_conversion_required' }),
  );
  assert.deepEqual(
    getPaidPromotionResolutionFailure(new Error('paid_promotion_track_source_incomplete')),
    getPaidPromotionResolutionFailure({ errorCode: 'paid_promotion_subject_source_incomplete' }),
  );
});

test('never returns raw server or exception text', () => {
  const rawMessages = [
    'database stack trace with customer secrets',
    'Conversion completed without a post id.',
    'Cassette could not resolve this link to a canonical record.',
  ];

  for (const rawMessage of rawMessages) {
    const failure = getPaidPromotionResolutionFailure(new Error(rawMessage));
    assert.equal(`${failure.title} ${failure.message}`.includes(rawMessage), false);
  }
});
