import { afterEach, beforeEach } from 'node:test';
import { NextRequest } from 'next/server';

export const APP = 'http://localhost:3000';
export const STATE = { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false };

export type Forwarded = { url: string; init: RequestInit };

export function recordForwardedBridgeRequests(): Forwarded[] {
  const forwarded: Forwarded[] = [];
  const previousFetch = globalThis.fetch;

  beforeEach(() => {
    forwarded.length = 0;
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

  return forwarded;
}

export function appRequest(
  method: string,
  path: string,
  headers: Record<string, string> = {},
  init: { body?: string; signal?: AbortSignal } = {},
) {
  return new NextRequest(`${APP}${path}`, {
    method,
    headers: { cookie: 'cassette_session=session-123; other=x', ...headers },
    ...init,
  });
}
