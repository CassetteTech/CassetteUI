import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test.describe('post engagement', () => {
  test('prompts anonymous users to sign in before liking', async ({ page }) => {
    await mockCassetteApp(page, {
      posts: [fixturePosts.publicTrack],
    });

    await page.goto('/post/post-public-track');
    await page.getByRole('button', { name: 'Like post' }).click();

    await expect(page.getByRole('heading', { name: 'Sign in to like posts' })).toBeVisible();
    await expect(page.getByTestId('auth-prompt-signup')).toBeVisible();
  });

  test('lets an authenticated viewer like and unlike, then repost and remove the repost', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      posts: [fixturePosts.publicTrack],
    });

    await page.goto('/post/post-public-track');

    const likeButton = page.getByRole('button', { name: 'Like post' });
    await likeButton.click();
    await expect(page.getByRole('button', { name: 'Unlike post' })).toContainText('13');
    await page.getByRole('button', { name: 'Unlike post' }).click();
    await expect(page.getByRole('button', { name: 'Like post' })).toContainText('12');

    const repostButton = page.getByRole('button', { name: 'Repost post' });
    await repostButton.click();
    await expect(page.getByRole('button', { name: 'Remove repost' })).toBeVisible();
    await page.getByRole('button', { name: 'Remove repost' }).click();
    await expect(page.getByRole('button', { name: 'Repost post' })).toBeVisible();
  });

  test('does not poll the full notifications list on idle post pages and updates the badge after marking all read', async ({ page }) => {
    const fullListRequests: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (
        request.method() === 'GET' &&
        url.pathname === '/api/v1/notifications' &&
        url.searchParams.get('page') === '1' &&
        url.searchParams.get('pageSize') === '20'
      ) {
        fullListRequests.push(request.url());
      }
    });

    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      posts: [fixturePosts.publicTrack],
      notifications: [
        {
          id: 'notification-comment',
          type: 'comment',
          isRead: false,
          createdAt: '2026-04-03T15:05:00.000Z',
          actor: {
            userId: fixtureUsers.creator.id,
            username: fixtureUsers.creator.username,
            displayName: fixtureUsers.creator.displayName,
          },
          postId: fixturePosts.publicTrack.postId,
          targetUrl: `/post/${fixturePosts.publicTrack.postId}#comment-c_1`,
        },
        {
          id: 'notification-like',
          type: 'like',
          isRead: false,
          createdAt: '2026-04-03T15:04:00.000Z',
          actor: {
            userId: fixtureUsers.member.id,
            username: fixtureUsers.member.username,
            displayName: fixtureUsers.member.displayName,
          },
          postId: fixturePosts.publicTrack.postId,
          targetUrl: `/post/${fixturePosts.publicTrack.postId}`,
        },
      ],
    });

    await page.goto('/post/post-public-track');

    const notificationButton = page.locator('button[aria-label="Notifications"]');
    await expect(notificationButton).toContainText('2');

    await page.waitForTimeout(6200);
    expect(fullListRequests).toHaveLength(0);

    await notificationButton.click();
    await expect(page.getByText('DJ Aurora commented on your post')).toBeVisible();
    await expect.poll(() => fullListRequests.length).toBe(1);

    const markAllReadButton = page.getByRole('button', { name: 'Mark all read' });
    await markAllReadButton.click();

    await expect(markAllReadButton).toBeDisabled();
    await expect(notificationButton).not.toContainText('2');
  });
});
