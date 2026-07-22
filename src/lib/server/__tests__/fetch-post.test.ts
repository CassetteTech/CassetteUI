import assert from 'node:assert/strict';
import test from 'node:test';
import type { PostByIdResponse } from '../../../types';
import { fetchPostForMetadata } from '../fetch-post';

type MetadataRequestInit = RequestInit & {
  next?: { revalidate?: number };
};

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function makePost(postId: string): PostByIdResponse {
  return {
    success: true,
    postId,
    elementType: 'track',
    musicElementId: `music-${postId}`,
    details: { title: postId },
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
    assert.deepEqual(calls, ['https://bridge.test/api/v1/social/posts/same-id']);

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
    const postId = url.split('/').at(-1);
    return upstreamById.get(postId || '')!.promise;
  }, async () => {
    const first = fetchPostForMetadata('first-id');
    const second = fetchPostForMetadata('second-id');

    assert.deepEqual(calls, [
      'https://bridge.test/api/v1/social/posts/first-id',
      'https://bridge.test/api/v1/social/posts/second-id',
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

test('preserves the Next fetch revalidation window', async () => {
  const calls: Array<{ init?: MetadataRequestInit; url: string }> = [];

  await withMockedFetch(async (input, init) => {
    calls.push({ init: init as MetadataRequestInit, url: requestUrl(input) });
    return postResponse('revalidation-id');
  }, async () => {
    assert.deepEqual(await fetchPostForMetadata('revalidation-id'), makePost('revalidation-id'));
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].init?.next, { revalidate: 300 });
    assert.ok(calls[0].init?.signal instanceof AbortSignal);
  });
});
