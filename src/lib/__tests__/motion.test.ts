import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { EASE_IN_QUART, EASE_OUT_QUART, cubicBezier } from '../motion';

void test('the CSS easing properties use the motion module curves', () => {
  const css = readFileSync('src/app/globals.css', 'utf8');
  assert.match(css, new RegExp(`--ease-out-quart: ${escape(cubicBezier(EASE_OUT_QUART))};`));
  assert.match(css, new RegExp(`--ease-in-quart: ${escape(cubicBezier(EASE_IN_QUART))};`));
});

function escape(value: string) {
  return value.replace(/[()]/g, '\\$&');
}
