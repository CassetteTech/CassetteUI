import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatScore,
  pickDefaultSnapshotId,
  snapshotStatusTone,
  scoreEntries,
  maxAbsValue,
  barWidthPercent,
} from '../explore-snapshot-utils';

test('formatScore renders 3 decimal places and handles missing values', () => {
  assert.equal(formatScore(0.5), '0.500');
  assert.equal(formatScore(-0.1), '-0.100');
  assert.equal(formatScore(1.23456), '1.235');
  assert.equal(formatScore(null), '—');
  assert.equal(formatScore(undefined), '—');
  assert.equal(formatScore(Number.NaN), '—');
});

test('pickDefaultSnapshotId prefers the latest successful snapshot', () => {
  const id = pickDefaultSnapshotId([
    { snapshotId: 'exs_failed_newest', status: 'Failed', isLatestSuccessful: false },
    { snapshotId: 'exs_success', status: 'Succeeded', isLatestSuccessful: true },
    { snapshotId: 'exs_old', status: 'Succeeded', isLatestSuccessful: false },
  ]);
  assert.equal(id, 'exs_success');
});

test('pickDefaultSnapshotId falls back to first Succeeded, then newest, then null', () => {
  // No flagged-latest: fall back to first Succeeded in the (newest-first) list.
  assert.equal(
    pickDefaultSnapshotId([
      { snapshotId: 'exs_failed', status: 'Failed', isLatestSuccessful: false },
      { snapshotId: 'exs_ok', status: 'Succeeded', isLatestSuccessful: false },
    ]),
    'exs_ok'
  );
  // No successful at all: fall back to the newest (first) row.
  assert.equal(
    pickDefaultSnapshotId([
      { snapshotId: 'exs_failed_a', status: 'Failed', isLatestSuccessful: false },
      { snapshotId: 'exs_failed_b', status: 'Failed', isLatestSuccessful: false },
    ]),
    'exs_failed_a'
  );
  assert.equal(pickDefaultSnapshotId([]), null);
});

test('snapshotStatusTone maps known statuses', () => {
  assert.equal(snapshotStatusTone('Succeeded'), 'success');
  assert.equal(snapshotStatusTone('Failed'), 'failed');
  assert.equal(snapshotStatusTone('Generating'), 'pending');
  assert.equal(snapshotStatusTone(null), 'pending');
});

test('scoreEntries sorts by descending magnitude', () => {
  const entries = scoreEntries({ small: 0.1, big: -0.9, mid: 0.5 });
  assert.deepEqual(
    entries.map(([key]) => key),
    ['big', 'mid', 'small']
  );
  assert.deepEqual(scoreEntries(null), []);
});

test('maxAbsValue spans multiple maps and barWidthPercent scales to it', () => {
  const max = maxAbsValue({ a: 0.2 }, { b: -0.8 }, null);
  assert.equal(max, 0.8);
  assert.equal(barWidthPercent(0.8, max), 100);
  assert.equal(barWidthPercent(0.4, max), 50);
  assert.equal(barWidthPercent(0.4, 0), 0);
});
