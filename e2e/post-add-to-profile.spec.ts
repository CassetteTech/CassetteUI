import { expect, test } from '@playwright/test';
import {
  fixturePosts,
  fixtureUsers,
  type FixturePost,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const ownerlessCatalogTrack: FixturePost = {
  ...fixturePosts.publicTrack,
  postId: 'post-catalog-track',
  musicElementId: 'track-catalog-1',
  title: 'After Hours Signal',
  artist: 'Circuit Bloom',
  description: 'A catalog track without an owning profile post.',
  ownerId: undefined,
  ownerUsername: undefined,
  originalUrl: 'https://open.spotify.com/track/catalog-track-1',
  convertedUrls: {
    spotify: 'https://open.spotify.com/track/catalog-track-1',
    appleMusic: 'https://music.apple.com/us/song/after-hours-signal/606060',
  },
};

test('lets an authenticated user add an ownerless post to their profile', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [ownerlessCatalogTrack],
  });

  await page.goto('/post/post-catalog-track');
  await page.getByTestId('post-add-to-profile').click();
  await expect(page.getByTestId('post-add-to-profile')).toContainText('Added to Profile');

  await page.goto('/profile/miagroove?tab=tracks');
  await expect(page.getByRole('main').last()).toContainText('After Hours Signal');
  await expect(page.getByRole('main').last()).toContainText(
    'A catalog track without an owning profile post.',
  );
});

test('hides the add-to-profile cta on posts the current user already owns', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.owner,
    posts: [fixturePosts.ownerTrack],
  });

  await page.goto('/post/post-owner-track');
  await expect(page.getByTestId('post-add-to-profile')).toHaveCount(0);
});
