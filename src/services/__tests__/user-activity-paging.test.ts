import './browser-service-environment';
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { profileService } from '../profile';

type ActivityBody = { items: unknown[]; page: number; pageSize: number; totalItems: number; nextCursor?: string };

function answerWith(t: TestContext, body: ActivityBody) {
  const urls: URL[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    urls.push(new URL(input instanceof Request ? input.url : input.toString(), 'https://cassette.test'));
    return new Response(JSON.stringify(body), { status: 200 });
  });
  return urls;
}

void test('a cursor read sends the cursor instead of a page and keeps the next cursor', async (t) => {
  const urls = answerWith(t, { items: [], page: 1, pageSize: 20, totalItems: 25, nextCursor: 'cursor-3' });

  const result = await profileService.fetchUserActivity('user-1', { cursor: 'cursor-2', pageSize: 20, privacy: 'public' });

  assert.deepEqual(Object.fromEntries(urls[0].searchParams), { cursor: 'cursor-2', pageSize: '20', privacy: 'public' });
  assert.equal(result.nextCursor, 'cursor-3');
});

void test('a first read sends page 1, and a last page has no next cursor', async (t) => {
  const urls = answerWith(t, { items: [], page: 1, pageSize: 20, totalItems: 0 });

  const result = await profileService.fetchUserActivity('user-1', { pageSize: 20 });

  assert.deepEqual(Object.fromEntries(urls[0].searchParams), { page: '1', pageSize: '20' });
  assert.equal(result.nextCursor, null);
});
