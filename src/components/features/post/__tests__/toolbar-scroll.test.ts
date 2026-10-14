import assert from 'node:assert/strict';
import test from 'node:test';
import { listProgress, statsSlideUnderLid, titleUnder, trackCounterText, trackStatsUnderLid } from '../toolbar-scroll';

const lid = { top: 64, bottom: 112, right: 900 };

void test('the title prints on the lid in proportion to how far the h1 has gone under it', () => {
  assert.equal(titleUnder(lid, { top: 112, height: 40 }), 0);
  assert.equal(titleUnder(lid, { top: 92, height: 40 }), 0.5);
  assert.equal(titleUnder(lid, { top: 20, height: 40 }), 1);
});

void test('stats slide only when they end inside the lid and motion is allowed', () => {
  assert.equal(statsSlideUnderLid({ right: 880 }, lid, false), true);
  assert.equal(statsSlideUnderLid({ right: 960 }, lid, false), false);
  assert.equal(statsSlideUnderLid({ right: 880 }, lid, true), false);
});

void test('sliding stats stop at the lid centre line, then roll into the counter', () => {
  const below = { top: 140, bottom: 160 };
  assert.deepEqual(
    trackStatsUnderLid({ lid, stats: below, cardBottom: 900, slides: true, counts: true }),
    { statsShift: 62, statsVisible: 1, counterSwap: 0, listExit: 0 },
  );
  const above = { top: 66, bottom: 86 };
  assert.deepEqual(
    trackStatsUnderLid({ lid, stats: above, cardBottom: 900, slides: true, counts: true }),
    { statsShift: 0, statsVisible: 1, counterSwap: 0.5, listExit: 0 },
  );
});

void test('stats that cannot slide stay hidden until they reach the centre line', () => {
  const below = { top: 140, bottom: 160 };
  assert.equal(trackStatsUnderLid({ lid, stats: below, cardBottom: 900, slides: false, counts: false }).statsVisible, 0);
});

void test('the card bottom moves the stats out once it passes the lid bottom', () => {
  const above = { top: 66, bottom: 86 };
  assert.deepEqual(
    trackStatsUnderLid({ lid, stats: above, cardBottom: 100, slides: true, counts: false }),
    { statsShift: -12, statsVisible: 1, counterSwap: 0, listExit: -12 },
  );
});

void test('list progress and the counter follow the rows that passed the lid', () => {
  assert.equal(listProgress(112, 62, 162), 0.5);
  assert.equal(listProgress(112, 200, 400), 0);
  assert.equal(trackCounterText(0, 12), 'Track 01 of 12');
  assert.equal(trackCounterText(7, 120), 'Track 007 of 120');
});
