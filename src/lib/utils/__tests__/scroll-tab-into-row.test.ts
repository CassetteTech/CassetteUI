import assert from 'node:assert/strict';
import test from 'node:test';
import { scrollTabIntoRow } from '../scroll-tab-into-row';

void test('a tab left of the visible row scrolls to its start', () => {
  const row = { scrollLeft: 120, clientWidth: 200 };
  scrollTabIntoRow(row, { offsetLeft: 40, offsetWidth: 60 });
  assert.equal(row.scrollLeft, 40);
});

void test('a tab right of the visible row scrolls until its end shows', () => {
  const row = { scrollLeft: 0, clientWidth: 200 };
  scrollTabIntoRow(row, { offsetLeft: 260, offsetWidth: 60 });
  assert.equal(row.scrollLeft, 120);
});

void test('a visible tab leaves the row where it is', () => {
  const row = { scrollLeft: 50, clientWidth: 200 };
  scrollTabIntoRow(row, { offsetLeft: 100, offsetWidth: 60 });
  assert.equal(row.scrollLeft, 50);
});
