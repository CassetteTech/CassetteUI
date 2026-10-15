import '../../../services/__tests__/browser-service-environment';
import test, { afterEach, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import * as proxyRoute from '../../../app/api/v1/[...path]/route';

type Handler = (request: NextRequest, context: { params: Promise<{ path: string[] }> }) => Promise<Response>;
const handlers: Record<string, Handler> = proxyRoute;
const UNSAFE_METHODS = Object.keys(proxyRoute).filter((method) => !['GET', 'HEAD', 'OPTIONS'].includes(method));

const APP = 'http://localhost:3000';
const BRIDGE = 'https://api.cassette.test';
const STATE = { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false };

// The params Next gives this catch-all for Follow spellings that the case-sensitive
// scoped Follow route does not match. Next decodes an encoded slash inside one
// segment, so that spelling joins back into the canonical Bridge Follow path.
const FOLLOW_ALIASES = [
  { url: '/api/v1/Curators/cpr_Night01/follow', path: ['Curators', 'cpr_Night01', 'follow'] },
  { url: '/api/v1/curators/cpr_Night01/Follow', path: ['curators', 'cpr_Night01', 'Follow'] },
  { url: '/api/v1/curators%2Fcpr_Night01%2Ffollow', path: ['curators/cpr_Night01/follow'] },
];
const WRITE_TARGETS = [{ url: '/api/v1/social/posts', path: ['social', 'posts'] }, ...FOLLOW_ALIASES];

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

const context = (path: string[]) => ({ params: Promise.resolve({ path }) });

function request(method: string, url: string, headers: Record<string, string> = {}, init: { body?: string; signal?: AbortSignal } = {}) {
  return new NextRequest(`${APP}${url}`, {
    method,
    headers: { cookie: 'cassette_session=session-123; other=x', ...headers },
    ...init,
  });
}

for (const method of UNSAFE_METHODS) {
  void test(`a ${method} from another origin, or with no origin at all, is refused before forwarding under every path spelling`, async () => {
    const refused: Array<Record<string, string>> = [
      { origin: 'https://evil.example' },
      { referer: 'https://evil.example/profile/night-curator' },
      { origin: 'null' },
      { referer: 'not a url' },
      {},
    ];
    for (const target of WRITE_TARGETS) {
      for (const headers of refused) {
        const response = await handlers[method](request(method, target.url, headers), context(target.path));
        assert.equal(response.status, 403, `${target.url} ${JSON.stringify(headers)}`);
      }
    }
    assert.deepEqual(forwarded, []);
  });

  void test(`a same-origin ${method} forwards its method, body, and session, and returns only Bridge's allowed headers`, async () => {
    const body = JSON.stringify({ note: `${method} body` });
    const response = await handlers[method](
      request(method, '/api/v1/social/posts?draft=1', { origin: APP, 'content-type': 'application/json' }, { body }),
      context(['social', 'posts']),
    );

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), STATE);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(response.headers.get('vary'), 'Authorization, Cookie');
    assert.equal(response.headers.get('set-cookie'), null);

    assert.equal(forwarded.length, 1);
    const [{ url, init }] = forwarded;
    assert.equal(url, `${BRIDGE}/api/v1/social/posts?draft=1`);
    assert.equal(init.method, method);
    assert.equal(await new Response(init.body).text(), body);
    assert.equal(init.cache, 'no-store');
    const headers = new Headers(init.headers);
    assert.equal(headers.get('content-type'), 'application/json');
    assert.equal(headers.get('X-Cassette-Web-Session'), 'session-123');
    assert.equal(headers.get('X-Cassette-Web-Internal'), 'cassette-ui');
    assert.equal(headers.get('cookie'), null);
  });
}

void test('a same-origin referer lets a Follow or Unfollow through under any path spelling, to the path it decoded to', async () => {
  for (const alias of FOLLOW_ALIASES) {
    for (const method of ['PUT', 'DELETE'] as const) {
      forwarded = [];
      const response = await handlers[method](request(method, alias.url, { referer: `${APP}/profile/night-curator?tab=posts` }), context(alias.path));

      assert.equal(response.status, 200, `${method} ${alias.url}`);
      assert.equal(forwarded.length, 1);
      assert.equal(forwarded[0].url, `${BRIDGE}/api/v1/${alias.path.join('/')}`);
      assert.equal(forwarded[0].init.method, method);
    }
  }
});

void test('reads and preflights need no origin', async () => {
  const origins: Array<Record<string, string>> = [{}, { origin: 'https://evil.example' }];
  // Next answers HEAD with the GET handler when a route defines no HEAD.
  for (const [method, handler] of [['GET', proxyRoute.GET], ['HEAD', proxyRoute.GET], ['OPTIONS', proxyRoute.OPTIONS]] as const) {
    for (const headers of origins) {
      forwarded = [];
      const response = await handler(request(method, '/api/v1/curators/night-curator/page?tab=posts', headers), context(['curators', 'night-curator', 'page']));

      assert.equal(response.status, 200, method);
      assert.equal(forwarded.length, 1);
      assert.equal(forwarded[0].url, `${BRIDGE}/api/v1/curators/night-curator/page?tab=posts`);
      assert.equal(forwarded[0].init.method, method);
      assert.equal(forwarded[0].init.body, undefined);
      assert.equal(new Headers(forwarded[0].init.headers).get('X-Cassette-Web-Session'), 'session-123');
    }
  }
});

void test('auth paths never reach Bridge through the generic proxy', async () => {
  assert.equal((await proxyRoute.POST(request('POST', '/api/v1/auth/signin', { origin: 'https://evil.example' }), context(['auth', 'signin']))).status, 403);
  assert.equal((await proxyRoute.POST(request('POST', '/api/v1/auth/signin', { origin: APP }), context(['auth', 'signin']))).status, 404);
  assert.equal((await proxyRoute.GET(request('GET', '/api/v1/auth/session'), context(['auth', 'session']))).status, 404);
  assert.deepEqual(forwarded, []);
});

void test('the Playwright guard answers after the origin check and forwards nothing', async () => {
  process.env.PLAYWRIGHT_TEST = 'true';
  const [alias] = FOLLOW_ALIASES;

  assert.equal((await proxyRoute.PUT(request('PUT', alias.url, { origin: 'https://evil.example' }), context(alias.path))).status, 403);
  assert.equal((await proxyRoute.PUT(request('PUT', alias.url, { origin: APP }), context(alias.path))).status, 503);
  assert.equal((await proxyRoute.GET(request('GET', alias.url), context(alias.path))).status, 503);
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

  const pending = proxyRoute.POST(request('POST', '/api/v1/social/posts', { origin: APP }, { signal: caller.signal }), context(['social', 'posts']));
  await new Promise((resolve) => setImmediate(resolve));
  caller.abort();

  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(forwardedSignal?.aborted, true);
});

void test('the checked writes are every method the route exports except the reads', () => {
  assert.deepEqual(Object.keys(proxyRoute).sort(), ['DELETE', 'GET', 'OPTIONS', 'PATCH', 'POST', 'PUT']);
  assert.deepEqual([...UNSAFE_METHODS].sort(), ['DELETE', 'PATCH', 'POST', 'PUT']);
});
