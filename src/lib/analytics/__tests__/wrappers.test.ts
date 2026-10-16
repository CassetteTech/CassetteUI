import test from 'node:test';
import assert from 'node:assert/strict';
import { captureClientEvent, identifyClientUser, resetAnalyticsContextForTests, surfaceFromRoute, trackBrowserPageview } from '../client';
import { shouldSuppressClientCapture, isCassetteInternalAccount, isInternalRoute } from '../internal-suppression';
import type { AnalyticsBaseProps } from '../events';
import { ignoreFailure } from '../../best-effort';
import { createMemoryStorage } from '../../__tests__/memory-storage';

test('maps paid-promotion routes to their sanitized analytics surface', () => {
  assert.equal(surfaceFromRoute('/promote'), 'paid_promotion');
  assert.equal(surfaceFromRoute('/promote/pmc_0123AbCd/return?session_id=secret'), 'paid_promotion');
});

test('maps curator routes to their analytics surface', () => {
  assert.equal(surfaceFromRoute('/curator/matt?membership=return&session_id=secret'), 'curator');
});

test('suppresses every internal paid-promotion console route', () => {
  assert.equal(isInternalRoute('/internal/paid-promotions'), true);
  assert.equal(isInternalRoute('/internal/paid-promotions/pmc_0123AbCd?tab=payment'), true);
  assert.equal(shouldSuppressClientCapture({
    route: '/internal/paid-promotions/pmc_0123AbCd',
    allowInDev: true,
  }), true);
});

function setupBrowserMocks(pathname: string, search: string) {
  const previousWindow = (globalThis as { window?: unknown }).window;
  const previousFetch = globalThis.fetch;
  const previousNavigator = (globalThis as { navigator?: { sendBeacon?: (url: string, data: Blob) => boolean } }).navigator;
  const previousSendBeacon = previousNavigator?.sendBeacon;

  const localStorage = createMemoryStorage();
  const sessionStorage = createMemoryStorage();
  const fetchPayloads: Array<Record<string, unknown>> = [];
  const beaconPayloads: Blob[] = [];

  (globalThis as { window?: unknown }).window = {
    localStorage,
    sessionStorage,
    location: {
      pathname,
      search,
      origin: 'https://cassette.test',
      href: `https://cassette.test${pathname}${search}`,
    },
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  };

  globalThis.fetch = (async (_input: string | URL | Request, init?: RequestInit) => {
    if (init?.body && typeof init.body === 'string') {
      fetchPayloads.push(JSON.parse(init.body));
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({}),
      text: async () => '',
    } as Response;
  }) as typeof fetch;

  if (previousNavigator && typeof previousNavigator === 'object') {
    ignoreFailure(() => {
      previousNavigator.sendBeacon = (_url: string, data: Blob) => {
        beaconPayloads.push(data);
        return true;
      };
    });
  }

  return {
    localStorage,
    fetchPayloads,
    beaconPayloads,
    restore() {
      (globalThis as { window?: unknown }).window = previousWindow;
      globalThis.fetch = previousFetch;
      if (previousNavigator && typeof previousNavigator === 'object') {
        ignoreFailure(() => {
          previousNavigator.sendBeacon = previousSendBeacon;
        });
      }
    },
  };
}

async function collectCapturedPayloads(
  fetchPayloads: Array<Record<string, unknown>>,
  beaconPayloads: Blob[],
): Promise<Array<Record<string, unknown>>> {
  const captured = [...fetchPayloads];

  for (const blob of beaconPayloads) {
    const text = await ignoreFailure(blob.text());
    const payload = text ? ignoreFailure(() => JSON.parse(text)) : undefined;
    if (payload !== undefined) captured.push(payload);
  }

  return captured;
}

const ANALYTICS_ENV = {
  NEXT_PUBLIC_POSTHOG_KEY: 'phc_test_key',
  NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV: 'true',
};

async function withAnalyticsBrowser(
  path: string,
  run: (mocks: ReturnType<typeof setupBrowserMocks>) => Promise<void>,
) {
  const { pathname, search } = new URL(path, 'https://cassette.test');
  const previousEnv = Object.keys(ANALYTICS_ENV).map((name) => [name, process.env[name]] as const);
  const mocks = setupBrowserMocks(pathname, search);
  try {
    Object.assign(process.env, ANALYTICS_ENV);
    resetAnalyticsContextForTests();
    await run(mocks);
  } finally {
    mocks.restore();
    for (const [name, value] of previousEnv) {
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
}

test('captureClientEvent is a no-op when PostHog env keys are missing', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/profile/test', async (mocks) => {
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;

    const result = await captureClientEvent('profile_viewed', {
      route: '/profile/test',
      source_surface: 'profile',
    });

    assert.equal(result, false);
    assert.deepEqual(await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads), []);
  });
});

test('identifyClientUser emits alias merge and identify for anon-to-user transitions', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/auth/signup', async (mocks) => {
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:test-user');

    const result = await identifyClientUser({
      userId: 'user-123',
      isAuthenticated: true,
      accountType: 'Regular',
      signupSource: 'friend',
      signupMedium: 'dm',
      signupCampaign: 'spring_launch',
      trafficSource: 'redditbot',
      trafficMedium: 'reddit_comment',
      trafficCampaign: 'playlist_link',
      trafficContent: 'cassetteclub',
      redditSubreddit: 'cassetteclub',
      redditPostId: 't3_abc123',
      firstReferrerDomain: 'instagram.com',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const events = captured.map((payload) => payload.event);

    assert.equal(result, true);
    assert.ok(events.includes('$create_alias'));
    assert.ok(events.includes('$identify'));

    const aliasPayload = captured.find((payload) => payload.event === '$create_alias');
    const identifyPayload = captured.find((payload) => payload.event === '$identify');
    assert.equal(aliasPayload?.distinct_id, 'anon:test-user');
    assert.equal((aliasPayload?.properties as Record<string, unknown>)?.alias, 'user-123');
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.signup_source,
      'friend',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.signup_medium,
      'dm',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.signup_campaign,
      'spring_launch',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.traffic_source,
      'redditbot',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.traffic_medium,
      'reddit_comment',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.traffic_campaign,
      'playlist_link',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.traffic_content,
      'cassetteclub',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.reddit_subreddit,
      'cassetteclub',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.reddit_post_id,
      't3_abc123',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.first_referrer_domain,
      'instagram.com',
    );
    assert.equal(
      ((identifyPayload?.properties as Record<string, unknown>)?.$set as Record<string, unknown>)?.first_touch_source,
      'friend',
    );
  });
});

test('identifyClientUser emits identify only when anonymous id equals user id', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/auth/signup', async (mocks) => {
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'user-123');

    const result = await identifyClientUser({
      userId: 'user-123',
      isAuthenticated: true,
      accountType: 'Regular',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
    const identifyEvents = captured.filter((payload) => payload.event === '$identify');

    assert.equal(result, true);
    assert.equal(aliasEvents.length, 0);
    assert.equal(identifyEvents.length, 1);
  });
});

test('identifyClientUser alias merge is idempotent for same anon-user pair', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/auth/signup', async (mocks) => {
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:repeat');

    await identifyClientUser({
      userId: 'user-123',
      isAuthenticated: true,
      accountType: 'Regular',
    });

    await identifyClientUser({
      userId: 'user-123',
      isAuthenticated: true,
      accountType: 'Regular',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
    const identifyEvents = captured.filter((payload) => payload.event === '$identify');

    assert.equal(aliasEvents.length, 1);
    assert.equal(identifyEvents.length, 2);
  });
});

test('identifyClientUser respects internal route suppression', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/internal/users', async (mocks) => {
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:suppressed');

    const result = await identifyClientUser({
      userId: 'user-123',
      isAuthenticated: true,
      accountType: 'Regular',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    assert.equal(result, false);
    assert.equal(captured.length, 0);
  });
});

test('captureClientEvent derives internal_actor from account_type only', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/profile/test', async (mocks) => {
    await captureClientEvent('profile_viewed', {
      route: '/profile/test',
      source_surface: 'profile',
      account_type: 'Regular',
      internal_actor: true,
    });

    await captureClientEvent('profile_viewed', {
      route: '/profile/test',
      source_surface: 'profile',
      account_type: 'CassetteTeam',
      internal_actor: false,
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const profileEvents = captured.filter((payload) => payload.event === 'profile_viewed');

    const regularProps = profileEvents[0]?.properties as Record<string, unknown> | undefined;
    const teamProps = profileEvents[1]?.properties as Record<string, unknown> | undefined;

    assert.equal(regularProps?.internal_actor, false);
    assert.equal(teamProps?.internal_actor, true);
  });
});

test('captureClientEvent preserves post viewer relationship flags', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/post/post-123', async (mocks) => {
    await captureClientEvent('post_viewed', {
      route: '/post/post-123',
      source_surface: 'post',
      post_id: 'post-123',
      is_creator_view: false,
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const postViewEvent = captured.find((payload) => payload.event === 'post_viewed');
    const props = postViewEvent?.properties as Record<string, unknown> | undefined;

    assert.equal(props?.is_creator_view, false);
  });
});

test('fan-action events keep only sanitizer-validated paid-promotion attribution', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/post/p_PaidDeliverable01', async (mocks) => {
    const fanActionEvents = [
      'post_viewed',
      'streaming_link_opened',
      'post_platform_conversion_clicked',
    ] as const;

    for (const event of fanActionEvents) {
      await captureClientEvent(event, {
        route: '/post/p_PaidDeliverable01',
        source_surface: 'post',
        post_id: 'p_PaidDeliverable01',
        paid_promotion_campaign_id: 'pmc_0123AbCd',
      });
      await captureClientEvent(event, {
        route: '/post/p_OrdinaryPost01',
        source_surface: 'post',
        post_id: 'p_OrdinaryPost01',
      });
    }

    await captureClientEvent('post_viewed', {
      route: '/post/p_InvalidAttribution01',
      source_surface: 'post',
      post_id: 'p_InvalidAttribution01',
      paid_promotion_campaign_id: 'campaign-from-route',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    for (const event of fanActionEvents) {
      const matching = captured.filter((payload) => payload.event === event);
      const paid = matching.find((payload) =>
        (payload.properties as Record<string, unknown> | undefined)?.post_id ===
        'p_PaidDeliverable01'
      );
      const ordinary = matching.find((payload) =>
        (payload.properties as Record<string, unknown> | undefined)?.post_id ===
        'p_OrdinaryPost01'
      );
      assert.ok(paid, `${event} with paid attribution was captured`);
      assert.ok(ordinary, `${event} without attribution was captured`);

      assert.equal(
        (paid?.properties as Record<string, unknown> | undefined)?.paid_promotion_campaign_id,
        'pmc_0123AbCd',
      );
      assert.equal(
        (ordinary?.properties as Record<string, unknown> | undefined)?.paid_promotion_campaign_id,
        undefined,
      );
    }

    const invalid = captured.find((payload) =>
      payload.event === 'post_viewed' &&
      (payload.properties as Record<string, unknown> | undefined)?.post_id ===
        'p_InvalidAttribution01'
    );
    assert.ok(invalid, 'post_viewed with invalid attribution was captured');
    assert.equal(
      (invalid?.properties as Record<string, unknown> | undefined)?.paid_promotion_campaign_id,
      undefined,
    );
  });
});

test('membership events keep only opaque attribution and relationship state', { concurrency: false }, async () => {
  await withAnalyticsBrowser('/profile/selector', async (mocks) => {
    const unsafeProperties: AnalyticsBaseProps & {
      amount_minor: number;
      checkout_url: string;
      promotion_code: string;
      billing_status: string;
    } = {
      route: '/profile/[username]',
      source_surface: 'curator',
      curator_id: 'cpr_0123AbCd',
      membership_plan_id: 'mpl_0123AbCd',
      is_member_view: false,
      amount_minor: 550,
      checkout_url: 'https://checkout.stripe.test/secret',
      promotion_code: 'SECRET',
      billing_status: 'active',
    };
    await captureClientEvent('membership_checkout_started', unsafeProperties);

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const properties = captured.find((payload) =>
      payload.event === 'membership_checkout_started'
    )?.properties as Record<string, unknown> | undefined;

    assert.equal(properties?.curator_id, 'cpr_0123AbCd');
    assert.equal(properties?.membership_plan_id, 'mpl_0123AbCd');
    assert.equal(properties?.is_member_view, false);
    assert.equal(properties?.amount_minor, undefined);
    assert.equal(properties?.checkout_url, undefined);
    assert.equal(properties?.promotion_code, undefined);
    assert.equal(properties?.billing_status, undefined);
  });
});

test('trackBrowserPageview stores safe Reddit attribution for later events', { concurrency: false }, async () => {
  const redditLanding =
    '/post/post-123?utm_source=redditbot&utm_medium=reddit_comment&utm_campaign=playlist_link&utm_content=cassetteclub&reddit_subreddit=cassetteclub&reddit_post_id=t3_abc123&token=secret';
  await withAnalyticsBrowser(redditLanding, async (mocks) => {
    await trackBrowserPageview({
      route: '/post/post-123',
      isAuthenticated: false,
      accountType: 'Regular',
    });

    ((globalThis as { window: { location: { search: string; href: string } } }).window.location).search = '';
    ((globalThis as { window: { location: { search: string; href: string } } }).window.location).href =
      'https://cassette.test/post/post-123';

    await captureClientEvent('post_viewed', {
      route: '/post/post-123',
      source_surface: 'post',
      post_id: 'post-123',
      element_type: 'playlist',
    });

    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const pageview = captured.find((payload) => payload.event === '$pageview');
    const postView = captured.find((payload) => payload.event === 'post_viewed');
    const pageviewProps = pageview?.properties as Record<string, unknown> | undefined;
    const postViewProps = postView?.properties as Record<string, unknown> | undefined;

    assert.equal(pageviewProps?.traffic_source, 'redditbot');
    assert.equal(pageviewProps?.traffic_medium, 'reddit_comment');
    assert.equal(pageviewProps?.traffic_campaign, 'playlist_link');
    assert.equal(pageviewProps?.traffic_content, 'cassetteclub');
    assert.equal(pageviewProps?.reddit_subreddit, 'cassetteclub');
    assert.equal(pageviewProps?.reddit_post_id, 't3_abc123');
    assert.match(String(pageviewProps?.$current_url), /utm_source=redditbot/);
    assert.match(String(pageviewProps?.$current_url), /reddit_post_id=t3_abc123/);
    assert.doesNotMatch(String(pageviewProps?.$current_url), /token=secret/);
    assert.equal(postViewProps?.traffic_source, 'redditbot');
    assert.equal(postViewProps?.reddit_subreddit, 'cassetteclub');
    assert.equal(postViewProps?.reddit_post_id, 't3_abc123');
  });
});

test('suppression logic blocks internal routes but not cassette team actors', () => {
  assert.equal(isInternalRoute('/internal'), true);
  assert.equal(isInternalRoute('/internal-notes'), false);
  assert.equal(isInternalRoute('/post/abc'), false);

  assert.equal(shouldSuppressClientCapture({ route: '/profile/test', accountType: 'CassetteTeam', allowInDev: true }), false);
  assert.equal(shouldSuppressClientCapture({ route: '/post/abc', accountType: 'Regular', allowInDev: true }), false);
});

test('cassette team actor classification is account-type based', () => {
  assert.equal(isCassetteInternalAccount('CassetteTeam'), true);
  assert.equal(isCassetteInternalAccount('cassette_team'), true);
  assert.equal(isCassetteInternalAccount('Cassette Team'), true);
  assert.equal(isCassetteInternalAccount('cassette-team'), true);
  assert.equal(isCassetteInternalAccount(2), true);
  assert.equal(isCassetteInternalAccount('Verified'), false);
  assert.equal(isCassetteInternalAccount('Regular'), false);
  assert.equal(isCassetteInternalAccount(undefined), false);
});
