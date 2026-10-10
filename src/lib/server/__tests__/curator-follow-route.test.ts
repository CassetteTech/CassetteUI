/** Runs the real Follow proxy route handlers: the origin check before any write leaves the app, path safety, and forwarding. */

import '../../../services/__tests__/browser-service-environment';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import * as followRoute from '../../../app/api/v1/curators/[curatorProfileId]/follow/route';

const handlers = { GET: followRoute.GET, PUT: followRoute.PUT, DELETE: followRoute.DELETE };

const APP = 'http://localhost:3000';
const BRIDGE_FOLLOW = 'https://api.cassette.test/api/v1/curators/cpr_Night01/follow';
const STATE = { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false };

type Forwarded = { url: string; init: RequestInit };
let forwarded: Forwarded[] = [];
const previousFetch = globalThis.fetch;

beforeEach(() => {
  forwarded = [];
  delete process.env.PLAYWRIGHT_TEST;
  globalThis.fetch = async (input, init) => {
    forwarded.push({ url: input instanceof Request ? input.url : input.toString(), init: init ?? {} });
    return new Response(JSON.stringify(STATE), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'cache-control': 'private, no-store',
        vary: 'Authorization, Cookie',
        'set-cookie': 'bridge_internal=1',
      },
    });
  };
});

afterEach(() => {
  globalThis.fetch = previousFetch;
  delete process.env.PLAYWRIGHT_TEST;
});

const context = (curatorProfileId = 'cpr_Night01') => ({ params: Promise.resolve({ curatorProfileId }) });

function request(method: string, headers: Record<string, string> = {}, signal?: AbortSignal) {
  return new NextRequest(`${APP}/api/v1/curators/cpr_Night01/follow`, {
    method,
    headers: { cookie: 'cassette_session=session-123; other=x', ...headers },
    signal,
  });
}

for (const method of ['PUT', 'DELETE'] as const) {
  void test(`a ${method} from another origin, or with no origin at all, is refused before forwarding`, async () => {
    const refused: Array<Record<string, string>> = [
      { origin: 'https://evil.example' },
      { referer: 'https://evil.example/profile/night-curator' },
      { origin: 'null' },
      { referer: 'not a url' },
      {},
    ];
    for (const headers of refused) {
      const response = await handlers[method](request(method, headers), context());
      assert.equal(response.status, 403, JSON.stringify(headers));
    }
    assert.deepEqual(forwarded, []);
  });
}

void test('a same-origin PUT forwards one empty-body write with the session and returns Bridge private headers', async () => {
  const response = await followRoute.PUT(request('PUT', { origin: APP }), context());

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), STATE);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal(response.headers.get('vary'), 'Authorization, Cookie');
  assert.equal(response.headers.get('set-cookie'), null);

  assert.equal(forwarded.length, 1);
  const [{ url, init }] = forwarded;
  assert.equal(url, BRIDGE_FOLLOW);
  assert.equal(init.method, 'PUT');
  assert.equal(init.body, undefined);
  assert.equal(init.cache, 'no-store');
  const headers = new Headers(init.headers);
  assert.equal(headers.get('X-Cassette-Web-Session'), 'session-123');
  assert.equal(headers.get('X-Cassette-Web-Internal'), 'cassette-ui');
  assert.equal(headers.get('cookie'), null);
});

void test('a same-origin referer is enough for an Unfollow', async () => {
  const response = await followRoute.DELETE(request('DELETE', { referer: `${APP}/profile/night-curator?tab=posts` }), context());

  assert.equal(response.status, 200);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].url, BRIDGE_FOLLOW);
  assert.equal(forwarded[0].init.method, 'DELETE');
});

void test('a relationship read needs no origin', async () => {
  const response = await followRoute.GET(request('GET'), context());

  assert.equal(response.status, 200);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0].url, BRIDGE_FOLLOW);
  assert.equal(forwarded[0].init.method, 'GET');
  assert.equal(new Headers(forwarded[0].init.headers).get('X-Cassette-Web-Session'), 'session-123');
});

void test('a decoded path segment that is not a curator profile ID never reaches Bridge', async () => {
  for (const id of ['..', '../me/audience', 'cpr_Night01/../../users', 'cpr_Night01?x=1', 'cpr_', 'me', `cpr_${'a'.repeat(37)}`]) {
    for (const method of ['GET', 'PUT', 'DELETE'] as const) {
      const response = await handlers[method](request(method, { origin: APP }), context(id));
      assert.equal(response.status, 404, `${method} ${id}`);
    }
  }
  assert.deepEqual(forwarded, []);
});

void test('a disconnected caller aborts the Bridge request', async () => {
  const caller = new AbortController();
  let forwardedSignal: AbortSignal | undefined;
  globalThis.fetch = async (_input, init) => {
    forwardedSignal = init?.signal ?? undefined;
    return await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')), { once: true });
    });
  };

  const pending = followRoute.PUT(request('PUT', { origin: APP }, caller.signal), context());
  await new Promise((resolve) => setImmediate(resolve));
  caller.abort();

  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(forwardedSignal?.aborted, true);
});

void test('the Playwright guard answers after the origin check and forwards nothing', async () => {
  process.env.PLAYWRIGHT_TEST = 'true';

  assert.equal((await followRoute.PUT(request('PUT', { origin: 'https://evil.example' }), context())).status, 403);
  assert.equal((await followRoute.PUT(request('PUT', { origin: APP }), context())).status, 503);
  assert.equal((await followRoute.GET(request('GET'), context())).status, 503);
  assert.deepEqual(forwarded, []);
});

void test('the route defines only the relationship read and the two writes', () => {
  assert.deepEqual(Object.keys(followRoute).sort(), ['DELETE', 'GET', 'PUT']);
});
