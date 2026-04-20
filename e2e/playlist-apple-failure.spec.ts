import { expect, test } from '@playwright/test';
import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('shows a generic error when Apple playlist creation fails after auth', async ({ page }) => {
  await page.addInitScript(() => {
    let isAuthorized = false;

    Object.defineProperty(window, 'MusicKit', {
      configurable: true,
      value: {
        configure: async () => undefined,
        getInstance: () => ({
          authorize: async () => {
            isAuthorized = true;
            return 'apple-user-token';
          },
          unauthorize: async () => {
            isAuthorized = false;
          },
          get isAuthorized() {
            return isAuthorized;
          },
        }),
      },
    });
  });

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.playlistSource],
    musicConnectionsByUserId: {
      [fixtureUsers.member.id]: ['Spotify'],
    },
  });

  await page.route('**/api/v1/convert/createPlaylist', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Failed to create playlist',
      }),
    });
  });

  await page.goto('/post/post-source-playlist');
  await page.getByTestId('playlist-convert-appleMusic').click();

  await expect(page.locator('main')).toContainText('Failed to create playlist');
  await expect(page.getByRole('button', { name: /Reconnect Apple Music|Connect Apple Music/ })).toHaveCount(0);
  await expect
    .poll(async () => page.evaluate(() => sessionStorage.getItem('cassette_pending_action')))
    .toBeNull();
});
