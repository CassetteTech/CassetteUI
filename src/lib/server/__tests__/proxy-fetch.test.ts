import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchBackendWithCallerCancellation } from '../proxy-fetch';

test('API proxy aborts its Bridge fetch when the caller disconnects', async () => {
  const callerCancellation = new AbortController();
  const previousFetch = globalThis.fetch;
  let forwardedSignal: AbortSignal | null = null;

  globalThis.fetch = async (_input, init) => {
    const signal = init?.signal as AbortSignal;
    forwardedSignal = signal;
    return await new Promise<Response>((_resolve, reject) => {
      signal.addEventListener(
        'abort',
        () => reject(new DOMException('The caller disconnected', 'AbortError')),
        { once: true },
      );
    });
  };

  try {
    const forwarded = fetchBackendWithCallerCancellation(
      'https://bridge.test/api/v1/social/posts/post-1',
      { method: 'GET' },
      callerCancellation.signal,
    );
    callerCancellation.abort();

    await assert.rejects(forwarded, { name: 'AbortError' });
    assert.strictEqual(forwardedSignal, callerCancellation.signal);
  } finally {
    globalThis.fetch = previousFetch;
  }
});
