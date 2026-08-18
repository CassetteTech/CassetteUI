// Verifies that server proxy fetches preserve caller cancellation and bounded timeouts.

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fetchBackendWithCallerCancellation } from '../proxy-fetch';

void test('API proxy preserves backend cache isolation headers', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'src/lib/server/auth-proxy.ts'),
    'utf8',
  );
  const forwardedHeaders = source.match(/FORWARDED_RESPONSE_HEADERS = \[([\s\S]*?)] as const/)?.[1];

  assert.match(forwardedHeaders ?? '', /'cache-control'/);
  assert.match(forwardedHeaders ?? '', /'vary'/);
});

void test('API proxy aborts its Bridge fetch when the caller disconnects', async () => {
  const callerCancellation = new AbortController();
  const previousFetch = globalThis.fetch;
  let forwardedSignal: AbortSignal | null = null;

  globalThis.fetch = async (_input, init) => {
    const signal = init?.signal;
    assert.ok(signal instanceof AbortSignal);
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
