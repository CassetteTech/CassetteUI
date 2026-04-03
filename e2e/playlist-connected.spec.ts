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
