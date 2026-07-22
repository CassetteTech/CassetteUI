import test from 'node:test';
import assert from 'node:assert/strict';

import { shareWebContent } from '../web-share';

test('treats user cancellation as an expected no-op', async () => {
  const cancelled = new Error('The user cancelled the share');
  cancelled.name = 'AbortError';

  const result = await shareWebContent({}, async () => {
    throw cancelled;
  });

  assert.equal(result, 'cancelled');
});

test('rejects unexpected share failures so callers can observe them', async () => {
  const failure = new Error('Share service unavailable');

  await assert.rejects(
    shareWebContent({}, async () => {
      throw failure;
    }),
    failure,
  );
});

test('does not start a second share while the first is active', async () => {
  let finishFirstShare: (() => void) | undefined;
  const firstShare = new Promise<void>((resolve) => {
    finishFirstShare = resolve;
  });
  let shareCalls = 0;
  const share = () => {
    shareCalls += 1;
    return firstShare;
  };

  const firstResult = shareWebContent({}, share);
  const secondResult = await shareWebContent({}, share);

  assert.equal(secondResult, 'busy');
  assert.equal(shareCalls, 1);

  finishFirstShare?.();
  assert.equal(await firstResult, 'shared');
});
