import assert from 'node:assert/strict';
import test from 'node:test';
import type { PublicPostPageMetadata } from '../../../types';
import { fetchPostForMetadata } from '../fetch-post';

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function makePost(postId: string): PublicPostPageMetadata {
  return {
    title: postId,
    description: `Listen to ${postId} on Cassette`,
    imageUrl: `https://images.test/${postId}.jpg`,
    canonicalUrl: `https://www.cassette.tech/post/${postId}`,
    elementType: 'track',
  };
}

function postResponse(postId: string): Response {
  return new Response(JSON.stringify(makePost(postId)), {
    headers: { 'content-type': 'application/json' },
    status: 200,
  });
}

function requestUrl(input: URL | RequestInfo): string {
  if (typeof input === 'string') return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

function withMockedFetch(
  mockFetch: typeof fetch,
  run: () => Promise<void>,
): Promise<void> {
  const previousApiUrl = process.env.NEXT_PUBLIC_API_URL_LOCAL;
  const previousFetch = globalThis.fetch;
  process.env.NEXT_PUBLIC_API_URL_LOCAL = 'https://bridge.test';
  globalThis.fetch = mockFetch;

  return run().finally(() => {
    globalThis.fetch = previousFetch;
    if (previousApiUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_URL_LOCAL;
    } else {
      process.env.NEXT_PUBLIC_API_URL_LOCAL = previousApiUrl;
    }
  });
}

test('coalesces simultaneous metadata requests for the same post ID', async () => {
  const upstream = deferred<Response>();
  const calls: string[] = [];

  await withMockedFetch(async (input) => {
    calls.push(requestUrl(input));
    return upstream.promise;
  }, async () => {
    const first = fetchPostForMetadata('same-id');
    const second = fetchPostForMetadata('same-id');

    assert.strictEqual(first, second);
    assert.deepEqual(calls, ['https://bridge.test/api/v1/social/posts/same-id/page-metadata']);

    upstream.resolve(postResponse('same-id'));
    assert.deepEqual(await Promise.all([first, second]), [makePost('same-id'), makePost('same-id')]);
  });
});

test('keeps simultaneous metadata requests for different post IDs independent', async () => {
  const upstreamById = new Map([
    ['first-id', deferred<Response>()],
    ['second-id', deferred<Response>()],
  ]);
  const calls: string[] = [];

  await withMockedFetch(async (input) => {
    const url = requestUrl(input);
    calls.push(url);
    const postId = url.split('/').at(-2);
    return upstreamById.get(postId || '')!.promise;
  }, async () => {
    const first = fetchPostForMetadata('first-id');
    const second = fetchPostForMetadata('second-id');

    assert.deepEqual(calls, [
      'https://bridge.test/api/v1/social/posts/first-id/page-metadata',
      'https://bridge.test/api/v1/social/posts/second-id/page-metadata',
    ]);

    upstreamById.get('second-id')!.resolve(postResponse('second-id'));
    assert.deepEqual(await second, makePost('second-id'));
    upstreamById.get('first-id')!.resolve(postResponse('first-id'));
    assert.deepEqual(await first, makePost('first-id'));
  });
});

test('removes failed metadata requests so the post can be retried', async () => {
  let callCount = 0;
  const previousWarn = console.warn;
  console.warn = () => {};

  try {
    await withMockedFetch(async () => {
      callCount += 1;
      return callCount === 1
        ? new Response(null, { status: 503 })
        : postResponse('retry-after-failure');
    }, async () => {
      assert.equal(await fetchPostForMetadata('retry-after-failure'), null);
      assert.deepEqual(
        await fetchPostForMetadata('retry-after-failure'),
        makePost('retry-after-failure'),
      );
      assert.equal(callCount, 2);
    });
  } finally {
    console.warn = previousWarn;
  }
});

test('removes cancelled metadata requests so the post can be retried', async () => {
  let callCount = 0;
  const previousWarn = console.warn;
  console.warn = () => {};

  try {
    await withMockedFetch(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw new DOMException('The request was aborted', 'AbortError');
      }
      return postResponse('retry-after-cancel');
    }, async () => {
      assert.equal(await fetchPostForMetadata('retry-after-cancel'), null);
      assert.deepEqual(
        await fetchPostForMetadata('retry-after-cancel'),
        makePost('retry-after-cancel'),
      );
      assert.equal(callCount, 2);
    });
  } finally {
    console.warn = previousWarn;
  }
});

test('does not persist metadata across post privacy changes', async () => {
  const calls: Array<{ init?: RequestInit; url: string }> = [];

  await withMockedFetch(async (input, init) => {
    calls.push({ init, url: requestUrl(input) });
    return postResponse('revalidation-id');
  }, async () => {
    assert.deepEqual(await fetchPostForMetadata('revalidation-id'), makePost('revalidation-id'));
    assert.equal(calls.length, 1);
    assert.equal(calls[0].init?.cache, 'no-store');
    assert.ok(calls[0].init?.signal instanceof AbortSignal);
  });
});

test('crawler burst coalesces repeated post IDs with bounded latency', async (t) => {
  const postIds = ['burst-one', 'burst-two', 'burst-three'];
  const upstreamById = new Map(postIds.map((postId) => [postId, deferred<Response>()]));
  const upstreamFetchCounts = new Map<string, number>();

  await withMockedFetch(async (input) => {
    const postId = requestUrl(input).split('/').at(-2) || '';
    upstreamFetchCounts.set(postId, (upstreamFetchCounts.get(postId) ?? 0) + 1);
    return upstreamById.get(postId)!.promise;
  }, async () => {
    const startedAt = performance.now();
    const requests = Array.from({ length: 30 }, (_, index) =>
      fetchPostForMetadata(postIds[index % postIds.length]));

    assert.deepEqual(
      Object.fromEntries(upstreamFetchCounts),
      Object.fromEntries(postIds.map((postId) => [postId, 1])),
    );

    for (const postId of postIds) {
      upstreamById.get(postId)!.resolve(postResponse(postId));
    }

    const responses = await Promise.all(requests);
    const latencyMs = performance.now() - startedAt;
    const report = {
      requestCount: requests.length,
      responseStatuses: responses.map((response) => response ? 200 : 404),
      latencyMs: Math.round(latencyMs),
      upstreamFetchCounts: Object.fromEntries(upstreamFetchCounts),
    };
    t.diagnostic(JSON.stringify(report));

    assert.equal(responses.length, 30);
    assert.ok(responses.every(Boolean));
    assert.ok(latencyMs < 1_000, `crawler burst exceeded 1000ms: ${JSON.stringify(report)}`);
  });
});
