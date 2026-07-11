import { expect, test } from '@playwright/test';

import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('renders a terminal neutral state for a missing MusicLink', async ({ page }) => {
  await mockCassetteApp(page);

  await page.goto('/post/post-that-does-not-exist');

  await expect(page.getByRole('heading', { name: 'MusicLink unavailable' })).toBeVisible();
  await expect(page.getByText(/removed, made private, or you may not have access/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
});

test('does not disclose whether an inaccessible private MusicLink exists', async ({ page }) => {
  const privatePost: FixturePost = {
    ...fixturePosts.publicTrack,
    postId: 'post-private-track',
    privacy: 'private',
  };

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    posts: [privatePost],
  });

  await page.goto('/post/post-private-track');

  await expect(page.getByRole('heading', { name: 'MusicLink unavailable' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sign in' })).toHaveCount(0);
});

test('marks a failed Spotify track preview unavailable instead of leaving a dead control', async ({ page }) => {
  const spotifyPlaylist: FixturePost = {
    ...fixturePosts.playlistSource,
    postId: 'post-spotify-preview-missing',
    originalUrl: 'https://open.spotify.com/playlist/spotify-preview-missing',
    convertedUrls: {
      spotify: 'https://open.spotify.com/playlist/spotify-preview-missing',
    },
    tracks: [
      {
        title: 'Silent Sample',
        trackNumber: 1,
        artists: ['Crate Keeper'],
      },
    ],
  };

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [spotifyPlaylist],
  });

  await page.goto('/post/post-spotify-preview-missing');
  await page.getByRole('button', { name: 'Play preview' }).click();

  const unavailable = page.getByRole('button', { name: 'Preview unavailable for Silent Sample' });
  await expect(unavailable).toBeVisible();
  await expect(unavailable).toBeDisabled();
});
