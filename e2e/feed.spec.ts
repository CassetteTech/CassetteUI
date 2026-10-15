import { expect, type Page, type Request, type Route, test } from '@playwright/test';

import {
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureNoMembershipStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { fulfillUnlessAborted, holdRoute, trackRequests } from './support/held-requests';
import { mockCassetteApp } from './support/mock-cassette-app';

const feedPost = (index: number, privacy: 'public' | 'subscriber', username: string) => ({
  kind: 'post',
  post: {
    postId: `p_20261001120000_0000000000000${index}`,
    redirectPostId: `p_20261001120000_0000000000000${index}`,
    elementType: 'Track',
    title: `Feed track ${index}`,
    subtitle: `Feed artist ${index}`,
    imageUrl: `https://example.com/feed-${index}.jpg`,
    username,
    userId: '33333333-3333-3333-3333-33333333333' + index,
    createdAt: '2026-10-01T12:00:00Z',
    privacy,
  },
});

const feedPage = (
  items: unknown[],
  nextCursor: string | null,
  activeMembershipCount = 2,
  feedCuratorCount = activeMembershipCount,
) => ({
  items,
  nextCursor,
  activeMembershipCount,
  feedCuratorCount,
});

const memberFeed = ({ cursor, membersOnly }: { cursor: string | null; membersOnly: boolean }) => {
  if (membersOnly) {
    return { body: feedPage([feedPost(1, 'subscriber', 'night-curator')], null) };
  }
  return cursor === null
    ? { body: feedPage([feedPost(1, 'subscriber', 'night-curator'), feedPost(2, 'public', 'day-curator')], 'cursor-page-2') }
    : { body: feedPage([feedPost(3, 'public', 'night-curator')], null) };
};

const lockedPost = (index: number, curatorId: string, username: string, displayName: string | null = null) => ({
  kind: 'locked',
  postId: `p_20261001110000_0000000000000${index}`,
  createdAt: '2026-10-01T11:00:00Z',
  curator: { id: curatorId, username, displayName, avatarUrl: null },
});

const CRATE = { id: fixtureCuratorPage.curator.id, username: fixtureCuratorPage.curator.username };
const QUIET = { id: 'cpr_QuietCurator01', username: 'quiet-curator' };
const follower = { ...fixtureUsers.viewer, activeMembershipCount: 0, feedCuratorCount: 2 };

const featuredCurator = (name: string, index: number, hasActiveMembershipPlan = true) => ({
  userId: `44444444-4444-4444-4444-44444444444${index}`,
  username: `${name}-curator`,
  displayName: `${name} curator`,
  publicPostCount: 3,
  recentArtworkUrls: [],
  hasActiveMembershipPlan,
});

const postLinks = (page: Page) => page.getByRole('link', { name: /Feed track/ });
const lockedCards = (page: Page) => page.getByTestId('feed-locked-post');
const rowOrder = (page: Page) => page.locator('a[href^="/post/"], [data-testid="feed-locked-post"]').evaluateAll(
  (rows) => rows.map((row) => row.tagName === 'ARTICLE'
    ? `locked:${row.querySelector('a[href^="/profile/"]')?.textContent?.replace(/^[^@]*/, '')}`
    : row.querySelector('h3')?.textContent?.trim()),
);
const skeleton = (page: Page) => page.getByTestId('post-grid-skeleton');
const cursors = (requests: Request[]) => requests.map((request) => new URL(request.url()).searchParams.get('cursor'));

const FEED_PATH = '/api/v1/social/feed/posts';
const SESSION_PATH = '/api/auth/session';

async function recordTextAppearance(page: Page, text: string) {
  await page.evaluate((watched) => {
    new MutationObserver(() => {
      if (document.body.textContent?.includes(watched)) document.body.dataset.recordedTextShown = 'true';
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  }, text);
}

const isFeed = (url: URL) => url.pathname === FEED_PATH;
const isSession = (url: URL) => url.pathname === SESSION_PATH;

test('a member pages through newest posts in the Feed', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
  let holdNextPage = false;
  const releaseNextPage = await holdRoute(page, isFeed, () => holdNextPage);

  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'From your curators', level: 1 })).toBeVisible();
  await expect(postLinks(page)).toHaveText([/Feed track 1/, /Feed track 2/]);
  await expect(page.getByRole('link', { name: /Feed track 1/ })).toContainText('Members only');
  await expect(page.getByRole('link', { name: /Feed track 2/ })).not.toContainText('Members only');

  holdNextPage = true;
  await page.getByRole('button', { name: 'Load more' }).click();
  await expect(page.getByRole('button', { name: 'Load more' })).toBeDisabled();
  await expect(postLinks(page)).toHaveCount(2);
  releaseNextPage();

  await expect(postLinks(page)).toHaveText([/Feed track 1/, /Feed track 2/, /Feed track 3/]);
  await expect(page.getByRole('button', { name: 'Load more' })).toHaveCount(0);
  expect(cursors(curatorFeedRequests)).toEqual([null, 'cursor-page-2']);
});

test('the Members only filter asks the server for member posts and keeps its URL', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

  await page.goto('/feed');
  await expect(postLinks(page)).toHaveCount(2);
  const filter = page.getByRole('radio', { name: 'Members only' });
  await filter.click();

  await expect(filter).toBeChecked();
  await expect(page).toHaveURL('/feed?filter=members');
  await expect(page.getByRole('heading', { name: 'From your curators', level: 1 })).toBeVisible();
  await expect(postLinks(page)).toHaveText([/Feed track 1/]);
  expect(new URL(curatorFeedRequests.at(-1)!.url()).searchParams.get('membersOnly')).toBe('true');

  await page.reload();
  await expect(page.getByRole('radio', { name: 'Members only' })).toBeChecked();
  await expect(postLinks(page)).toHaveText([/Feed track 1/]);
});

test('signed-out visitors are asked to sign in and return to the Feed', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, { curatorFeed: memberFeed });

  await page.goto('/feed');
  await expect(page.getByText('Sign in to see your Feed')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    `/auth/signin?redirect=${encodeURIComponent('/feed')}`,
  );

  await page.goto('/feed?filter=members');
  await expect(page.getByRole('link', { name: 'Sign in', exact: true })).toHaveAttribute(
    'href',
    `/auth/signin?redirect=${encodeURIComponent('/feed?filter=members')}`,
  );
  await expect(page.getByRole('radio', { name: 'Members only' })).toHaveCount(0);
  expect(curatorFeedRequests).toEqual([]);
});

test('a viewer without memberships sees Join a curator without a Feed request or post skeleton', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    exploreCurators: [
      featuredCurator('planless', 0, false),
      { ...featuredCurator('self', 1), userId: fixtureUsers.viewer.id },
      featuredCurator('first', 2),
      featuredCurator('second', 3),
      featuredCurator('third', 4),
      featuredCurator('fourth', 5),
    ],
  });

  await page.goto('/feed');

  await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
  const featured = page.getByRole('list', { name: 'Featured curators' }).getByRole('link');
  await expect(featured).toHaveText([/first curator/, /second curator/, /third curator/]);
  await expect(featured.first()).toHaveAttribute('href', '/profile/first-curator');
  await expect(page.getByRole('link', { name: 'Explore curators' })).toHaveAttribute('href', '/explore');
  await expect(page.getByRole('link', { name: 'Memberships', exact: true }).last()).toHaveAttribute('href', '/memberships');
  await expect(page.getByRole('radio', { name: 'Members only' })).toHaveCount(0);
  await expect(skeleton(page)).toHaveCount(0);
  expect(curatorFeedRequests).toEqual([]);
});

test('a featured curator failure stays inside the join state', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.viewer });
  await page.route('**/api/v1/social/explore/curators', (route) => route.fulfill({ status: 503, body: 'unavailable' }));

  await page.goto('/feed');

  await expect(page.getByText('Featured curators could not load.')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore curators' })).toBeVisible();
});

test('the Feed waits for the session, then shows the post skeleton only for a positive count', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
  const releaseSession = await holdRoute(page, isSession, () => true);
  const releaseFeed = await holdRoute(page, isFeed, () => true);

  await page.goto('/feed');
  await page.waitForTimeout(500);
  await expect(skeleton(page)).toHaveCount(0);
  expect(curatorFeedRequests).toEqual([]);

  releaseSession();
  await expect(skeleton(page)).toBeVisible();
  await expect.poll(() => curatorFeedRequests.length).toBe(1);

  releaseFeed();
  await expect(postLinks(page)).toHaveCount(2);
  await expect(skeleton(page)).toHaveCount(0);
});

test('a session outage offers a retry, never the join state or sign-in', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
  let available = false;
  await page.route('**/api/auth/session', (route) =>
    available ? route.fallback() : route.fulfill({ status: 503, body: 'unavailable' }));

  await page.goto('/feed');

  await expect(page.getByText('Could not check your account')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
  await expect(page.getByText('Sign in to see your Feed')).toHaveCount(0);
  await expect(skeleton(page)).toHaveCount(0);
  expect(curatorFeedRequests).toEqual([]);

  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(postLinks(page)).toHaveCount(2);
});

for (const [name, counts] of [
  ['membership', { activeMembershipCount: 1.5, feedCuratorCount: 2 }],
  ['source', { activeMembershipCount: 1 }],
] as const) {
  test(`a session without a valid ${name} count is an error, not zero sources`, async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });
    await page.route('**/api/auth/session', (route) => route.fulfill({
      json: {
        success: true,
        authenticated: true,
        user: { userId: fixtureUsers.member.id, username: fixtureUsers.member.username, isOnboarded: true },
        ...counts,
      },
    }));

    await page.goto('/feed');

    await expect(page.getByText('Could not check your account')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
    await expect(skeleton(page)).toHaveCount(0);
    expect(curatorFeedRequests).toEqual([]);
  });
}

test('a failed first page offers a retry', async ({ page }) => {
  let available = false;
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorFeed: (query) => (available ? memberFeed(query) : { status: 503, body: 'unavailable' }),
  });

  await page.goto('/feed');
  await expect(page.getByText('Posts could not load')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('No posts yet')).toHaveCount(0);
  available = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(page.getByRole('link', { name: /Feed track 1/ })).toBeVisible();
});

test('a Feed response without its metadata is an error, not an empty Feed', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorFeed: () => ({ body: { items: [feedPost(1, 'subscriber', 'night-curator')] } }),
  });

  await page.goto('/feed');

  await expect(page.getByText('Posts could not load')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Feed track 1/ })).toHaveCount(0);
});

test('a failed next page keeps loaded rows and retries the same cursor', async ({ page }) => {
  const curatorFeedRequests = trackRequests(page, FEED_PATH);
  let nextPageAvailable = false;
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorFeed: (query) =>
      query.cursor !== null && !nextPageAvailable ? { status: 503, body: 'unavailable' } : memberFeed(query),
  });

  await page.goto('/feed');
  await page.getByRole('button', { name: 'Load more' }).click();

  await expect(page.getByText('More posts could not load.')).toBeVisible({ timeout: 15_000 });
  await expect(postLinks(page)).toHaveCount(2);
  nextPageAvailable = true;
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect(postLinks(page)).toHaveCount(3);
  await expect(page.getByText('More posts could not load.')).toHaveCount(0);
  expect(new Set(cursors(curatorFeedRequests).slice(1))).toEqual(new Set(['cursor-page-2']));
});

test('no posts reads differently from no memberships', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    curatorFeed: () => ({ body: feedPage([], null) }),
  });

  await page.goto('/feed');
  await expect(page.getByText('No posts yet')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);

  await page.getByRole('radio', { name: 'Members only' }).click();
  await expect(page.getByText('No members-only posts yet')).toBeVisible();
  await page.getByRole('button', { name: 'Show all posts' }).click();
  await expect(page).toHaveURL('/feed');
  await expect(page.getByText('No posts yet')).toBeVisible();
});

test.describe('freshness', () => {
  test('each visible minute restarts the Feed even when the count stays the same', async ({ page }) => {
    await page.clock.install();
    const sessionRequests = trackRequests(page, SESSION_PATH);
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    let curator = 'night-curator';
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, activeMembershipCount: 1, feedCuratorCount: 1 },
      curatorFeed: () => ({ body: feedPage([feedPost(1, 'subscriber', curator)], 'cursor-page-2', 1) }),
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toContainText(['@night-curator']);
    const sessionsBefore = sessionRequests.length;

    curator = 'day-curator';
    await page.clock.fastForward('01:01');

    await expect(postLinks(page)).toContainText(['@day-curator']);
    await expect(page.getByText('@night-curator')).toHaveCount(0);
    expect(sessionRequests.length).toBe(sessionsBefore + 1);
    expect(cursors(curatorFeedRequests)).toEqual([null, null]);
  });

  test('a membership that ends on its own clears the Feed at the next boundary', async ({ page }) => {
    await page.clock.install();
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorFeed: memberFeed,
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);

    state.currentUser!.activeMembershipCount = 0;
    state.currentUser!.feedCuratorCount = 0;
    await page.clock.fastForward('01:01');

    await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
    await expect(postLinks(page)).toHaveCount(0);
    expect(curatorFeedRequests).toHaveLength(1);
  });

  test('a session failure at the boundary shows a retry instead of loaded posts', async ({ page }) => {
    await page.clock.install();
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
    let failing = false;
    await page.route('**/api/auth/session', (route) =>
      failing ? route.fulfill({ status: 502, body: 'bad gateway' }) : route.fallback());

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);

    failing = true;
    await page.clock.fastForward('01:01');

    await expect(page.getByText('Could not check your account')).toBeVisible();
    await expect(postLinks(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
  });

  test('a page that answers after a reset never restores earlier rows', async ({ page }) => {
    await page.clock.install();
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
    let holdNextPage = false;
    const releaseNextPage = await holdRoute(page, (url) => isFeed(url) && url.searchParams.has('cursor'), () => holdNextPage);

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);
    holdNextPage = true;
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect.poll(() => cursors(curatorFeedRequests)).toEqual([null, 'cursor-page-2']);

    await page.clock.fastForward('01:01');
    await expect.poll(() => cursors(curatorFeedRequests)).toEqual([null, 'cursor-page-2', null]);
    await expect(postLinks(page)).toHaveCount(2);
    releaseNextPage();

    await page.waitForTimeout(500);
    await expect(page.getByRole('link', { name: /Feed track 3/ })).toHaveCount(0);
    await expect(postLinks(page)).toHaveCount(2);
  });

  test('a session answer that arrives after sign-out never restores the account', async ({ page }) => {
    await page.clock.install();
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });
    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    let holdSession = false;
    await page.route('**/api/auth/session', async (route: Route) => {
      if (!holdSession) return route.fallback();
      const stale = {
        success: true,
        authenticated: true,
        user: { userId: fixtureUsers.member.id, username: fixtureUsers.member.username, isOnboarded: true },
        activeMembershipCount: 2,
        feedCuratorCount: 2,
      };
      await released;
      await fulfillUnlessAborted(route, { json: stale });
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);
    holdSession = true;
    await page.clock.fastForward('01:01');
    await expect(postLinks(page)).toHaveCount(0);

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL('/auth/signin');
    release();

    await page.waitForTimeout(500);
    await expect(page).toHaveURL('/auth/signin');
    await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  });

  test('another account in the session replaces the Feed at the next read', async ({ page }) => {
    await page.clock.install();
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      users: [fixtureUsers.viewer],
      curatorFeed: memberFeed,
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);

    state.currentUser = { ...fixtureUsers.viewer };
    await page.clock.fastForward('01:01');

    await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
    await expect(postLinks(page)).toHaveCount(0);
    await expect(page.locator('[data-sidebar="content"]').getByText('@samloops')).toBeVisible();
    expect(curatorFeedRequests).toHaveLength(1);
  });

  test('a different count from a Feed page restarts at the first page; zero shows the join state', async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    let feedCount = 3;
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorFeed: () => ({ body: feedPage([feedPost(1, 'public', 'night-curator')], null, feedCount) }),
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(1);
    await expect.poll(() => cursors(curatorFeedRequests)).toEqual([null, null]);

    feedCount = 0;
    await page.getByRole('radio', { name: 'Members only' }).click();
    await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
    await expect(postLinks(page)).toHaveCount(0);
  });

  test('focus refreshes a stale session, and a fresh session lets the Feed open without another read', async ({ page }) => {
    await page.clock.install();
    const sessionRequests = trackRequests(page, SESSION_PATH);
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      myMemberships: [],
      curatorFeed: memberFeed,
    });

    await page.goto('/memberships');
    await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
    const initialReads = sessionRequests.length;

    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.waitForTimeout(300);
    expect(sessionRequests.length).toBe(initialReads);

    await page.clock.fastForward('01:01');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect.poll(() => sessionRequests.length).toBe(initialReads + 1);

    await page.getByRole('link', { name: 'Feed', exact: true }).click();
    await expect(postLinks(page)).toHaveCount(2);
    expect(sessionRequests.length).toBe(initialReads + 1);
    expect(curatorFeedRequests).toHaveLength(1);
  });

  test('opening the Feed with a stale session reads the session before the posts', async ({ page }) => {
    await page.clock.install();
    const sessionRequests = trackRequests(page, SESSION_PATH);
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      myMemberships: [],
      curatorFeed: memberFeed,
    });

    await page.goto('/memberships');
    await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
    const initialReads = sessionRequests.length;
    await page.clock.fastForward('01:01');

    await page.getByRole('link', { name: 'Feed', exact: true }).click();
    await expect(postLinks(page)).toHaveCount(2);
    expect(sessionRequests.length).toBe(initialReads + 1);
    expect(curatorFeedRequests).toHaveLength(1);
  });

  test('returning to the Feed after the session ages out never shows the earlier rows', async ({ page }) => {
    await page.clock.install();
    const sessionRequests = trackRequests(page, SESSION_PATH);
    let posts = [feedPost(1, 'subscriber', 'night-curator'), feedPost(2, 'public', 'day-curator')];
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      myMemberships: [],
      curatorFeed: () => ({ body: feedPage(posts, null) }),
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveText([/Feed track 1/, /Feed track 2/]);
    await page.locator('[data-sidebar="menu"]').getByRole('link', { name: 'Memberships' }).click();
    await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
    const readsBefore = sessionRequests.length;

    await page.clock.fastForward('01:30');
    posts = [feedPost(5, 'public', 'day-curator')];
    await recordTextAppearance(page, 'Feed track 1');
    await page.getByRole('link', { name: 'Feed', exact: true }).click();

    await expect(postLinks(page)).toHaveText([/Feed track 5/]);
    await expect(page.locator('body')).not.toHaveAttribute('data-recorded-text-shown');
    expect(sessionRequests.length).toBe(readsBefore + 1);
  });

  test('a reset that removes the focused post moves focus to the Feed heading', async ({ page }) => {
    await page.clock.install();
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

    await page.goto('/feed');
    await postLinks(page).first().focus();
    await page.clock.fastForward('01:01');

    const heading = page.getByRole('heading', { name: 'From your curators', level: 1 });
    await expect(heading).toBeFocused();
    await expect(postLinks(page)).toHaveCount(2);
    await expect(heading).toBeFocused();
  });

  test('a reset leaves focus outside the posts where it was', async ({ page }) => {
    await page.clock.install();
    const sessionRequests = trackRequests(page, SESSION_PATH);
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);
    const readsBefore = sessionRequests.length;

    const filter = page.getByRole('radio', { name: 'All' });
    await filter.focus();
    await page.clock.fastForward('01:01');
    await expect.poll(() => sessionRequests.length).toBe(readsBefore + 1);
    await expect(postLinks(page)).toHaveCount(2);
    await expect(filter).toBeFocused();

    const navLink = page.locator('[data-sidebar="menu"]').getByRole('link', { name: 'Memberships' });
    await postLinks(page).first().focus();
    await navLink.focus();
    await page.clock.fastForward('01:01');
    await expect.poll(() => sessionRequests.length).toBe(readsBefore + 2);
    await expect(postLinks(page)).toHaveCount(2);
    await expect(navLink).toBeFocused();
  });
});

test.describe('navigation', () => {
  test('the sidebar puts Curator Studio first, Explore last, and has no Home, Profile, or Support Us row', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

    await page.goto('/feed');
    const sidebar = page.locator('[data-slot="sidebar"]');
    const sidebarLinks = page.locator('[data-sidebar="menu"]').getByRole('link');
    await expect(sidebarLinks).toHaveText(['Curator Studio', 'Feed', 'Memberships', 'Explore']);
    await expect(sidebar.getByRole('link', { name: 'Add music', exact: true }))
      .toHaveAttribute('href', `/studio/music/new?from=${encodeURIComponent('/feed')}`);
    await expect(page.locator('[data-sidebar="menu"]').getByRole('link', { name: 'Feed' })).toHaveAttribute('data-active', 'true');
    await expect(sidebar.getByRole('link', { name: 'Support Us' })).toHaveCount(0);

    const accountRow = sidebar.locator(`a[href="/profile/${fixtureUsers.member.username}"]`);
    await expect(accountRow).toHaveCount(1);
    await expect(accountRow).toHaveAttribute('data-active', 'false');
    await accountRow.click();
    await expect(accountRow).toHaveAttribute('aria-current', 'page');
    await expect(sidebar.locator('[data-active="true"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Sign Out' }).click();
    await expect(page).toHaveURL('/auth/signin');
    await page.goto('/feed');
    await expect(sidebar.getByRole('link', { name: 'Sign In' })).toBeVisible();
    await expect(page.locator('[data-sidebar="menu"]').getByRole('link')).toHaveText(['Explore']);
  });

  test('pages without the sidebar link a signed-in user back to Curator Studio', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

    await page.goto('/explore');
    const navbar = page.getByRole('navigation').filter({ has: page.getByTestId('navbar-profile-link') });
    await expect(navbar.getByRole('link', { name: 'Curator Studio' })).toHaveAttribute('href', '/studio');

    await page.goto('/feed');
    await page.getByRole('button', { name: 'Sign Out' }).click();
    await page.goto('/explore');
    await expect(page.getByRole('link', { name: 'Curator Studio' })).toHaveCount(0);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('the signed-in menu is the sidebar: profile, Add music, then Curator Studio first', async ({ page }) => {
      await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

      await page.goto('/explore');
      await page.getByRole('button', { name: 'Open menu' }).click();
      const menu = page.locator('#mobile-menu-panel');
      await expect(menu.getByRole('link', { name: /Mia Groove/ })).toHaveAttribute('href', `/profile/${fixtureUsers.member.username}`);
      await expect(menu.getByRole('link', { name: 'Add music', exact: true }))
        .toHaveAttribute('href', `/studio/music/new?from=${encodeURIComponent('/explore')}`);
      const pages = menu.getByRole('region', { name: 'Pages' }).getByRole('link');
      await expect(pages).toHaveText(['Curator Studio', 'Feed', 'Memberships', 'Explore']);
      await expect(menu.getByRole('region', { name: 'Browse' })).toHaveCount(0);
      await expect(menu.getByRole('region', { name: 'Account' }).getByRole('button', { name: 'Sign Out' })).toBeVisible();
      await pages.filter({ hasText: 'Feed' }).click();
      await expect(page).toHaveURL('/feed');
      await expect(postLinks(page)).toHaveCount(2);
    });

    test('a signed-out menu has no Feed', async ({ page }) => {
      await mockCassetteApp(page);

      await page.goto('/explore');
      await page.getByRole('button', { name: 'Open menu' }).click();
      await expect(page.getByRole('region', { name: 'Browse' }).getByRole('link')).toHaveText(['Home', 'Explore', 'Promote']);
    });

    test('the Feed fits the screen', async ({ page }) => {
      await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

      await page.goto('/feed');
      await expect(page.getByRole('link', { name: /Feed track 1/ })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Members only' })).toBeInViewport();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });

    test('the join state fits the screen', async ({ page }) => {
      await mockCassetteApp(page, {
        currentUser: fixtureUsers.viewer,
        exploreCurators: [featuredCurator('first', 0), featuredCurator('second', 1), featuredCurator('third', 2)],
      });

      await page.goto('/feed');
      await expect(page.getByRole('list', { name: 'Featured curators' }).getByRole('link')).toHaveCount(3);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test('the filter and paging work from the keyboard', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.member, curatorFeed: memberFeed });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(2);
    await page.getByRole('button', { name: 'Load more' }).focus();
    await page.keyboard.press('Enter');
    await expect(postLinks(page)).toHaveCount(3);

    await page.getByRole('radio', { name: 'All' }).focus();
    await expect(page.getByRole('radio', { name: 'All' })).toBeFocused();
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL('/feed?filter=members');
    await expect(page.getByRole('radio', { name: 'Members only' })).toBeChecked();
    await expect(page.getByRole('radiogroup', { name: 'Post filter' })).toBeVisible();
  });
});

test.describe('followed curators', () => {
  test('a Follow-only viewer waits for the session, then gets the skeleton and posts without a paid membership', async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, {
      currentUser: { ...follower, feedCuratorCount: 1 },
      curatorFeed: () => ({ body: feedPage([feedPost(4, 'public', CRATE.username)], null, 0, 1) }),
    });
    const releaseSession = await holdRoute(page, isSession, () => true);
    const releaseFeed = await holdRoute(page, isFeed, () => true);

    await page.goto('/feed');
    await page.waitForTimeout(500);
    await expect(skeleton(page)).toHaveCount(0);
    expect(curatorFeedRequests).toEqual([]);

    releaseSession();
    await expect(skeleton(page)).toBeVisible();
    await expect.poll(() => curatorFeedRequests.length).toBe(1);
    releaseFeed();

    await expect(postLinks(page)).toHaveText([/Feed track 4/]);
    await expect(page.getByRole('radiogroup', { name: 'Post filter' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
  });

  test('a paid count above the source count is a session error, not the join state or a request', async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.viewer, activeMembershipCount: 1, feedCuratorCount: 0 },
      curatorFeed: memberFeed,
    });

    await page.goto('/feed');

    await expect(page.getByText('Could not check your account')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
    await expect(page.getByRole('radio', { name: 'Members only' })).toHaveCount(0);
    await expect(skeleton(page)).toHaveCount(0);
    await page.waitForTimeout(300);
    expect(curatorFeedRequests).toEqual([]);
  });

  test('locked rows show the curator, the time, and availability, but nothing from the post', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: follower,
      membershipStatus: fixtureNoMembershipStatus,
      curatorFeed: () => ({
        body: feedPage([
          feedPost(1, 'public', CRATE.username),
          lockedPost(2, CRATE.id, CRATE.username, 'Crate Keeper'),
          lockedPost(3, QUIET.id, QUIET.username),
          lockedPost(4, CRATE.id, CRATE.username, 'Crate Keeper'),
        ], null, 0, 2),
      }),
    });

    await page.goto('/feed');

    await expect.poll(() => rowOrder(page)).toEqual([
      'Feed track 1',
      `locked:@${CRATE.username}`,
      `locked:@${QUIET.username}`,
      `locked:@${CRATE.username}`,
    ]);
    const crate = lockedCards(page).first();
    await expect(crate).toHaveAccessibleName('Members-only post from Crate Keeper');
    await expect(crate.getByRole('heading', { name: 'Members-only post' })).toBeVisible();
    await expect(crate).toContainText("For Crate Keeper's members.");
    await expect(crate.getByRole('link', { name: 'Join Crate Keeper' })).toHaveAttribute(
      'href',
      `/profile/${CRATE.username}#membership-offer`,
    );
    await expect(crate.getByRole('link', { name: `@${CRATE.username}`, exact: true })).toHaveAttribute('href', `/profile/${CRATE.username}`);

    const quiet = lockedCards(page).nth(1);
    await expect(quiet).toContainText(`${QUIET.username} is not taking new members right now.`);
    await expect(quiet.getByRole('link', { name: `View profile ${QUIET.username}` })).toHaveAttribute('href', `/profile/${QUIET.username}`);
    await expect(quiet.getByRole('link', { name: /Join/ })).toHaveCount(0);

    await expect(lockedCards(page).locator('a[href^="/post/"]')).toHaveCount(0);
    await expect(lockedCards(page).locator('img')).toHaveCount(0);
    await expect(lockedCards(page).getByRole('button')).toHaveCount(0);
    expect([...state.membershipStatusRequests].sort()).toEqual([CRATE.id, QUIET.id].sort());
    expect(state.membershipCheckoutRequests).toEqual([]);
  });

  test('a locked row whose membership read fails offers the profile only', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: follower,
      curatorFeed: () => ({ body: feedPage([lockedPost(2, CRATE.id, CRATE.username, 'Crate Keeper')], null, 0, 2) }),
    });
    await page.route('**/api/v1/memberships/status/**', (route) => route.fulfill({ status: 503, body: 'unavailable' }));

    await page.goto('/feed');

    const card = lockedCards(page);
    await expect(card.getByRole('link', { name: 'View profile Crate Keeper' })).toBeVisible();
    await expect(card).toContainText("For Crate Keeper's members.");
    await expect(card.getByRole('link', { name: /Join/ })).toHaveCount(0);
  });

  test('a locked row with any extra field is a load error, never a card', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: follower,
      curatorFeed: () => ({
        body: feedPage([{ ...lockedPost(2, CRATE.id, CRATE.username), imageUrl: null }], null, 0, 2),
      }),
    });

    await page.goto('/feed');

    await expect(page.getByText('Posts could not load')).toBeVisible({ timeout: 15_000 });
    await expect(lockedCards(page)).toHaveCount(0);
    await expect(page.getByText('No posts yet')).toHaveCount(0);
  });

  test('paging keeps one server order across full and locked rows; Members only asks for member posts', async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    await mockCassetteApp(page, {
      currentUser: { ...fixtureUsers.member, activeMembershipCount: 1, feedCuratorCount: 2 },
      membershipStatus: fixtureNoMembershipStatus,
      curatorFeed: ({ cursor, membersOnly }) => {
        if (membersOnly) return { body: feedPage([feedPost(5, 'subscriber', 'night-curator')], null, 1, 2) };
        return cursor === null
          ? { body: feedPage([feedPost(1, 'subscriber', 'night-curator'), lockedPost(2, CRATE.id, CRATE.username)], 'cursor-2', 1, 2) }
          : { body: feedPage([lockedPost(3, CRATE.id, CRATE.username), feedPost(4, 'public', 'night-curator')], null, 1, 2) };
      },
    });

    await page.goto('/feed');
    await expect.poll(() => rowOrder(page)).toEqual(['Feed track 1', `locked:@${CRATE.username}`]);
    await page.getByRole('button', { name: 'Load more' }).click();
    await expect.poll(() => rowOrder(page)).toEqual([
      'Feed track 1',
      `locked:@${CRATE.username}`,
      `locked:@${CRATE.username}`,
      'Feed track 4',
    ]);
    expect(cursors(curatorFeedRequests)).toEqual([null, 'cursor-2']);

    await page.getByRole('radio', { name: 'Members only' }).click();
    await expect.poll(() => rowOrder(page)).toEqual(['Feed track 5']);
    await expect(lockedCards(page)).toHaveCount(0);
    expect(new URL(curatorFeedRequests.at(-1)!.url()).searchParams.get('membersOnly')).toBe('true');
  });

  test('a Follow restarts both Feed filters even when the counts stay the same', async ({ page }) => {
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    const sessionRequests = trackRequests(page, SESSION_PATH);
    let version = 1;
    const { state } = await mockCassetteApp(page, {
      currentUser: { ...follower, feedCuratorCount: 1 },
      curatorPage: fixtureFreeCuratorPage,
      curatorFeed: () => ({
        body: feedPage([feedPost(version, 'public', 'night-curator'), lockedPost(9, CRATE.id, CRATE.username)], null, 0, 1),
      }),
    });
    await page.route('**/api/auth/session', (route) => route.fulfill({
      json: {
        success: true,
        authenticated: true,
        user: { userId: fixtureUsers.viewer.id, username: fixtureUsers.viewer.username, isOnboarded: true },
        activeMembershipCount: 0,
        feedCuratorCount: 1,
      },
    }));

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveText([/Feed track 1/]);
    await lockedCards(page).getByRole('link', { name: `@${CRATE.username}` }).click();
    await expect(page).toHaveURL(new RegExp(`/profile/${CRATE.username}`));
    const readsBefore = sessionRequests.length;

    version = 2;
    await page.getByRole('button', { name: /^Follow/ }).filter({ visible: true }).click();
    await expect(page.getByText('Following', { exact: true }).filter({ visible: true })).toBeVisible();
    expect(state.curatorFollowRequests.filter(({ method }) => method === 'PUT')).toHaveLength(1);
    await expect.poll(() => sessionRequests.length).toBe(readsBefore + 1);

    await recordTextAppearance(page, 'Feed track 1');
    await page.goBack();
    await expect(postLinks(page)).toHaveText([/Feed track 2/]);
    await expect(page.locator('body')).not.toHaveAttribute('data-recorded-text-shown');
    expect(curatorFeedRequests).toHaveLength(2);
  });

  test('an Unfollow made elsewhere clears the Feed at the next visible boundary', async ({ page }) => {
    await page.clock.install();
    const curatorFeedRequests = trackRequests(page, FEED_PATH);
    const { state } = await mockCassetteApp(page, {
      currentUser: { ...follower, feedCuratorCount: 1 },
      curatorFeed: () => ({ body: feedPage([feedPost(1, 'public', 'night-curator')], null, 0, 1) }),
    });

    await page.goto('/feed');
    await expect(postLinks(page)).toHaveCount(1);

    state.currentUser!.feedCuratorCount = 0;
    await page.clock.fastForward('01:01');

    await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
    await expect(postLinks(page)).toHaveCount(0);
    expect(curatorFeedRequests).toHaveLength(1);
  });

  test('Join on a locked row opens the curator offer and never starts Checkout', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: follower,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
      curatorFeed: () => ({ body: feedPage([lockedPost(2, CRATE.id, CRATE.username, 'Crate Keeper')], null, 0, 2) }),
    });

    await page.goto('/feed');
    await lockedCards(page).getByRole('link', { name: 'Join Crate Keeper' }).click();

    await expect(page).toHaveURL(`/profile/${CRATE.username}#membership-offer`);
    const offer = page.locator('#membership-offer');
    await expect(offer).toBeVisible();
    await expect(offer.getByRole('button', { name: 'Join Crate Keeper' })).toBeVisible();
    await page.waitForTimeout(300);
    expect(state.membershipCheckoutRequests).toEqual([]);
  });

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 390, height: 844 } });

    test('Join on a locked row brings the offer below the posts into view', async ({ page }) => {
      const [publicItem] = fixtureFreeCuratorPage.posts.items;
      const items = Array.from({ length: 6 }, (_, index) => (publicItem.kind === 'post'
        ? { kind: 'post' as const, post: { ...publicItem.post, postId: `post-public-${index}`, redirectPostId: `post-public-${index}` } }
        : publicItem));
      const { state } = await mockCassetteApp(page, {
        currentUser: follower,
        curatorPage: { ...fixtureCuratorPage, posts: { ...fixtureCuratorPage.posts, items, totalItems: items.length } },
        membershipStatus: fixtureNoMembershipStatus,
        curatorFeed: () => ({ body: feedPage([lockedPost(2, CRATE.id, CRATE.username, 'Crate Keeper')], null, 0, 2) }),
      });

      await page.goto('/feed');
      await lockedCards(page).getByRole('link', { name: 'Join Crate Keeper' }).click();
      await expect(page).toHaveURL(`/profile/${CRATE.username}#membership-offer`);

      const offer = page.locator('#membership-offer');
      await expect(offer.getByRole('button', { name: 'Join Crate Keeper' })).toBeVisible();
      await expect.poll(() => offer.evaluate((element) => Math.round(element.getBoundingClientRect().top))).toBeLessThan(844 / 2);
      expect(await offer.evaluate((element) => element.getBoundingClientRect().top)).toBeGreaterThan(-80);
      expect(state.membershipCheckoutRequests).toEqual([]);
    });

    test('mixed rows fit the screen', async ({ page }) => {
      await mockCassetteApp(page, {
        currentUser: follower,
        membershipStatus: fixtureNoMembershipStatus,
        curatorFeed: () => ({
          body: feedPage([
            feedPost(1, 'public', CRATE.username),
            lockedPost(2, CRATE.id, CRATE.username, 'A curator with a very long display name for a small card'),
          ], null, 0, 2),
        }),
      });

      await page.goto('/feed');
      await expect(lockedCards(page).getByRole('link', { name: /Join/ })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  });

  test('locked row links work from the keyboard', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: follower,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
      curatorFeed: () => ({ body: feedPage([lockedPost(2, CRATE.id, CRATE.username, 'Crate Keeper')], null, 0, 2) }),
    });

    await page.goto('/feed');
    const profileLink = lockedCards(page).getByRole('link', { name: `@${CRATE.username}` });
    await profileLink.focus();
    await page.keyboard.press('Tab');
    await expect(lockedCards(page).getByRole('link', { name: 'Join Crate Keeper' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(`/profile/${CRATE.username}#membership-offer`);
  });
});
