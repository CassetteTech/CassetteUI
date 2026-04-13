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
});
