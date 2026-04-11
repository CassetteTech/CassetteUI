import { expect, test } from '@playwright/test';
import { type FixturePost, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const buildOwnedPost = (
  overrides: Partial<FixturePost> & Pick<FixturePost, 'postId' | 'musicElementId' | 'elementType' | 'title' | 'originalUrl'>,
): FixturePost => {
  const {
    postId,
    musicElementId,
    elementType,
    title,
    originalUrl,
    artist,
    description,
    convertedUrls,
    ...restOverrides
  } = overrides;

  return {
    postId,
    musicElementId,
    elementType,
    title,
    artist: artist || 'Mia Groove',
    description: description || '',
    ownerId: fixtureUsers.member.id,
    ownerUsername: fixtureUsers.member.username,
    privacy: 'public',
    likeCount: 0,
    likedByCurrentUser: false,
    repostedByCurrentUser: false,
    commentsEnabled: true,
    conversionSuccessCount: 0,
    originalUrl,
    convertedUrls: convertedUrls || {
      spotify: originalUrl,
    },
    ...restOverrides,
  };
};

test.describe('profile tabs', () => {
  test('keeps the selected profile tab in the url', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-playlist-post',
          musicElementId: 'playlist-member-1',
          elementType: 'Playlist',
          title: 'Night Tape',
          artist: 'Mia Groove',
          originalUrl: 'https://open.spotify.com/playlist/member-playlist-1',
        }),
        buildOwnedPost({
          postId: 'member-track-post',
          musicElementId: 'track-member-1',
          elementType: 'Track',
          title: 'Signal Fade',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/track/member-track-1',
        }),
        buildOwnedPost({
          postId: 'member-album-post',
          musicElementId: 'album-member-1',
          elementType: 'Album',
          title: 'Night Engine',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/album/member-album-1',
        }),
        buildOwnedPost({
          postId: 'member-artist-post',
          musicElementId: 'artist-member-1',
          elementType: 'Artist',
          title: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/artist/member-artist-1',
        }),
      ],
    });

    await page.goto('/profile/miagroove');
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=playlists$/);

    await page.getByRole('button', { name: 'Tracks' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=tracks$/);
    await expect(page.getByRole('main').last()).toContainText('Signal Fade');

    await page.getByRole('button', { name: 'Albums' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=albums$/);
    await expect(page.getByRole('main').last()).toContainText('Night Engine');

    await page.getByRole('button', { name: 'Artists' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=artists$/);
    await expect(page.getByRole('main').last()).toContainText('Circuit Bloom');

    await page.getByRole('button', { name: 'Playlists' }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=playlists$/);
    await expect(page.getByRole('main').last()).toContainText('Night Tape');

    await page.getByRole('button', { name: /Liked/ }).click();
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=liked$/);
    await expect(page.getByRole('main').last()).toContainText('No items to display');
  });

  test('auto-selects the first non-empty tab when playlists are empty', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      posts: [
        buildOwnedPost({
          postId: 'member-track-only-post',
          musicElementId: 'track-member-only-1',
          elementType: 'Track',
          title: 'Daybreak Signal',
          artist: 'Circuit Bloom',
          originalUrl: 'https://open.spotify.com/track/member-track-only-1',
        }),
      ],
    });

    await page.goto('/profile/miagroove');
    await expect(page).toHaveURL(/\/profile\/miagroove\?tab=tracks$/);
    await expect(page.getByRole('main').last()).toContainText('Daybreak Signal');
  });
});
