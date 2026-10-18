// Covers the release time that bounds every Fan Memberships metric query.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fanMembershipsDashboardRows,
  releaseTimestamp,
} from '../posthog/fan-memberships-activation.mjs';

test('the release time becomes a HogQL literal, and other input is refused', () => {
  assert.equal(releaseTimestamp('2026-10-20T09:30:00Z'), '2026-10-20 09:30:00');
  assert.equal(releaseTimestamp('2026-10-20T11:30:00+02:00'), '2026-10-20 09:30:00');
  for (const value of [undefined, '', 'tomorrow', "2026-10-20'); DROP TABLE events; --"]) {
    assert.throws(() => releaseTimestamp(value), /--release-utc/);
  }
});

test('every dashboard query starts at the release and fills the 12-column grid', () => {
  const rows = fanMembershipsDashboardRows('2026-10-20 00:00:00');
  for (const row of rows) {
    assert.equal(row.reduce((total, [width]) => total + width, 0), 12);
    for (const [, definition] of row) {
      assert.match(definition.query.source.query, /toDateTime\('2026-10-20 00:00:00'\)/, definition.name);
    }
  }
  const keys = rows.flat().map(([, definition]) => definition.key);
  assert.equal(new Set(keys).size, keys.length);
});
