/** Covers private Follow on curator profiles: one action each way, failure and retry, membership, ownership, and signed-out return. */

import { expect, type Page, test } from '@playwright/test';

import {
  fixtureActiveMembershipStatus,
  fixtureCanceledMembershipStatus,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureIncompleteMembershipStatus,
  fixtureMemberCuratorPage,
  fixtureNoMembershipStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const CURATOR_ID = fixtureCuratorPage.curator.id;
const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const NAME = fixtureCuratorPage.curator.displayName!;
const INTENT_KEY = `cassette:follow-intent:${CURATOR_ID}`;
const CHECKOUT_URL = 'https://checkout.stripe.test/membership-session';
const PORTAL_URL = 'https://billing.stripe.test/membership-session';

// Exact names: "Follow Crate Keeper" is also a substring of "Unfollow Crate Keeper".
const followButton = (page: Page) => page.getByRole('button', { name: `Follow ${NAME}`, exact: true }).filter({ visible: true });
const unfollowButton = (page: Page) => page.getByRole('button', { name: `Unfollow ${NAME}`, exact: true }).filter({ visible: true });
const following = (page: Page) => page.getByText('Following', { exact: true }).filter({ visible: true });
const anyFollowControl = (page: Page) => page.getByTestId('curator-follow');

/** Every browser request to `pathname`. */
function trackRequests(page: Page, pathname: string) {
  const urls: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === pathname) urls.push(request.method());
  });
  return urls;
}

/** Holds matching requests while `hold()` is true at arrival, until `release` is called. */
async function holdFollowRoute(page: Page, method: string, hold: () => boolean) {
  let release = () => {};
  const released = new Promise<void>((resolve) => { release = resolve; });
  await page.route(`**/api/v1/curators/${CURATOR_ID}/follow`, async (route) => {
    if (route.request().method() === method && hold()) await released;
    await route.fallback().catch(() => {});
  });
  return () => release();
}

async function returnFromProvider(page: Page, providerUrl: string, returnPath: string) {
  const appOrigin = new URL(page.url()).origin;
  await page.route(providerUrl, (route) => route.fulfill({
    status: 302,
    headers: { location: `${appOrigin}${returnPath}` },
  }));
}

const writes = (state: { curatorFollowRequests: Array<{ method: string }> }) =>
  state.curatorFollowRequests.filter(({ method }) => method !== 'GET').map(({ method }) => method);

test('Follow sits quietly under Join, takes one action each way, and refreshes the session', async ({ page }) => {
  const sessionReads = trackRequests(page, '/api/auth/session');
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
  });
  let holdWrites = false;
  const releaseWrite = await holdFollowRoute(page, 'PUT', () => holdWrites);

  await page.goto(CURATOR_PATH);
  const card = page.locator('[data-testid="curator-membership-card"]:visible');
  // Join is the first and primary action; Follow comes after it.
  await expect(card.getByRole('button')).toHaveText([`Join ${NAME}`, `Follow ${NAME}`]);
  const readsBefore = sessionReads.length;

  holdWrites = true;
  await followButton(page).click();
  await expect(followButton(page)).toBeDisabled();
  await followButton(page).click({ force: true });
  await page.keyboard.press('Enter');
  releaseWrite();

  await expect(following(page)).toBeVisible();
  await expect(unfollowButton(page)).toBeEnabled();
  expect(writes(state)).toEqual(['PUT']);
  await expect.poll(() => sessionReads.length).toBe(readsBefore + 1);

  await unfollowButton(page).click();
  await expect(followButton(page)).toBeVisible();
  await expect(following(page)).toHaveCount(0);
  expect(writes(state)).toEqual(['PUT', 'DELETE']);
  await expect.poll(() => sessionReads.length).toBe(readsBefore + 2);
});

test('a failed Follow keeps the confirmed state, reads it again, and can be retried', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
    curatorFollowWriteFailures: 1,
  });

  await page.goto(CURATOR_PATH);
  await expect(followButton(page)).toBeVisible();
  const readsBefore = state.curatorFollowRequests.filter(({ method }) => method === 'GET').length;
  await followButton(page).click();

  await expect(page.getByRole('alert').filter({ hasText: 'Could not follow. Try again.' })).toBeVisible();
  await expect(following(page)).toHaveCount(0);
  await expect(followButton(page)).toBeEnabled();
  await expect.poll(() => state.curatorFollowRequests.filter(({ method }) => method === 'GET').length)
    .toBeGreaterThan(readsBefore);

  await followButton(page).click();
  await expect(following(page)).toBeVisible();
  await expect(page.getByText('Could not follow. Try again.')).toHaveCount(0);
  expect(writes(state)).toEqual(['PUT', 'PUT']);
});

test('a relationship read failure offers a retry, never a guessed button', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureCuratorPage,
    membershipStatus: fixtureNoMembershipStatus,
    // The first read and its one automatic retry fail.
    curatorFollowReadFailures: 2,
  });

  await page.goto(CURATOR_PATH);

  const control = anyFollowControl(page).filter({ visible: true });
  await expect(control).toContainText('Follow status is unavailable.', { timeout: 15_000 });
  await expect(followButton(page)).toHaveCount(0);
  await control.getByRole('button', { name: 'Try again' }).click();
  await expect(followButton(page)).toBeVisible();
});

for (const [curatorPage, label] of [
  [fixtureMemberCuratorPage, 'with'],
  [fixtureCuratorPage, 'without'],
] as const) {
  test(`an active member sees no Follow when the plan is ${label} member posts`, async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorPage,
      membershipStatus: fixtureActiveMembershipStatus,
      curatorFollows: [CURATOR_ID],
    });

    await page.goto(CURATOR_PATH);
    await expect(page.locator('[data-testid="curator-membership-card"]:visible')).toBeVisible();
    await expect.poll(() => state.curatorFollowRequests.length).toBeGreaterThan(0);
    await page.waitForTimeout(300);
    await expect(anyFollowControl(page)).toHaveCount(0);
  });
}

test('the curator sees no Follow on their own page and reads no relationship', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.playlistCurator,
    curatorPage: { ...fixtureCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
  });

  await page.goto(CURATOR_PATH);
  await expect(page.getByTestId('profile-owner-bar')).toBeVisible();
  await page.getByRole('tab', { name: /Playlists/ }).click();
  await page.waitForTimeout(300);

  await expect(anyFollowControl(page)).toHaveCount(0);
  expect(state.curatorFollowRequests).toEqual([]);
});

test('a curator without a paid plan can be followed from the profile pass on every tab', async ({ page }) => {
  const { state } = await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureFreeCuratorPage,
  });

  await page.goto(CURATOR_PATH);
  const pass = page.getByTestId('profile-identity-pass').filter({ visible: true });
  await expect(pass.getByRole('button', { name: `Follow ${NAME}`, exact: true })).toBeVisible();
  await expect(page.getByTestId('curator-membership-card')).toHaveCount(0);

  await page.getByRole('tab', { name: /Playlists/ }).click();
  await pass.getByRole('button', { name: `Follow ${NAME}`, exact: true }).click();
  await expect(pass.getByText('Following', { exact: true })).toBeVisible();
  expect(writes(state)).toEqual(['PUT']);
  await expect(followButton(page)).toHaveCount(0);
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Follow lives in the profile header, once, on the Posts tab and the music tabs', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(CURATOR_PATH);
    await expect(page.locator('[data-testid="curator-membership-card"]:visible')).toBeVisible();
    await expect(followButton(page)).toHaveCount(1);
    await expect(page.locator('header').filter({ has: followButton(page) })).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);

    await page.getByRole('tab', { name: /Playlists/ }).click();
    await expect(followButton(page)).toHaveCount(1);
    await followButton(page).click();
    await expect(following(page)).toHaveCount(1);
    await expect(unfollowButton(page)).toHaveCount(1);
    expect(writes(state)).toEqual(['PUT']);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
});

test('Follow and Unfollow work from the keyboard and keep focus on the control', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.viewer,
    curatorPage: fixtureFreeCuratorPage,
  });

  await page.goto(CURATOR_PATH);
  await followButton(page).focus();
  await page.keyboard.press('Enter');
  await expect(unfollowButton(page)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(followButton(page)).toBeFocused();
});

test.describe('signed-out Follow', () => {
  test('returns through sign-in and follows once, with this tab\'s own intent', async ({ page }) => {
    const { state } = await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });

    await page.goto(`${CURATOR_PATH}?tab=playlists`);
    await followButton(page).click();

    const returnPath = `${CURATOR_PATH}?tab=playlists&follow=1`;
    await expect(page).toHaveURL(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
    expect(Number(await page.evaluate((key) => sessionStorage.getItem(key), INTENT_KEY))).toBeGreaterThan(0);
    expect(writes(state)).toEqual([]);

    // Signing in returns to the validated redirect in the same tab.
    state.currentUser = { ...fixtureUsers.viewer };
    await page.goto(returnPath);

    await expect(following(page)).toBeVisible();
    expect(writes(state)).toEqual(['PUT']);
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=playlists`);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), INTENT_KEY)).toBeNull();
    await page.reload();
    await expect(following(page)).toBeVisible();
    expect(writes(state)).toEqual(['PUT']);
  });

  test('a crafted or stale return without a fresh intent follows nobody', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(`${CURATOR_PATH}?tab=posts&follow=1`);
    await expect(followButton(page)).toBeVisible();
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=posts`);

    // An intent older than its lifetime counts for nothing.
    await page.evaluate((key) => sessionStorage.setItem(key, String(Date.now() - 11 * 60 * 1_000)), INTENT_KEY);
    await page.goto(`${CURATOR_PATH}?tab=posts&follow=1`);
    await expect(followButton(page)).toBeVisible();
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=posts`);
    await page.waitForTimeout(300);
    expect(writes(state)).toEqual([]);
    // A Join intent is a different consent and never starts a Follow either.
    expect(state.membershipCheckoutRequests).toEqual([]);
  });

  test('an account check that fails on return keeps the intent until it succeeds', async ({ page }) => {
    const { state } = await mockCassetteApp(page, { curatorPage: fixtureCuratorPage, membershipStatus: fixtureNoMembershipStatus });
    await page.goto(CURATOR_PATH);
    await followButton(page).click();
    await expect(page).toHaveURL(/\/auth\/signin/);

    state.currentUser = { ...fixtureUsers.viewer };
    let available = false;
    await page.route('**/api/auth/session', (route) =>
      available ? route.fallback() : route.fulfill({ status: 503, body: 'unavailable' }));
    await page.goto(`${CURATOR_PATH}?tab=posts&follow=1`);
    await page.waitForTimeout(500);
    expect(writes(state)).toEqual([]);
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=posts&follow=1`);
    expect(await page.evaluate((key) => sessionStorage.getItem(key), INTENT_KEY)).not.toBeNull();

    available = true;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(following(page)).toBeVisible();
    expect(writes(state)).toEqual(['PUT']);
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=posts`);
  });
});

test.describe('membership changes', () => {
  test('a confirmed Join hides Follow by the relationship, not the member-posts flag, and keeps the earlier Follow', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      // The plan gives no member posts, so the page still treats the viewer as a nonmember.
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
      membershipPollSequence: [fixtureIncompleteMembershipStatus, fixtureActiveMembershipStatus],
      curatorFollows: [CURATOR_ID],
    });

    await page.goto(CURATOR_PATH);
    await expect(following(page)).toBeVisible();
    await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?membership=return`);
    await page.getByTestId('membership-join').filter({ visible: true }).click();

    await expect(page.getByTestId('membership-notice')).toHaveText('Your membership is active.');
    await expect(anyFollowControl(page)).toHaveCount(0);
    expect(writes(state)).toEqual([]);
    expect(state.curatorFollows.has(CURATOR_ID)).toBe(true);
  });

  for (const explicit of [true, false]) {
    test(`a confirmed end of membership ${explicit ? 'shows the earlier Follow again' : 'offers Follow without creating one'}`, async ({ page }) => {
      const { state } = await mockCassetteApp(page, {
        currentUser: fixtureUsers.member,
        curatorPage: fixtureCuratorPage,
        membershipStatus: fixtureActiveMembershipStatus,
        membershipPollSequence: [fixtureCanceledMembershipStatus],
        curatorFollows: explicit ? [CURATOR_ID] : [],
      });

      await page.goto(CURATOR_PATH);
      await expect(page.getByTestId('membership-manage').filter({ visible: true })).toBeVisible();
      await expect(anyFollowControl(page)).toHaveCount(0);
      await returnFromProvider(page, PORTAL_URL, `${CURATOR_PATH}?membership=portal-return`);
      await page.getByTestId('membership-manage').filter({ visible: true }).click();

      if (explicit) {
        await expect(following(page)).toBeVisible();
      } else {
        await expect(followButton(page)).toBeVisible();
        await expect(following(page)).toHaveCount(0);
      }
      expect(writes(state)).toEqual([]);
    });
  }
});

test.describe('stale answers', () => {
  test('a Follow that completes after another account signs in changes nothing for that account', async ({ page }) => {
    await page.clock.install();
    const sessionReads = trackRequests(page, '/api/auth/session');
    const followRequests = trackRequests(page, `/api/v1/curators/${CURATOR_ID}/follow`);
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureFreeCuratorPage,
      users: [fixtureUsers.member],
    });
    let releaseWrite = () => {};
    const released = new Promise<void>((resolve) => { releaseWrite = resolve; });
    await page.route(`**/api/v1/curators/${CURATOR_ID}/follow`, async (route) => {
      if (route.request().method() !== 'PUT') return route.fallback();
      await released;
      // Bridge followed for the earlier account; its answer arrives late.
      await route.fulfill({ json: { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false } }).catch(() => {});
    });

    await page.goto(CURATOR_PATH);
    await followButton(page).click();
    await expect.poll(() => followRequests).toContain('PUT');

    // Another account becomes current before the earlier account's Follow answers.
    state.currentUser = { ...fixtureUsers.member };
    await page.clock.fastForward('01:01');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(page.locator('[data-sidebar="content"]').getByText(`@${fixtureUsers.member.username}`)).toBeVisible();
    const readsAfterSwitch = sessionReads.length;

    releaseWrite();
    await page.waitForTimeout(500);
    await expect(followButton(page)).toBeVisible();
    await expect(following(page)).toHaveCount(0);
    expect(sessionReads.length).toBe(readsAfterSwitch);
  });

  test('a relationship read for the earlier account never shows for the next one', async ({ page }) => {
    await page.clock.install();
    const followRequests = trackRequests(page, `/api/v1/curators/${CURATOR_ID}/follow`);
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureFreeCuratorPage,
      users: [fixtureUsers.member],
      curatorFollows: [CURATOR_ID],
    });
    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    let staleAnswers = 1;
    await page.route(`**/api/v1/curators/${CURATOR_ID}/follow`, async (route) => {
      if (staleAnswers === 0) return route.fallback();
      staleAnswers -= 1;
      await released;
      // The earlier account follows this curator; its answer arrives late.
      await route.fulfill({ json: { isFollowing: true, hasExplicitFollow: true, hasActiveMembership: false } }).catch(() => {});
    });

    await page.goto(CURATOR_PATH);
    await expect.poll(() => followRequests.length).toBe(1);

    // Another account, which follows nobody, becomes current while that read is open.
    state.currentUser = { ...fixtureUsers.member };
    state.curatorFollows.clear();
    await page.clock.fastForward('01:01');
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await expect(followButton(page)).toBeVisible();

    release();
    await page.waitForTimeout(500);
    await expect(followButton(page)).toBeVisible();
    await expect(following(page)).toHaveCount(0);
  });

  for (const action of ['Follow', 'Unfollow'] as const) {
    for (const readStarts of ['before', 'during'] as const) {
      test(`a relationship read that starts ${readStarts} ${action === 'Follow' ? 'a Follow' : 'an Unfollow'} never replaces its confirmed answer`, async ({ page }) => {
        const followed = action === 'Unfollow';
        const sessionReads = trackRequests(page, '/api/auth/session');
        const feedReads = trackRequests(page, '/api/v1/social/feed/posts');
        const { state } = await mockCassetteApp(page, {
          currentUser: { ...fixtureUsers.viewer, feedCuratorCount: followed ? 1 : 0 },
          curatorPage: fixtureFreeCuratorPage,
          curatorFollows: followed ? [CURATOR_ID] : [],
        });
        const releaseWrite = await holdFollowRoute(page, followed ? 'DELETE' : 'PUT', () => readStarts === 'during');
        let holdRead = false;
        let readArrived = false;
        let releaseRead = () => {};
        const readReleased = new Promise<void>((resolve) => { releaseRead = resolve; });
        let readHandled = () => {};
        const readDone = new Promise<void>((resolve) => { readHandled = resolve; });
        await page.route(`**/api/v1/curators/${CURATOR_ID}/follow`, async (route) => {
          if (route.request().method() !== 'GET' || !holdRead) return route.fallback();
          holdRead = false;
          readArrived = true;
          // Bridge answers with the relationship as it stood when the read arrived.
          const stood = state.curatorFollows.has(CURATOR_ID);
          await readReleased;
          await route.fulfill({ json: { isFollowing: stood, hasExplicitFollow: stood, hasActiveMembership: false } }).catch(() => {});
          readHandled();
        });
        const startRead = async () => {
          holdRead = true;
          // A return to the tab reads the same relationship again in the background.
          await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange', { bubbles: true })));
          await expect.poll(() => readArrived).toBe(true);
        };

        await page.goto(CURATOR_PATH);
        const control = followed ? unfollowButton(page) : followButton(page);
        const confirmed = followed ? followButton(page) : unfollowButton(page);
        await expect(control).toBeEnabled();
        const readsBefore = sessionReads.length;

        if (readStarts === 'before') await startRead();
        await control.click();
        if (readStarts === 'during') {
          await expect(control).toBeDisabled();
          await startRead();
          releaseWrite();
        }
        await expect(confirmed).toBeEnabled();
        await expect.poll(() => sessionReads.length).toBe(readsBefore + 1);

        // The earlier answer arrives after the confirmed one.
        releaseRead();
        await readDone;
        await page.waitForTimeout(500);
        await expect(confirmed).toBeEnabled();
        await expect(following(page)).toHaveCount(followed ? 0 : 1);
        expect(writes(state)).toEqual([followed ? 'DELETE' : 'PUT']);
        expect(sessionReads.length).toBe(readsBefore + 1);

        // The Feed opens from the confirmed sources.
        await page.locator('[data-sidebar="menu"]').getByRole('link', { name: 'Feed' }).click();
        if (followed) {
          await expect(page.getByRole('heading', { name: 'Join a curator' })).toBeVisible();
          expect(feedReads).toEqual([]);
        } else {
          await expect.poll(() => feedReads.length).toBe(1);
          await expect(page.getByRole('heading', { name: 'Join a curator' })).toHaveCount(0);
        }
      });
    }
  }
});

test('the built server routes Follow writes through the origin check and refuses other methods', async ({ request, baseURL }) => {
  const followPath = `/api/v1/curators/${CURATOR_ID}/follow`;

  // Cross-origin writes stop at the origin check; nothing is forwarded.
  for (const method of ['PUT', 'DELETE'] as const) {
    const refused = await request.fetch(followPath, { method, headers: { origin: 'https://evil.example' } });
    expect(refused.status(), method).toBe(403);
  }
  // A same-origin write passes the check and then meets the Playwright proxy guard, never Bridge.
  const allowed = await request.fetch(followPath, { method: 'PUT', headers: { origin: baseURL! } });
  expect(allowed.status()).toBe(503);
  // Other methods get no handler here, and never fall through to the generic proxy.
  for (const method of ['POST', 'PATCH'] as const) {
    const unsupported = await request.fetch(followPath, { method, headers: { origin: baseURL! } });
    expect(unsupported.status(), method).toBe(405);
  }
  // A sibling curator path still reaches the generic proxy.
  expect((await request.get(`/api/v1/curators/${fixtureCuratorPage.curator.username}/page`)).status()).toBe(503);
});

test('the built server refuses cross-origin writes under every Follow path spelling the generic proxy receives', async ({ request, baseURL }) => {
  // The scoped Follow route matches case-sensitively and never sees an encoded slash.
  const aliases = [
    `/api/v1/Curators/${CURATOR_ID}/follow`,
    `/api/v1/curators/${CURATOR_ID}/Follow`,
    `/api/v1/curators%2F${CURATOR_ID}%2Ffollow`,
  ];
  for (const path of aliases) {
    for (const method of ['PUT', 'DELETE'] as const) {
      expect.soft((await request.fetch(path, { method, headers: { origin: 'https://evil.example' } })).status(), `${method} ${path}`).toBe(403);
      expect.soft((await request.fetch(path, { method })).status(), `${method} ${path} without an origin`).toBe(403);
      // A same-origin write passes the check and then meets the Playwright proxy guard, never Bridge.
      expect.soft((await request.fetch(path, { method, headers: { origin: baseURL! } })).status(), `${method} ${path} same origin`).toBe(503);
    }
  }
  // Any other write through the generic proxy takes the same check.
  expect.soft((await request.post('/api/v1/social/posts', { headers: { origin: 'https://evil.example' } })).status()).toBe(403);
  expect.soft((await request.post('/api/v1/social/posts', { headers: { origin: baseURL! } })).status()).toBe(503);
});
