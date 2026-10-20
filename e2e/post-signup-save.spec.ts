/** Covers the signed-out conversion that survives sign-up: one save to the new account, back on the post, never repeated or carried to another post. */

import { expect, type Page, test } from '@playwright/test';
import { z } from 'zod';

import { fixturePosts, fixtureUsers, type FixturePost } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const AVATAR_FILE = {
  name: 'avatar.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
    'base64',
  ),
};

// A conversion made while signed out: Bridge gives it no owner.
const anonymousConversion: FixturePost = {
  ...fixturePosts.publicTrack,
  postId: 'post-anonymous-conversion',
  musicElementId: 'track-anonymous-1',
  title: 'First Light Signal',
  ownerId: undefined,
  ownerUsername: undefined,
};

const POST_PATH = `/post/${anonymousConversion.postId}`;
const PENDING_ACTION_KEY = 'cassette_pending_action';

const createPostBodySchema = z.object({ musicElementId: z.string() });

/** The music element of every add-to-profile write the page sends. */
function trackPostCreates(page: Page) {
  const musicElementIds: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/v1/social/posts' && request.method() === 'POST') {
      musicElementIds.push(createPostBodySchema.parse(request.postDataJSON()).musicElementId);
    }
  });
  return musicElementIds;
}

const pendingAction = (page: Page) => page.evaluate((key) => sessionStorage.getItem(key), PENDING_ACTION_KEY);

/** A new account from the sign-up page through the last onboarding step. */
async function signUpThroughOnboarding(page: Page) {
  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/onboarding');
  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-username').fill('firstsaver');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();
  await page.getByTestId('onboarding-avatar-file-input').setInputFiles(AVATAR_FILE);
  await page.getByTestId('avatar-crop-apply').click();
  await page.getByTestId('onboarding-avatar-next').click();
  await page.getByTestId('onboarding-finish-setup').click();
}

async function expectOneSave(page: Page, creates: string[]) {
  await expect(page).toHaveURL(POST_PATH);
  await expect(page.getByTestId('post-add-to-profile').filter({ visible: true })).toContainText('Added to Profile');
  expect(creates).toEqual([anonymousConversion.musicElementId]);
  expect(await pendingAction(page)).toBeNull();
}

test('saves a signed-out conversion to the new account after onboarding and returns to the post', async ({ page }) => {
  const creates = trackPostCreates(page);
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.newcomer, posts: [anonymousConversion] });

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent(POST_PATH)}`);

  await signUpThroughOnboarding(page);
  await expectOneSave(page, creates);

  // The intent was consumed: a reload saves nothing again.
  await page.reload();
  await expect(page.getByTestId('post-add-to-profile').filter({ visible: true })).toBeVisible();
  expect(creates).toHaveLength(1);
});

test('saves the conversion after sign-up from the header Sign Up button', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const creates = trackPostCreates(page);
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.newcomer, posts: [anonymousConversion] });

  await page.goto(POST_PATH);
  await expect(page.getByTestId('post-add-to-profile')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign Up', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent(POST_PATH)}`);

  await signUpThroughOnboarding(page);
  await expectOneSave(page, creates);
});

test('saves the conversion after sign-up from the phone menu', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const creates = trackPostCreates(page);
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.newcomer, posts: [anonymousConversion] });

  await page.goto(POST_PATH);
  await expect(page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Open menu' }).click();
  await page.locator('#mobile-menu-panel').getByRole('link', { name: 'Sign Up', exact: true }).click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent(POST_PATH)}`);

  await signUpThroughOnboarding(page);
  await expectOneSave(page, creates);
});

test('records no save from the header Sign Up button on an owned post', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, { posts: [fixturePosts.publicTrack] });

  await page.goto('/post/post-public-track');
  await expect(page.getByRole('button', { name: 'Like post' }).first()).toBeVisible();
  await page.getByRole('button', { name: 'Sign Up', exact: true }).filter({ visible: true }).click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent('/post/post-public-track')}`);
  expect(await pendingAction(page)).toBeNull();
});

test('saves once for an existing account that signs in from the sign-up offer', async ({ page }) => {
  const creates = trackPostCreates(page);
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member, posts: [anonymousConversion] });

  await page.goto(POST_PATH);
  await page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true }).click();
  await page.getByRole('button', { name: 'Continue with Google' }).click();

  await expect(page).toHaveURL(POST_PATH);
  await expect(page.getByTestId('post-add-to-profile').filter({ visible: true })).toContainText('Added to Profile');
  expect(creates).toHaveLength(1);
});

test('returns to an owned post after sign-up without saving it', async ({ page }) => {
  const creates = trackPostCreates(page);
  await mockCassetteApp(page, { googleAuthUser: fixtureUsers.member, posts: [fixturePosts.publicTrack] });

  await page.goto('/post/post-public-track');
  await page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true }).click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent('/post/post-public-track')}`);
  expect(await pendingAction(page)).toBeNull();

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/post/post-public-track');
  await expect(page.getByRole('button', { name: 'Like post' }).first()).toBeVisible();
  expect(creates).toHaveLength(0);
});

test('does not carry a pending save to another post or past its expiry', async ({ page }) => {
  const creates = trackPostCreates(page);
  const otherConversion: FixturePost = {
    ...anonymousConversion,
    postId: 'post-other-conversion',
    musicElementId: 'track-other-1',
    title: 'Other Signal',
  };
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, posts: [anonymousConversion, otherConversion] });
  await page.goto('/');

  // A save chosen for one post does not run on another.
  await page.evaluate(([key, postId]) => sessionStorage.setItem(key, JSON.stringify({
    type: 'add_to_profile', postId, returnUrl: `/post/${postId}`, timestamp: Date.now(),
  })), [PENDING_ACTION_KEY, anonymousConversion.postId]);
  await page.goto(`/post/${otherConversion.postId}`);
  await expect(page.getByTestId('post-add-to-profile').filter({ visible: true })).toHaveText('Add Post to Profile');

  // An expired save does not run on its own post either.
  await page.evaluate(([key, postId]) => sessionStorage.setItem(key, JSON.stringify({
    type: 'add_to_profile', postId, returnUrl: `/post/${postId}`, timestamp: Date.now() - 11 * 60 * 1000,
  })), [PENDING_ACTION_KEY, anonymousConversion.postId]);
  await page.goto(POST_PATH);
  await expect(page.getByTestId('post-add-to-profile').filter({ visible: true })).toHaveText('Add Post to Profile');

  expect(creates).toHaveLength(0);
});

test('keeps the post as the return path from the like sign-in prompt', async ({ page }) => {
  await mockCassetteApp(page, { posts: [fixturePosts.publicTrack] });

  await page.goto('/post/post-public-track');
  await page.getByRole('button', { name: 'Like post' }).first().click();
  await page.getByTestId('auth-prompt-signup').click();
  await expect(page).toHaveURL(`/auth/signup?redirect=${encodeURIComponent('/post/post-public-track')}`);

  await page.goto('/post/post-public-track');
  await page.getByRole('button', { name: 'Like post' }).first().click();
  await page.getByTestId('auth-prompt-signin').click();
  await expect(page).toHaveURL(`/auth/signin?redirect=${encodeURIComponent('/post/post-public-track')}`);
});
