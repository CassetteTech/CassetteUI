import test from 'node:test';
import assert from 'node:assert/strict';

import { LAMBDA_WARMUP_INTERVAL_MS, requestLambdaWarmup } from '../lambda-warmup';

function createTab() {
  const values = new Map<string, string>();
  let sends = 0;
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
  };
  return {
    warm: (now: number, enabled = true, send: () => Promise<void> = async () => undefined) =>
      requestLambdaWarmup({
        enabled,
        getStorage: () => storage,
        send: () => {
          sends += 1;
          return send();
        },
        now,
      }),
    sends: () => sends,
  };
}

test('requestLambdaWarmup sends at most once per interval in one tab', () => {
  const tab = createTab();
  const start = 1_700_000_000_000;

  assert.equal(tab.warm(start), true);
  assert.equal(tab.warm(start + LAMBDA_WARMUP_INTERVAL_MS - 1), false);
  assert.equal(tab.warm(start + LAMBDA_WARMUP_INTERVAL_MS), true);
  assert.equal(tab.sends(), 2);
});

test('requestLambdaWarmup never sends when the flag is off', () => {
  const tab = createTab();

  assert.equal(tab.warm(1_700_000_000_000, false), false);
  assert.equal(tab.warm(1_800_000_000_000, false), false);
  assert.equal(tab.sends(), 0);
});

test('requestLambdaWarmup swallows a rejected warmup request', async () => {
  const tab = createTab();

  assert.equal(tab.warm(1_700_000_000_000, true, () => Promise.reject(new Error('Bridge unavailable'))), true);
  // Let the rejection settle; an unhandled rejection fails the test run.
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(tab.sends(), 1);
});

test('requestLambdaWarmup skips the warmup when sessionStorage is blocked', () => {
  let sends = 0;
  const sent = requestLambdaWarmup({
    enabled: true,
    getStorage: () => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    },
    send: async () => {
      sends += 1;
    },
  });

  assert.equal(sent, false);
  assert.equal(sends, 0);
});
