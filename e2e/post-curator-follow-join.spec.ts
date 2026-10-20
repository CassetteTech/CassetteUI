import { expect, type Page, test } from '@playwright/test';

import {
  fixtureActiveMembershipStatus,
  fixtureCuratorPage,
  fixtureNoMembershipStatus,
  fixturePosts,
  fixtureUsers,
  type FixturePost,
} from './support/cassette-fixtures';
import { followButton, followWrites as writes } from './support/curator-follow-controls';
import { expectNoHorizontalOverflow } from './support/layout';
import { mockCassetteApp } from './support/mock-cassette-app';
import type { PostCurator } from '../src/services/post-response';

// A well-formed Bridge post id, so the Join carries it as the source post.
const POST_ID = 'p_20261020120000_followjoinpost';
const POST_PATH = `/post/${POST_ID}`;
const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const NAME = fixtureCuratorPage.curator.displayName!;
const CURATOR_ID = fixtureCuratorPage.curator.id;

const curator: PostCurator = {
  curatorProfileId: CURATOR_ID,
  userId: fixtureUsers.playlistCurator.id,
  username: fixtureCuratorPage.curator.username,
  displayName: NAME,
  avatarUrl: null,
  membership: {
    planName: 'Crate Notes',
    amountMinor: 500,
    serviceFeeMinor: 50,
    currency: 'USD',
    membersOnlyPostCount: 12,
    viewerIsMember: false,
  },
  // The mock fills in the viewer's follow state, as Bridge does.
  viewerFollow: null,
};

const postBy = (summary: PostCurator | undefined): FixturePost => ({
  ...fixturePosts.playlistSource,
  postId: POST_ID,
  curator: summary,
  tracks: ['Slow Signal', 'Harbor Lights', 'Paper Moons'].map((title, index) => ({
    title,
    trackNumber: index + 1,
    duration: '3:41',
    artists: ['Crate Keeper'],
  })),
});

const joinLine = (page: Page) => page.getByTestId('post-curator-join').filter({ visible: true });
const joinLink = (page: Page) => page.getByRole('link', { name: `Join ${NAME}`, exact: true }).filter({ visible: true });
const signUp = (page: Page) => page.getByRole('button', { name: 'Sign up free' }).filter({ visible: true });
const following = (page: Page) => page.getByText('Following', { exact: true }).filter({ visible: true });
const authorName = (page: Page) => page.getByRole('link', { name: NAME, exact: true }).filter({ visible: true });

const followReads = (state: { curatorFollowRequests: Array<{ method: string }> }) =>
  state.curatorFollowRequests.filter(({ method }) => method === 'GET');

const VIEWPORTS = [
  { label: 'phone', width: 390, height: 844 },
  { label: 'desktop', width: 1440, height: 900 },
] as const;

async function capture(page: Page, name: string) {
  await page.screenshot({ path: test.info().outputPath(`${name}.png`), fullPage: true, animations: 'disabled' });
}

for (const viewport of VIEWPORTS) {
  test.describe(`post curator at ${viewport.width}px`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test('signed out: Follow on the author row and the join line replace the sign-up line', async ({ page }) => {
      await mockCassetteApp(page, { posts: [postBy(curator)] });
      await page.goto(POST_PATH);

      await expect(authorName(page)).toBeVisible();
      await expect(followButton(page)).toBeVisible();
      await expect(joinLine(page)).toContainText('Crate Notes');
      await expect(joinLine(page)).toContainText('$5.50/month · 12 members-only posts');
      await expect(joinLink(page)).toHaveAttribute(
        'href',
        `${CURATOR_PATH}?intent=join&interval=month&source_post=${POST_ID}#membership-offer`,
      );
      await expect(signUp(page)).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await capture(page, `signed-out-${viewport.label}`);
    });

    test('signed in, following, not a member: Following and Join', async ({ page }) => {
      const { state } = await mockCassetteApp(page, {
        currentUser: fixtureUsers.viewer,
        posts: [postBy(curator)],
        membershipStatus: fixtureNoMembershipStatus,
        curatorFollows: [CURATOR_ID],
      });
      await page.goto(POST_PATH);

      await expect(following(page)).toBeVisible();
      // Unfollow stays on the curator page.
      await expect(page.getByRole('button', { name: `Unfollow ${NAME}`, exact: true })).toHaveCount(0);
      await expect(joinLink(page)).toBeVisible();
      // The post read carries the follow state; the page does not read it again.
      expect(followReads(state)).toEqual([]);
      await expectNoHorizontalOverflow(page);
      await capture(page, `non-member-${viewport.label}`);
    });

    test('member: no Follow, the membership and a link to the member posts', async ({ page }) => {
      const { state } = await mockCassetteApp(page, {
        currentUser: fixtureUsers.member,
        posts: [postBy({ ...curator, membership: { ...curator.membership!, viewerIsMember: true } })],
        membershipStatus: fixtureActiveMembershipStatus,
      });
      await page.goto(POST_PATH);

      await expect(joinLine(page)).toContainText('Member of Crate Notes');
      await expect(joinLine(page).getByRole('link', { name: 'Member posts' }))
        .toHaveAttribute('href', `${CURATOR_PATH}?filter=members`);
      await expect(joinLink(page)).toHaveCount(0);
      await expect(page.getByTestId('curator-follow')).toHaveCount(0);
      expect(followReads(state)).toEqual([]);
      await capture(page, `member-${viewport.label}`);
    });

    test('curator with no live plan: Follow only, no red button', async ({ page }) => {
      await mockCassetteApp(page, { posts: [postBy({ ...curator, membership: null })] });
      await page.goto(POST_PATH);

      await expect(followButton(page)).toBeVisible();
      await expect(joinLine(page)).toHaveCount(0);
      await expect(signUp(page)).toHaveCount(0);
      await capture(page, `no-plan-${viewport.label}`);
    });

    test('owner: no Follow and no join line on their own post', async ({ page }) => {
      await mockCassetteApp(page, { currentUser: fixtureUsers.playlistCurator, posts: [postBy(curator)] });
      await page.goto(POST_PATH);

      await expect(authorName(page)).toBeVisible();
      await expect(page.getByTestId('post-actions-trigger')).toBeVisible();
      await expect(page.getByTestId('curator-follow')).toHaveCount(0);
      await expect(joinLine(page)).toHaveCount(0);
      await capture(page, `owner-${viewport.label}`);
    });

    test('poster without a curator page, or an older Bridge: today\'s sign-up line', async ({ page }) => {
      await mockCassetteApp(page, { posts: [postBy(undefined)] });
      await page.goto(POST_PATH);

      await expect(page.getByRole('link', { name: fixtureUsers.playlistCurator.username, exact: true }).filter({ visible: true }))
        .toBeVisible();
      await expect(signUp(page)).toBeVisible();
      await expect(page.getByTestId('curator-follow')).toHaveCount(0);
      await expect(joinLine(page)).toHaveCount(0);
      await capture(page, `no-curator-page-${viewport.label}`);
    });
  });
}

test('Follow from the post follows once and hands focus to the Following label', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    posts: [postBy(curator)],
    membershipStatus: fixtureNoMembershipStatus,
  });
  await page.goto(POST_PATH);
  await followButton(page).focus();
  await page.keyboard.press('Enter');

  await expect(following(page)).toBeFocused();
  expect(writes(state)).toEqual(['PUT']);
  expect(followReads(state)).toEqual([]);
});

test('a Follow from the post survives the switch between the desktop and phone layouts', async ({ page }) => {
  // The post page swaps its author card at 900 px, which mounts the Follow control again.
  const desktopCard = page.locator('[class*="grid-cols-[minmax(16rem,22rem)"]');
  await page.setViewportSize({ width: 1280, height: 900 });
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    posts: [postBy(curator)],
    membershipStatus: fixtureNoMembershipStatus,
  });
  await page.goto(POST_PATH);
  await followButton(page).click();
  await expect(following(page)).toBeVisible();

  for (const [width, height, cards] of [[390, 844, 0], [1280, 900, 1]] as const) {
    await page.setViewportSize({ width, height });
    await expect(desktopCard).toHaveCount(cards);
    await expect(following(page)).toBeVisible();
    await expect(followButton(page)).toHaveCount(0);
  }
  expect(writes(state)).toEqual(['PUT']);
  expect(followReads(state)).toEqual([]);
});

for (const cachedFollowing of [true, false]) {
  test(`a fresh post summary replaces a cached follow state that says ${cachedFollowing ? 'following' : 'not following'}`, async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
      curatorFollows: cachedFollowing ? [CURATOR_ID] : [],
      posts: [{ ...postBy(curator), postId: 'post-curator-public' }],
    });
    await page.goto(CURATOR_PATH);
    await expect(cachedFollowing ? following(page) : followButton(page)).toBeVisible();

    // Another tab changes the follow; the curator page's cached state is now stale.
    if (cachedFollowing) state.curatorFollows.delete(CURATOR_ID);
    else state.curatorFollows.add(CURATOR_ID);
    await page.locator('h3:visible').filter({ hasText: 'Sunday Morning Selects' }).first().click();
    await expect(page).toHaveURL(/\/post\/post-curator-public/);

    await expect(cachedFollowing ? followButton(page) : following(page)).toBeVisible();
    await expect(cachedFollowing ? following(page) : followButton(page)).toHaveCount(0);
  });
}

test('a signed-out Follow returns to the post and follows once', async ({ page }) => {
  const { state } = await mockCassetteApp(page, { posts: [postBy(curator)] });
  await page.goto(POST_PATH);
  await followButton(page).click();

  const returnPath = `${POST_PATH}?follow=1`;
  await expect(page).toHaveURL(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
  expect(writes(state)).toEqual([]);

  state.currentUser = { ...fixtureUsers.viewer };
  await page.goto(returnPath);

  await expect(following(page)).toBeVisible();
  expect(writes(state)).toEqual(['PUT']);
  expect(followReads(state)).toEqual([]);
  await expect(page).toHaveURL(POST_PATH);
});

test('Join opens the monthly confirmation on the curator page and carries the post', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    posts: [postBy(curator)],
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
  });
  await page.goto(POST_PATH);
  await joinLink(page).click();

  const dialog = page.getByRole('alertdialog', { name: `Join ${NAME}?` }).or(page.getByRole('dialog', { name: `Join ${NAME}?` }));
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('/month');
  await expect(page).toHaveURL(`${CURATOR_PATH}?source_post=${POST_ID}#membership-offer`);
});

test('a signed-out Join signs in first and keeps the source post', async ({ page }) => {
  await mockCassetteApp(page, { posts: [postBy(curator)], curatorPage: fixtureCuratorPage });
  await page.goto(POST_PATH);
  await joinLink(page).click();

  const returnPath = `${CURATOR_PATH}?membership=join&interval=month&source_post=${POST_ID}`;
  await expect(page).toHaveURL(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
});
