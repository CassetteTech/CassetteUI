import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('creates a playlist directly for users who already connected Spotify', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.playlistSource],
    musicConnectionsByUserId: {
      [fixtureUsers.member.id]: ['Spotify'],
    },
  });

  await page.goto('/post/post-source-playlist');
  await page.getByTestId('playlist-convert-spotify').click();

  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added');
  await expect(page.getByRole('button', { name: /Open in Spotify/ })).toBeVisible();
  await expect(page.getByText('Create an account to continue')).toHaveCount(0);
});

test('reconnects Spotify and resumes playlist creation when stored credentials expire', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.playlistSource],
    musicConnectionsByUserId: {
      [fixtureUsers.member.id]: ['Spotify'],
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
          error: 'Your Spotify connection has expired. Please reconnect to continue.',
          requires_reauth: true,
          error_code: 'AUTH_EXPIRED',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/post/post-source-playlist');
  await page.getByTestId('playlist-convert-spotify').click();

  await expect(page.locator('main')).toContainText('Playlist created! 3/3 tracks added', {
    timeout: 10_000,
  });
  await expect(page.getByRole('button', { name: /Open in Spotify/ })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
  expect(creationAttempts).toBe(2);
});

test('shows a retry action when Spotify authorization is denied', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.playlistSource],
  });
  await page.goto('/post/post-source-playlist');
  await page.evaluate(() => {
    sessionStorage.setItem(
      'cassette_platform_return_url_spotify',
      '/post/post-source-playlist',
    );
    sessionStorage.setItem('cassette_pending_action', JSON.stringify({
      type: 'create_playlist',
      platform: 'spotify',
      playlistId: 'playlist-source',
      returnUrl: '/post/post-source-playlist',
      timestamp: Date.now(),
    }));
  });

  await page.goto('/spotify_callback?error=access_denied');

  await expect(page).toHaveURL('/post/post-source-playlist');
  await expect(page.locator('main')).toContainText(
    'Spotify connection was canceled. Try again to create this playlist.',
  );
  await expect(page.getByRole('button', { name: 'Try Spotify again' })).toBeVisible();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_platform_return_url_spotify')))
    .toBeNull();
});
