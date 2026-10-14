import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

// Deezer copies go to the fan's own Deezer account, so they need a connection.
const spotifyPlaylist: FixturePost = {
  ...fixturePosts.playlistSource,
  postId: 'post-spotify-playlist',
  originalUrl: 'https://open.spotify.com/playlist/spotify-playlist-1',
  convertedUrls: { spotify: 'https://open.spotify.com/playlist/spotify-playlist-1' },
};

test('creates a playlist directly for users who already connected Deezer', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [spotifyPlaylist],
    musicConnectionsByUserId: {
      [fixtureUsers.member.id]: ['Deezer'],
    },
  });

  await page.goto('/post/post-spotify-playlist');
  await page.getByTestId('playlist-copy-deezer').click();

  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added');
  await expect(page.getByRole('button', { name: /Open the copy on Deezer/ })).toBeVisible();
  await expect(page.getByText('Create an account to continue')).toHaveCount(0);
});

test('reconnects Deezer and resumes playlist creation when stored credentials expire', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [spotifyPlaylist],
    musicConnectionsByUserId: {
      [fixtureUsers.member.id]: ['Deezer'],
    },
  });

  let creationAttempts = 0;
  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    creationAttempts += 1;
    if (creationAttempts === 1) {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Your Deezer connection has expired. Please reconnect to continue.',
          requires_reauth: true,
          error_code: 'AUTH_EXPIRED',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/post/post-spotify-playlist');
  await page.getByTestId('playlist-copy-deezer').click();

  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added', {
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: /Open the copy on Deezer/ })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
  expect(creationAttempts).toBe(2);
});

test('shows a retry action when Deezer authorization is denied', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [spotifyPlaylist],
  });
  await page.goto('/post/post-spotify-playlist');
  await page.evaluate(() => {
    sessionStorage.setItem(
      'cassette_platform_return_url_deezer',
      '/post/post-spotify-playlist',
    );
    sessionStorage.setItem('cassette_pending_action', JSON.stringify({
      type: 'create_playlist',
      platform: 'deezer',
      playlistId: 'playlist-source',
      returnUrl: '/post/post-spotify-playlist',
      timestamp: Date.now(),
    }));
  });

  await page.goto('/deezer_callback?error=access_denied');

  await expect(page).toHaveURL('/post/post-spotify-playlist');
  await expect(page.locator('main')).toContainText(
    'Deezer connection was canceled. Try again to create this playlist.',
  );
  await expect(page.getByRole('button', { name: 'Try Deezer again' })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_platform_return_url_deezer')))
    .toBeNull();
});
