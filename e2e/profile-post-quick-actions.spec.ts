
import { expect, test } from '@playwright/test';
import {
  fixtureActiveCuratorProfile,
  fixtureActiveMemberPostPlan,
  fixtureCuratorPage,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('offers the owner only Open post and Share on their curator page', async ({ page }) => {
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
  await expect(feed.getByRole('button', { name: 'More options' })).toHaveCount(0);
  await feed.getByRole('heading', { name: feedPost.post.title }).click({ button: 'right' });

  const menu = page.getByTestId('post-quick-actions');
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem')).toHaveText(['Open post', 'Share']);
  await page.keyboard.press('Escape');

  // The owner tools are one link away, in Studio.
  await expect(page.getByTestId('profile-preview-strip').getByRole('link', { name: 'Open Studio' }))
    .toHaveAttribute('href', '/studio/music');
});

test('offers the owner only Open post and Share on a plain profile', async ({ page }) => {
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
  await expect(menu.getByRole('menuitem')).toHaveText(['Open post', 'Share']);
});
