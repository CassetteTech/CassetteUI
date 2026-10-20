/** Covers a shared members-only post link: the locked curator view for every viewer without access, and the full post for a member. */

import { expect, type Page, test } from '@playwright/test';

import {
  fixtureActiveMembershipStatus,
  fixtureCanceledMembershipStatus,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureNoMembershipStatus,
  fixturePosts,
  fixtureUsers,
  type FixturePost,
} from './support/cassette-fixtures';
import { mockCassetteApp, toPostByIdResponse } from './support/mock-cassette-app';

const NAME = fixtureCuratorPage.curator.displayName!;
const USERNAME = fixtureCuratorPage.curator.username;
const SECRET_TITLE = 'Members Secret Mixtape';

const memberPost: FixturePost = {
  ...fixturePosts.playlistSource,
  postId: 'p_20261001120000_sharedmembers1',
  title: SECRET_TITLE,
  description: 'Only for members.',
  privacy: 'subscriber',
};

const lockedView = (page: Page) => page.getByTestId('members-only-post');

async function expectLockedView(page: Page) {
  const view = lockedView(page);
  await expect(view.getByRole('heading', { name: `Members-only post from ${NAME}` })).toBeAttached();
  await expect(view.getByText('Members only', { exact: true })).toBeVisible();
  await expect(view.getByText(`For ${NAME}'s members.`)).toBeVisible();
  await expect(view.getByText(/Membership \$5\.50 a month/)).toBeVisible();
  await expect(view.getByRole('link', { name: `Join ${NAME}` })).toHaveAttribute(
    'href',
    `/profile/${USERNAME}?source_post=${memberPost.postId}#membership-offer`,
  );
  await expect(page.getByText(SECRET_TITLE)).toHaveCount(0);
  await expect(page.getByText('MusicLink unavailable')).toHaveCount(0);
}

test('shows a signed-out visitor the curator, the price, Join, Follow, and sign-in', async ({ page }) => {
  await mockCassetteApp(page, { curatorPage: fixtureCuratorPage, posts: [memberPost] });

  await page.goto(`/post/${memberPost.postId}`);

  await expectLockedView(page);
  await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toHaveAttribute(
    'href',
    `/auth/signin?redirect=${encodeURIComponent(`/post/${memberPost.postId}`)}`,
  );

  // Follow keeps the existing signed-out return to the curator's page.
  await lockedView(page).getByRole('button', { name: `Follow ${NAME}`, exact: true }).click();
  await expect(page).toHaveURL((url) =>
    url.pathname === '/auth/signin' &&
    url.searchParams.get('redirect') === `/profile/${USERNAME}?follow=1`);
});

test('shows a signed-in viewer without a membership the locked view and Follow', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
    posts: [memberPost],
  });

  await page.goto(`/post/${memberPost.postId}`);

  await expectLockedView(page);
  await expect(lockedView(page).getByRole('button', { name: `Follow ${NAME}`, exact: true })).toBeVisible();
  await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
});

test('keeps the post locked after the membership ends and for a member of another curator', async ({ page }) => {
  for (const membershipStatus of [
    fixtureCanceledMembershipStatus,
    { ...fixtureActiveMembershipStatus, curatorProfileId: 'cpr_AnotherCurator01' },
  ]) {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus,
      posts: [memberPost],
    });

    await page.goto(`/post/${memberPost.postId}`);

    await expectLockedView(page);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('gives an active member the full post', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    posts: [memberPost],
  });

  await page.goto(`/post/${memberPost.postId}`);

  await expect(page.getByRole('heading', { name: SECRET_TITLE }).first()).toBeVisible();
  await expect(lockedView(page)).toHaveCount(0);
});

test('offers the profile instead of Join when the curator takes no new members', async ({ page }) => {
  await mockCassetteApp(page, { curatorPage: fixtureFreeCuratorPage, posts: [memberPost] });

  await page.goto(`/post/${memberPost.postId}`);

  await expect(lockedView(page).getByText(`${NAME} is not taking new members right now.`)).toBeVisible();
  await expect(lockedView(page).getByRole('link', { name: `View profile ${NAME}` })).toBeVisible();
  await expect(lockedView(page).getByRole('link', { name: `Join ${NAME}` })).toHaveCount(0);
  await expect(lockedView(page).getByText(/Membership/)).toHaveCount(0);
});

test.describe('a post already on screen', () => {
  test('is replaced by the locked view when an account without access becomes current', async ({ page }) => {
    await page.clock.install();
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureActiveMembershipStatus,
      posts: [memberPost],
      users: [fixtureUsers.member],
    });

    await page.goto(`/post/${memberPost.postId}`);
    await expect(page.getByRole('heading', { name: SECRET_TITLE }).first()).toBeVisible();

    // Another account, which is not a member, becomes current on this page.
    state.currentUser = { ...fixtureUsers.member };
    state.membershipStatus = fixtureNoMembershipStatus;
    await page.clock.fastForward('01:01');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    await expectLockedView(page);
    await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
  });

  test('is replaced by the locked view when the session ends', async ({ page }) => {
    await page.clock.install();
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureActiveMembershipStatus,
      posts: [memberPost],
    });

    await page.goto(`/post/${memberPost.postId}`);
    await expect(page.getByRole('heading', { name: SECRET_TITLE }).first()).toBeVisible();

    state.currentUser = null;
    await page.clock.fastForward('01:01');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    await expectLockedView(page);
    await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});

test.describe('a post read while the account is not known', () => {
  const isPostRead = (url: string) => new URL(url).pathname === `/api/v1/social/posts/${memberPost.postId}`;

  /**
   * The member's session cookie is valid, but the first session read fails, so
   * the page opens without an account. Its post read must not use the cookie.
   */
  async function openWithFailedSessionRead(page: Page, options: Parameters<typeof mockCassetteApp>[1]) {
    const mock = await mockCassetteApp(page, { ...options, sessionCookie: true });
    let isFirstRead = true;
    await page.route('**/api/auth/session', async (route) => {
      if (!isFirstRead) return route.fallback();
      isFirstRead = false;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' });
    });
    const postRead = page.waitForRequest((request) => isPostRead(request.url()));

    await page.goto(`/post/${memberPost.postId}`);

    expect(await (await postRead).headerValue('cookie')).toBeNull();
    await expectLockedView(page);
    await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toBeVisible();
    return mock;
  }

  const memberOptions = {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    posts: [memberPost],
    users: [fixtureUsers.member],
  };

  test('shows the full post once the session names the member', async ({ page }) => {
    await openWithFailedSessionRead(page, memberOptions);

    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    await expect(page.getByRole('heading', { name: SECRET_TITLE }).first()).toBeVisible();
    await expect(lockedView(page)).toHaveCount(0);
  });

  test('never shows the post when the session names an account without access', async ({ page }) => {
    const { state } = await openWithFailedSessionRead(page, memberOptions);

    // The next session read names another account, and its post read waits.
    let answerPostRead!: () => void;
    const postReadAnswered = new Promise<void>((resolve) => { answerPostRead = resolve; });
    await page.route((url) => isPostRead(url.href), async (route) => {
      await postReadAnswered;
      await route.fallback();
    });
    state.currentUser = { ...fixtureUsers.member };
    state.membershipStatus = fixtureNoMembershipStatus;
    const accountPostRead = page.waitForRequest((request) => isPostRead(request.url()));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));

    expect(await (await accountPostRead).headerValue('cookie')).toContain('cassette-e2e-session');
    await expect(page.getByText(SECRET_TITLE)).toHaveCount(0);

    answerPostRead();
    await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toHaveCount(0);
    await expectLockedView(page);
  });

  test('never shows the post when the session has ended', async ({ page }) => {
    const { state } = await openWithFailedSessionRead(page, memberOptions);

    state.currentUser = null;
    const sessionRead = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/session');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect((await sessionRead).status()).toBe(401);

    await expectLockedView(page);
    await expect(lockedView(page).getByRole('link', { name: 'Sign in' })).toBeVisible();
  });
});

test.describe('a post cached by a conversion for another account', () => {
  const CACHED_TITLE = 'Cached Members Mixtape';
  const isPostRead = (url: string) => new URL(url).pathname === `/api/v1/social/posts/${memberPost.postId}`;

  // The stash a conversion leaves for the member's own next page, as Studio writes it.
  async function seedMemberCache(page: Page) {
    const entry = { viewerId: fixtureUsers.viewer.id, post: toPostByIdResponse({ ...memberPost, title: CACHED_TITLE }) };
    await page.addInitScript(([key, value]) => {
      if (sessionStorage.getItem('cache-seeded')) return;
      sessionStorage.setItem('cache-seeded', '1');
      sessionStorage.setItem(key, JSON.stringify({ ...JSON.parse(value), savedAt: Date.now() }));
    }, [`cassette:prefetched-post:${memberPost.postId}`, JSON.stringify(entry)]);
    // Records any moment the cached content is on the page, so a brief flash also fails.
    await page.addInitScript((title) => {
      new MutationObserver(() => {
        if (document.body?.textContent?.includes(title)) sessionStorage.setItem('cached-title-seen', '1');
      }).observe(document, { childList: true, subtree: true, characterData: true });
    }, CACHED_TITLE);
  }

  const cachedTitleSeen = (page: Page) => page.evaluate(() => sessionStorage.getItem('cached-title-seen') === '1');

  const memberOptions = {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureActiveMembershipStatus,
    posts: [memberPost],
    users: [fixtureUsers.member],
  };

  test('is not shown when the first session read fails, nor after the session ends', async ({ page }) => {
    const { state } = await mockCassetteApp(page, { ...memberOptions, sessionCookie: true });
    await seedMemberCache(page);
    let isFirstRead = true;
    await page.route('**/api/auth/session', async (route) => {
      if (!isFirstRead) return route.fallback();
      isFirstRead = false;
      await route.fulfill({ status: 503, contentType: 'application/json', body: '{"success":false}' });
    });
    const postRead = page.waitForRequest((request) => isPostRead(request.url()));

    await page.goto(`/post/${memberPost.postId}`);

    expect(await (await postRead).headerValue('cookie')).toBeNull();
    await expectLockedView(page);
    await expect(page.getByText(CACHED_TITLE)).toHaveCount(0);

    state.currentUser = null;
    const sessionRead = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/session');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    expect((await sessionRead).status()).toBe(401);

    await expectLockedView(page);
    expect(await cachedTitleSeen(page)).toBe(false);
  });

  test('is not shown to a different account while its own read waits', async ({ page }) => {
    await mockCassetteApp(page, {
      ...memberOptions,
      currentUser: fixtureUsers.member,
      membershipStatus: fixtureNoMembershipStatus,
    });
    await seedMemberCache(page);
    let answerPostRead!: () => void;
    const postReadAnswered = new Promise<void>((resolve) => { answerPostRead = resolve; });
    await page.route((url) => isPostRead(url.href), async (route) => {
      await postReadAnswered;
      await route.fallback();
    });
    const accountPostRead = page.waitForRequest((request) => isPostRead(request.url()));

    await page.goto(`/post/${memberPost.postId}`);
    await accountPostRead;
    await expect(page.getByText(CACHED_TITLE)).toHaveCount(0);
    await expect(page.getByText(SECRET_TITLE)).toHaveCount(0);

    answerPostRead();
    await expectLockedView(page);
    expect(await cachedTitleSeen(page)).toBe(false);
  });
});
