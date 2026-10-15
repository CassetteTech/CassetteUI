import assert from 'node:assert/strict';
import test from 'node:test';
import type { ActivityPost, PaginatedActivityResponse, PostPrivacy } from '../../types';
import { patchMusicPages, uniquePosts } from '../studio-music-pages';

const post = (postId: string, privacy: PostPrivacy = 'public'): ActivityPost => ({
  postId,
  privacy,
  elementType: 'Track',
  title: postId,
  username: 'miagroove',
  userId: 'user-member',
  createdAt: '2026-10-01T00:00:00Z',
});

const page = (number: number, items: ActivityPost[], totalItems: number, hasNext: boolean): PaginatedActivityResponse => ({
  items,
  page: number,
  totalItems,
  totalPages: 2,
  hasNext,
  hasPrevious: number > 1,
  nextCursor: hasNext ? `cursor-${number}` : null,
});

const ids = (pages: readonly PaginatedActivityResponse[]) => pages.map((each) => each.items.map((item) => item.postId));

void test('a deleted post leaves every page, and the total drops once even when the post repeats', () => {
  const data = { pages: [page(1, [post('a'), post('b')], 3, true), page(2, [post('b'), post('c')], 3, false)] };

  const patched = patchMusicPages(data, 'b', null, 'all');

  assert.deepEqual(ids(patched.pages), [['a'], ['c']]);
  assert.deepEqual(patched.pages.map((each) => each.totalItems), [2, 2]);
});

void test('a new setting keeps the post in an unfiltered list and drops it from a list it no longer fits', () => {
  const data = { pages: [page(1, [post('a'), post('b')], 2, false)] };

  const everything = patchMusicPages(data, 'a', { privacy: 'private' }, 'all');
  const publicOnly = patchMusicPages(data, 'a', { privacy: 'private' }, 'public');
  const privateOnly = patchMusicPages(data, 'a', { privacy: 'private' }, 'private');

  assert.equal(everything.pages[0].items[0].privacy, 'private');
  assert.equal(everything.pages[0].totalItems, 2);
  assert.deepEqual(ids(publicOnly.pages), [['b']]);
  assert.equal(publicOnly.pages[0].totalItems, 1);
  assert.deepEqual(ids(privateOnly.pages), [['a', 'b']]);
});

void test('a change to a post the list does not hold leaves it as it was', () => {
  const data = { pages: [page(1, [post('a')], 1, false)] };

  assert.deepEqual(patchMusicPages(data, 'missing', null, 'all').pages, data.pages);
});

void test('posts repeated across pages are listed once, in page order', () => {
  assert.deepEqual(
    uniquePosts([page(1, [post('a'), post('b')], 3, true), page(2, [post('b'), post('c')], 3, false)]).map((each) => each.postId),
    ['a', 'b', 'c'],
  );
});
