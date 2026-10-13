/** Covers sign-in inside social apps' embedded browsers, where Google refuses OAuth: the one
    open-in-browser step, and the Follow or Join intent that the link carries to the device browser. */

import { expect, type Page, test } from '@playwright/test';

import {
  fixtureCuratorPage,
  fixtureNoMembershipStatus,
  fixturePosts,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const CURATOR_ID = fixtureCuratorPage.curator.id;
const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const NAME = fixtureCuratorPage.curator.displayName!;
const FOLLOW_INTENT_KEY = `cassette:follow-intent:${CURATOR_ID}`;
const PLAN_ID = fixtureCuratorPage.membership!.planId;
const CHECKOUT_URL = 'https://checkout.stripe.test/membership-session';

const INSTAGRAM_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 337.0.3.23.54 (iPhone15,3; iOS 17_5; en_US; en; scale=3.00; 1290x2796; 615089063; IABMV/1)';
const TIKTOK_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP2A.240805.005; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/127.0.6533.103 Mobile Safari/537.36 trill_350504 JsSdk/1.0 NetType/WIFI Channel/googleplay AppName/musical_ly app_version/35.5.4 BytedanceWebview/d8a21c6';
const SAFARI_IOS =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const PHONE = { width: 390, height: 844 };

const followButton = (page: Page) => page.getByRole('button', { name: `Follow ${NAME}`, exact: true }).filter({ visible: true });
const googleButton = (page: Page) => page.getByRole('button', { name: 'Continue with Google' });
const inAppStep = (page: Page) => page.getByTestId('in-app-browser-sign-in').filter({ visible: true });
const confirmation = (page: Page) => page.getByTestId('carried-action-confirmation');

/** Records the last clipboard write on the document instead of touching the system clipboard. */
async function recordClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (text: string) => { document.documentElement.dataset.copied = text; } },
    });
  });
  return () => page.locator('html').getAttribute('data-copied');
}

const writes = (state: { curatorFollowRequests: Array<{ method: string }> }) =>
  state.curatorFollowRequests.filter(({ method }) => method !== 'GET').map(({ method }) => method);

test.describe('inside the Instagram browser on iPhone', () => {
  test.use({ userAgent: INSTAGRAM_IOS, viewport: PHONE });

  test('Follow leads to one open-in-browser step whose link carries the Follow', async ({ page }) => {
    const copied = await recordClipboard(page);
    const googleInits: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/auth/google/init') googleInits.push(request.url());
    });
    const { state } = await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });

    await page.goto(`${CURATOR_PATH}?type=playlists`);
    await followButton(page).click();

    await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
    await expect(inAppStep(page)).toBeVisible();
    await expect(inAppStep(page).getByRole('heading', { name: 'Open in your browser to sign in' })).toBeVisible();
    await expect(inAppStep(page)).toContainText('In Instagram, tap •••');
    await expect(googleButton(page)).toHaveCount(0);
    // iOS has no documented way to open the browser, so copying the link is the one action.
    await expect(inAppStep(page).getByRole('link', { name: 'Open in browser' })).toHaveCount(0);

    await inAppStep(page).getByRole('button', { name: 'Copy link' }).click();
    const origin = new URL(page.url()).origin;
    expect(await copied()).toBe(`${origin}${CURATOR_PATH}?type=playlists&intent=follow`);
    await expect(page.getByText('Link copied. Paste it in your browser.')).toBeVisible();
    expect(googleInits).toEqual([]);
    expect(writes(state)).toEqual([]);
  });

  test('the sign-in prompt sheet offers the same step and returns to the page through sign-in', async ({ page }) => {
    const copied = await recordClipboard(page);
    await mockCassetteApp(page, { posts: [fixturePosts.publicTrack] });

    await page.goto('/post/post-public-track');
    await page.getByRole('button', { name: 'Like post' }).click();

    await expect(page.getByRole('heading', { name: 'Sign in to like posts' })).toBeVisible();
    await expect(page.getByTestId('auth-prompt-signup')).toHaveCount(0);
    await inAppStep(page).getByRole('button', { name: 'Copy link' }).click();
    const origin = new URL(page.url()).origin;
    expect(await copied()).toBe(`${origin}/auth/signin?redirect=${encodeURIComponent('/post/post-public-track')}`);
  });
});

test.describe('inside the TikTok browser on Android', () => {
  test.use({ userAgent: TIKTOK_ANDROID, viewport: PHONE });

  test('Join leads to an intent link that opens the default browser with the Join', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(CURATOR_PATH);
    await page.getByTestId('membership-join').click();

    await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);
    await expect(googleButton(page)).toHaveCount(0);
    const { host, protocol } = new URL(page.url());
    await expect(inAppStep(page).getByRole('link', { name: 'Open in browser' })).toHaveAttribute(
      'href',
      `intent://${host}${CURATOR_PATH}?intent=join&interval=month#Intent;scheme=${protocol.slice(0, -1)};action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`,
    );
    await expect(inAppStep(page).getByRole('button', { name: 'Copy link' })).toBeVisible();
    await expect(inAppStep(page)).toContainText('In TikTok, tap ⋮');
    expect(state.membershipCheckoutRequests).toEqual([]);
  });
});

test.describe('in the device browser', () => {
  test.use({ userAgent: SAFARI_IOS, viewport: PHONE });

  test('the sign-in page keeps the Google button', async ({ page }) => {
    await mockCassetteApp(page, {});
    await page.goto('/auth/signin');
    await expect(googleButton(page)).toBeVisible();
    await expect(page.getByTestId('in-app-browser-sign-in')).toHaveCount(0);
  });

  test('a carried Follow, signed out, resumes through sign-in and follows once', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      curatorPage: fixtureCuratorPage,
      googleAuthUser: fixtureUsers.viewer,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(`${CURATOR_PATH}?type=playlists&intent=follow`);

    const returnPath = `${CURATOR_PATH}?type=playlists&follow=1`;
    await expect(page).toHaveURL(`/auth/signin?redirect=${encodeURIComponent(returnPath)}`);
    expect(Number(await page.evaluate((key) => sessionStorage.getItem(key), FOLLOW_INTENT_KEY))).toBeGreaterThan(0);
    expect(writes(state)).toEqual([]);

    await googleButton(page).click();
    await expect(page).toHaveURL(`${CURATOR_PATH}?type=playlists`);
    await expect(page.getByText('Following', { exact: true }).filter({ visible: true })).toBeVisible();
    expect(writes(state)).toEqual(['PUT']);
  });

  test('a carried Follow, signed in, waits for one tap and never follows from the link alone', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    await page.goto(`${CURATOR_PATH}?intent=follow`);
    await expect(confirmation(page)).toBeVisible();
    await expect(confirmation(page).getByRole('heading', { name: `Follow ${NAME}?` })).toBeVisible();
    await expect(page).toHaveURL(CURATOR_PATH);
    expect(writes(state)).toEqual([]);

    await confirmation(page).getByRole('button', { name: 'Not now' }).click();
    await expect(confirmation(page)).toHaveCount(0);
    // Keyboard focus returns to the page's own Follow control.
    await expect(followButton(page)).toBeFocused();
    // A later tab change rebuilds the query without the consumed intent.
    await page.getByRole('tab', { name: /Liked/ }).click();
    await expect(page).toHaveURL(`${CURATOR_PATH}?tab=liked`);
    await page.getByRole('tab', { name: 'Music' }).click();
    await expect(page).toHaveURL(CURATOR_PATH);
    await page.waitForTimeout(300);
    await expect(confirmation(page)).toHaveCount(0);
    await page.reload();
    await expect(followButton(page)).toBeVisible();
    await page.waitForTimeout(300);
    await expect(confirmation(page)).toHaveCount(0);
    expect(writes(state)).toEqual([]);

    await page.goto(`${CURATOR_PATH}?intent=follow`);
    await confirmation(page).getByRole('button', { name: 'Follow', exact: true }).click();
    await expect(page.getByText('Following', { exact: true }).filter({ visible: true })).toBeVisible();
    expect(writes(state)).toEqual(['PUT']);
  });

  test('a carried Join, signed out, resumes the existing sign-in flow into checkout once', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      curatorPage: fixtureCuratorPage,
      googleAuthUser: fixtureUsers.viewer,
      membershipStatus: fixtureNoMembershipStatus,
    });
    const joinIntentKey = `cassette:membership-join-intent:${PLAN_ID}:year`;

    await page.goto(`${CURATOR_PATH}?intent=join&interval=year`);
    await expect(page).toHaveURL(
      `/auth/signin?redirect=${encodeURIComponent(`${CURATOR_PATH}?membership=join&interval=year`)}`,
    );
    expect(Number(await page.evaluate((key) => sessionStorage.getItem(key), joinIntentKey))).toBeGreaterThan(0);
    expect(state.membershipCheckoutRequests).toEqual([]);

    // Stripe sends the fan back as if they canceled, so the page can be read again.
    const appOrigin = new URL(page.url()).origin;
    await page.route(CHECKOUT_URL, (route) => route.fulfill({
      status: 302,
      headers: { location: `${appOrigin}${CURATOR_PATH}?membership=canceled` },
    }));
    await googleButton(page).click();

    await expect.poll(() => state.membershipCheckoutRequests).toEqual([{ planId: PLAN_ID, interval: 'year' }]);
    await expect(page.getByTestId('membership-notice')).toHaveText('Checkout was canceled. You were not charged.');
    expect(await page.evaluate((key) => sessionStorage.getItem(key), joinIntentKey)).toBeNull();
  });

  test('a carried Join, signed in, starts checkout only after one tap', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });
    await page.route(CHECKOUT_URL, (route) => route.fulfill({ status: 200, body: 'checkout' }));

    await page.goto(`${CURATOR_PATH}?intent=join&interval=year`);
    await expect(confirmation(page)).toBeVisible();
    await expect(confirmation(page).getByRole('heading', { name: `Join ${NAME}?` })).toBeVisible();
    await expect(page).toHaveURL(CURATOR_PATH);
    await page.waitForTimeout(300);
    expect(state.membershipCheckoutRequests).toEqual([]);

    await confirmation(page).getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByTestId('membership-join')).toBeFocused();
    await page.getByRole('tab', { name: /Liked/ }).click();
    await page.getByRole('tab', { name: 'Music' }).click();
    await expect(page).toHaveURL(CURATOR_PATH);
    await page.waitForTimeout(300);
    await expect(confirmation(page)).toHaveCount(0);
    expect(state.membershipCheckoutRequests).toEqual([]);

    await page.goto(`${CURATOR_PATH}?intent=join&interval=year`);
    await confirmation(page).getByRole('button', { name: 'Continue to payment' }).click();
    await expect.poll(() => state.membershipCheckoutRequests).toEqual([{ planId: PLAN_ID, interval: 'year' }]);
  });

  test('a slow checkout that fails after the confirmation keeps keyboard focus on Join', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });
    let checkoutCalls = 0;
    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/v1/memberships/checkout', async (route) => {
      checkoutCalls += 1;
      await released;
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' });
    });

    await page.goto(`${CURATOR_PATH}?intent=join&interval=month`);
    await confirmation(page).getByRole('button', { name: 'Continue to payment' }).click();
    const join = page.getByTestId('membership-join');
    await expect(join).toHaveAttribute('aria-disabled', 'true');
    await expect(join).toBeFocused();
    // A second activation while checkout opens starts nothing more.
    await page.keyboard.press('Enter');

    release();
    await expect(page.getByText('We could not start secure Checkout. Try again.')).toBeVisible();
    await expect(join).toBeFocused();
    expect(checkoutCalls).toBe(1);
  });

  test('a crafted intent outside the allow-list does nothing', async ({ page }) => {
    const { state } = await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
    });

    for (const query of ['intent=unfollow', 'intent=join&interval=week', 'intent=follow&intent=join&interval=month']) {
      await page.goto(`${CURATOR_PATH}?${query}`);
      await expect(followButton(page)).toBeVisible();
      await page.waitForTimeout(300);
      await expect(confirmation(page)).toHaveCount(0);
    }
    expect(writes(state)).toEqual([]);
    expect(state.membershipCheckoutRequests).toEqual([]);
  });
});
