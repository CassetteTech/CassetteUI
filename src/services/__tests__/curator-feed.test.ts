/** Covers the Feed page contract through the real profile service: the strict post and locked union and both counts. */

import './browser-service-environment';
import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { profileService } from '../profile';

const post = (postId: string, privacy: 'public' | 'subscriber') => ({
  postId,
  redirectPostId: postId,
  elementType: 'Track',
  title: `Track ${postId}`,
  imageUrl: `https://images.example/${postId}.jpg`,
  username: 'night-curator',
  userId: 'user-night',
  createdAt: '2026-10-01T12:00:00Z',
  privacy,
});

const locked = (postId: string) => ({
  kind: 'locked',
  postId,
  createdAt: '2026-10-01T11:00:00Z',
  curator: { id: 'cpr_Night01', username: 'night-curator', displayName: null, avatarUrl: null },
});

/** A Feed page as Bridge may send it; a count may be left out or invalid on purpose. */
type FeedBody = { items: object[]; nextCursor: string; activeMembershipCount?: number; feedCuratorCount?: number };
type Counts = Pick<FeedBody, 'activeMembershipCount' | 'feedCuratorCount'>;

const page = (items: object[], counts: Counts = { activeMembershipCount: 1, feedCuratorCount: 2 }): FeedBody => ({
  items,
  nextCursor: 'cursor-2',
  ...counts,
});

function answerWith(t: TestContext, body: FeedBody) {
  const urls: string[] = [];
  t.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
    urls.push(input instanceof Request ? input.url : input.toString());
    return new Response(JSON.stringify(body), { status: 200 });
  });
  return urls;
}

void test('mixed full and locked rows keep the server order and both counts', async (t) => {
  answerWith(t, page([
    { kind: 'post', post: post('p1', 'subscriber') },
    locked('p2'),
    { kind: 'post', post: post('p3', 'public') },
  ]));

  const result = await profileService.fetchCuratorFeed();

  assert.deepEqual(result.items.map((item) => [item.kind, item.kind === 'post' ? item.post.postId : item.postId]), [
    ['post', 'p1'],
    ['locked', 'p2'],
    ['post', 'p3'],
  ]);
  const full = result.items[0];
  assert.ok(full.kind === 'post');
  assert.equal(full.post.title, 'Track p1');
  assert.equal(full.post.privacy, 'subscriber');
  assert.deepEqual(result.items[1], locked('p2'));
  assert.equal(result.nextCursor, 'cursor-2');
  assert.equal(result.activeMembershipCount, 1);
  assert.equal(result.feedCuratorCount, 2);
});

void test('a locked row with any extra field, even a null one, rejects the page', async (t) => {
  const extras: Array<[string, unknown]> = [
    ['title', 'Secret track'],
    ['imageUrl', null],
    ['musicElementId', 't_secret'],
    ['description', null],
    ['likeCount', 0],
    ['post', null],
  ];
  for (const [key, value] of extras) {
    t.mock.restoreAll();
    answerWith(t, page([{ ...locked('p2'), [key]: value }]));
    await assert.rejects(profileService.fetchCuratorFeed(), /Failed to load the Feed/, key);
  }
  for (const [key, value] of [['bio', 'About me'], ['profileLinks', null], ['planId', null]] as const) {
    t.mock.restoreAll();
    const row = locked('p2');
    answerWith(t, page([{ ...row, curator: { ...row.curator, [key]: value } }]));
    await assert.rejects(profileService.fetchCuratorFeed(), /Failed to load the Feed/, `curator.${key}`);
  }
});

void test('a locked row needs every identity field and a real time', async (t) => {
  const row = locked('p2');
  const { displayName: _name, ...withoutDisplayName } = row.curator;
  for (const bad of [
    { ...row, curator: withoutDisplayName },
    { ...row, curator: { ...row.curator, id: '' } },
    { ...row, createdAt: 'yesterday' },
    { ...row, postId: '' },
    { ...row, kind: 'teaser' },
  ]) {
    t.mock.restoreAll();
    answerWith(t, page([bad]));
    await assert.rejects(profileService.fetchCuratorFeed(), /Failed to load the Feed/, JSON.stringify(bad));
  }
});

void test('a full row is exactly a kind and a post', async (t) => {
  for (const bad of [
    { kind: 'post', post: post('p1', 'public'), locked: false },
    { kind: 'post', post: null },
    post('p1', 'public'),
  ]) {
    t.mock.restoreAll();
    answerWith(t, page([bad]));
    await assert.rejects(profileService.fetchCuratorFeed(), /Failed to load the Feed/, JSON.stringify(bad));
  }
});

void test('each count is required and checked on its own; counts that disagree are kept', async (t) => {
  const invalid: Counts[] = [
    { activeMembershipCount: 1 },
    { feedCuratorCount: 1 },
    { activeMembershipCount: 1, feedCuratorCount: -1 },
    { activeMembershipCount: 0.5, feedCuratorCount: 1 },
  ];
  for (const counts of invalid) {
    t.mock.restoreAll();
    answerWith(t, page([], counts));
    await assert.rejects(profileService.fetchCuratorFeed(), /Failed to load the Feed/, JSON.stringify(counts));
  }

  t.mock.restoreAll();
  answerWith(t, page([], { activeMembershipCount: 1, feedCuratorCount: 0 }));
  const result = await profileService.fetchCuratorFeed();
  assert.deepEqual([result.activeMembershipCount, result.feedCuratorCount], [1, 0]);
});

void test('the request names the cursor, page size, and filter only', async (t) => {
  const urls = answerWith(t, page([]));
  await profileService.fetchCuratorFeed({ cursor: 'cursor-2', membersOnly: true });
  const url = new URL(urls[0], 'https://cassette.test');
  assert.equal(url.pathname, '/api/v1/social/feed/posts');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['cursor', 'membersOnly', 'pageSize']);
});
