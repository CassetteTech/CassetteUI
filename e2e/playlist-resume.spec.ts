import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('resumes playlist conversion after auth and finishes on the original post', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.member,
    posts: [fixturePosts.playlistSource],
  });

  await page.goto('/post/post-source-playlist');
  await page.getByTestId('playlist-convert-spotify').click();

  await expect(page.getByText('Create an account to continue')).toBeVisible();
  await page.getByTestId('auth-prompt-signup').click();
  await expect(page).toHaveURL('/auth/signup');
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .not.toBeNull();

  state.currentUser = fixtureUsers.member;
  await page.goto('/post/post-source-playlist');
  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added', {
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: /Open in Spotify/ })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
});
