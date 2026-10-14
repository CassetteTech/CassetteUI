import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const originalUrl = 'https://open.spotify.com/playlist/spotify-original-1';
const spotifyPlaylist: FixturePost = {
  ...fixturePosts.playlistSource,
  postId: 'post-spotify-original',
  originalUrl,
  convertedUrls: { spotify: originalUrl },
};

test('opens a playlist on the service it came from and offers copies only elsewhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [spotifyPlaylist] });

  await page.goto('/post/post-spotify-original');

  const original = page.getByRole('link', { name: /Spotify.*Original playlist/ });
  await expect(original).toHaveAttribute('href', originalUrl);
  await expect(page.getByTestId('playlist-copy-spotify')).toHaveCount(0);

  const copies = page.getByRole('region', { name: 'Not on your service?' });
  await expect(copies.getByRole('button', { name: 'Make a copy on Apple Music' })).toHaveAccessibleDescription('In your library');
  await expect(copies.getByRole('button', { name: 'Make a copy on Deezer' })).toHaveAccessibleDescription('In your account');
  await expect(page.getByRole('link', { name: /^From/ })).toHaveCount(0);
});

test('drops a pending copy for the service that now opens the original', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [spotifyPlaylist] });
  let creationRequests = 0;
  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    creationRequests += 1;
    await route.fallback();
  });

  await page.goto('/post/post-spotify-original');
  await page.evaluate(() => {
    sessionStorage.setItem('cassette_pending_action', JSON.stringify({
      type: 'create_playlist',
      platform: 'spotify',
      playlistId: 'playlist-source-1',
      returnUrl: '/post/post-spotify-original',
      timestamp: Date.now(),
    }));
  });
  await page.reload();

  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
  await expect(page.locator('main')).not.toContainText('Making a copy');
  expect(creationRequests).toBe(0);
});
