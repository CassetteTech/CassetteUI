import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const spotifyPlaylist: FixturePost = {
  ...fixturePosts.playlistSource,
  postId: 'post-spotify-playlist',
  originalUrl: 'https://open.spotify.com/playlist/spotify-playlist-1',
  convertedUrls: { spotify: 'https://open.spotify.com/playlist/spotify-playlist-1' },
};

test('resumes playlist conversion after auth and finishes on the original post', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.member,
    posts: [spotifyPlaylist],
  });

  await page.goto('/post/post-spotify-playlist');
  await page.getByTestId('playlist-copy-deezer').click();

  await expect(page.getByText('Create an account to continue')).toBeVisible();
  await page.getByTestId('auth-prompt-signup').click();
  await expect(page).toHaveURL('/auth/signup');
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .not.toBeNull();

  state.currentUser = fixtureUsers.member;
  await page.goto('/post/post-spotify-playlist');
  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added', {
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: /Open the copy on Deezer/ })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
});
