import { expect, test } from '@playwright/test';
import { fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const memberWithPrivateLikes = {
  ...fixtureUsers.member,
  likedPostsPrivacy: 'private' as const,
};

test('keeps the liked tab available to the profile owner even when it is private', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: memberWithPrivateLikes,
  });

  await page.goto('/profile/miagroove?tab=liked');
  await expect(page).toHaveURL(/\/profile\/miagroove\?tab=liked$/);
  await expect(page.getByRole('button', { name: /Liked/ })).toBeVisible();
});

test('hides the liked tab from other viewers when the profile owner marks it private', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    users: [memberWithPrivateLikes],
  });

  await page.goto('/profile/miagroove?tab=liked');
  await expect(page).toHaveURL(/\/profile\/miagroove\?tab=playlists$/);
  await expect(page.getByRole('button', { name: /Liked/ })).toHaveCount(0);
});
