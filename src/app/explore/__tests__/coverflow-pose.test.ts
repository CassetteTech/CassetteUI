import assert from 'node:assert/strict';
import test from 'node:test';
import { coverflowCopies, coverflowPose, easeStep } from '../coverflow-pose';

void test('the centered card sits flat, full size, and on top', () => {
  assert.deepEqual(coverflowPose(0), { angle: 0, depth: -0, fade: 1, z: 50 });
});

void test('cards tilt with their outer edge back, reaching full tilt at 0.4 pitches', () => {
  assert.deepEqual(coverflowPose(0.2), { angle: 22.5, depth: -60, fade: 1, z: 48 });
  assert.deepEqual(coverflowPose(-1), { angle: -45, depth: -300, fade: 1, z: 40 });
});

void test('the edge stack fades from four pitches and is gone by eight', () => {
  assert.equal(coverflowPose(4).fade, 1);
  assert.equal(coverflowPose(6).fade, 0.5);
  assert.equal(coverflowPose(-8).fade, 0);
});

void test('depth keeps receding past the fade so distant cards never share a depth', () => {
  assert.deepEqual(coverflowPose(10), { angle: 45, depth: -3000, fade: 0, z: -50 });
  assert.equal(coverflowPose(12).depth, -3600);
});

void test('the runway repeats the list an odd number of times to hold at least 75 cards', () => {
  assert.equal(coverflowCopies(1), 1);
  assert.equal(coverflowCopies(10), 9);
  assert.equal(coverflowCopies(15), 5);
  assert.equal(coverflowCopies(40), 3);
});

void test('easing closes a fixed share of the gap per elapsed time, capped at 64 ms', () => {
  assert.equal(easeStep(60), 1 - Math.exp(-1));
  assert.equal(easeStep(1_000), easeStep(64));
});
