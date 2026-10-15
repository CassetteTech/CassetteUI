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
const appleOriginalUrl = 'https://music.apple.com/us/playlist/late-drives/pl.u-apple-original';
const applePlaylist: FixturePost = {
  ...fixturePosts.playlistSource,
  postId: 'post-apple-original',
  originalUrl: appleOriginalUrl,
  convertedUrls: { appleMusic: appleOriginalUrl },
};

test('opens a playlist on the service it came from and offers copies only elsewhere', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [spotifyPlaylist] });

  await page.goto('/post/post-spotify-original');

  const original = page.getByRole('link', { name: /Spotify.*Original playlist/ });
  await expect(original).toHaveAttribute('href', originalUrl);
  await expect(page.getByTestId('playlist-copy-spotify')).toHaveCount(0);
  await expect(page.getByTestId('cassette-spotify-copy')).toHaveCount(0);

  const copies = page.getByRole('region', { name: 'Not on your service?' });
  await expect(copies).toContainText('Cassette builds a copy in your account.');
  await expect(copies.getByRole('button', { name: 'Make a copy on Apple Music' })).toBeVisible();
  await expect(copies.getByRole('button', { name: 'Make a copy on Deezer' })).toBeVisible();
  await expect(page.getByRole('link', { name: /^From/ })).toHaveCount(0);
});

test("makes Cassette's Spotify copy on a signed-out fan's first tap and then opens it", async ({ page }) => {
  await mockCassetteApp(page, { posts: [applePlaylist] });
  const creations: Array<{ TargetPlatform?: string }> = [];
  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    creations.push(route.request().postDataJSON() as { TargetPlatform?: string });
    await route.fallback();
  });

  await page.goto('/post/post-apple-original');

  // Spotify is a listen row, not a copy button: the copy block offers only Deezer.
  const copies = page.getByRole('region', { name: 'Not on your service?' });
  await expect(copies.getByRole('button')).toHaveCount(1);
  await expect(copies.getByRole('button', { name: 'Make a copy on Deezer' })).toBeVisible();

  await page.getByRole('button', { name: /Spotify.*Copy made by Cassette/ }).focus();
  await page.keyboard.press('Enter');

  // Focus moves to the link that replaces the button, so Enter opens the copy next.
  const copy = page.getByRole('link', { name: /Spotify.*Ready to open/ });
  await expect(copy).toHaveAttribute('href', 'https://open.spotify.com/playlist/test-playlist-505050');
  await expect(copy).toBeFocused();
  await expect(page.getByText('Create an account to continue')).toHaveCount(0);
  expect(creations).toEqual([expect.objectContaining({ TargetPlatform: 'spotify' })]);
});

test("opens Cassette's stored Spotify copy with one tap and makes no new one", async ({ page }) => {
  const storedCopy = 'https://open.spotify.com/playlist/cassette-stored-copy';
  await mockCassetteApp(page, { posts: [{ ...applePlaylist, cassetteSpotifyCopyUrl: storedCopy }] });
  let creationRequests = 0;
  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    creationRequests += 1;
    await route.fallback();
  });

  await page.goto('/post/post-apple-original');

  await expect(page.getByRole('link', { name: /Spotify.*Copy made by Cassette/ })).toHaveAttribute('href', storedCopy);
  await expect(page.getByTestId('cassette-spotify-copy')).toHaveCount(0);
  expect(creationRequests).toBe(0);
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
