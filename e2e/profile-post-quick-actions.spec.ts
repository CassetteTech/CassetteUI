/** Verifies a curator can right-click a post on their profile for quick actions. */

import { expect, test } from '@playwright/test';
import {
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixtureCuratorPage,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('locks a post for members from the curator feed right-click menu', async ({ page }) => {
  const curator = fixtureUsers.playlistCurator;
  const feedPost = fixtureCuratorPage.posts.items.find((item) => item.kind === 'post');
  if (!feedPost || feedPost.kind !== 'post') throw new Error('Curator page fixture has no public post');

  await mockCassetteApp(page, {
    currentUser: curator,
    posts: [{
      ...fixturePosts.ownerTrack,
      postId: feedPost.post.postId,
      title: feedPost.post.title,
      ownerId: curator.id,
      ownerUsername: curator.username,
    }],
    curatorPage: {
      ...fixtureCuratorPage,
      viewer: { isOwner: true, isMember: false, hasMemberBadge: false },
      posts: { ...fixtureCuratorPage.posts, items: [feedPost], totalItems: 1 },
    },
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto(`/profile/${curator.username}`);
  const feed = page.getByTestId('profile-music');
  await feed.getByRole('heading', { name: feedPost.post.title }).click({ button: 'right' });

  const menu = page.getByTestId('post-quick-actions');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Members only' }).click();

  await expect(page.getByText('Post locked for members.')).toBeVisible();
  await expect(feed.getByRole('link', { name: new RegExp(feedPost.post.title) }).getByText('Members only', { exact: true })).toBeVisible();
});

test('removes a deleted post from the curator feed', async ({ page }) => {
  const curator = fixtureUsers.playlistCurator;
  const feedPost = fixtureCuratorPage.posts.items.find((item) => item.kind === 'post');
  if (!feedPost || feedPost.kind !== 'post') throw new Error('Curator page fixture has no public post');

  await mockCassetteApp(page, {
    currentUser: curator,
    posts: [{
      ...fixturePosts.ownerTrack,
      postId: feedPost.post.postId,
      title: feedPost.post.title,
      ownerId: curator.id,
      ownerUsername: curator.username,
    }],
    curatorPage: {
      ...fixtureCuratorPage,
      viewer: { isOwner: true, isMember: false, hasMemberBadge: false },
      posts: { ...fixtureCuratorPage.posts, items: [feedPost], totalItems: 1 },
    },
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto(`/profile/${curator.username}`);
  const feed = page.getByTestId('profile-music');
  await feed.getByRole('heading', { name: feedPost.post.title }).click({ button: 'right' });
  await page.getByTestId('post-quick-actions').getByRole('menuitem', { name: 'Delete' }).click();
  await page.getByRole('button', { name: 'Delete Post' }).click();

  await expect(page.getByText('Post deleted successfully')).toBeVisible();
  // includeHidden: the closing sheet briefly hides the page from the accessibility tree.
  await expect(feed.getByRole('heading', { name: feedPost.post.title, includeHidden: true })).toHaveCount(0);
});

test('makes a post private from the profile music right-click menu, which takes it off the public page', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
    curatorProfile: fixtureActiveCuratorProfile,
    curatorPlans: [fixtureActiveMemberPostPlan],
  });

  await page.goto('/profile/recordsmith?tab=tracks');
  const card = page.getByRole('link', { name: /Paper Hearts/ }).first();
  await card.click({ button: 'right' });

  const menu = page.getByTestId('post-quick-actions');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: 'Private' }).click();

  await expect(page.getByText('Post visibility updated.')).toBeVisible();
  // The public page shows what visitors see; the owner keeps private posts in Studio Music.
  await expect(page.getByRole('link', { name: /Paper Hearts/ })).toHaveCount(0);
});
