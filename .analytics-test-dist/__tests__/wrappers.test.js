"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const client_1 = require("../client");
const internal_suppression_1 = require("../internal-suppression");
(0, node_test_1.default)('maps paid-promotion routes to their sanitized analytics surface', () => {
    strict_1.default.equal((0, client_1.surfaceFromRoute)('/promote'), 'paid_promotion');
    strict_1.default.equal((0, client_1.surfaceFromRoute)('/promote/pmc_0123AbCd/return?session_id=secret'), 'paid_promotion');
});
(0, node_test_1.default)('suppresses every internal paid-promotion console route', () => {
    strict_1.default.equal((0, internal_suppression_1.isInternalOrDemoRoute)('/internal/paid-promotions'), true);
    strict_1.default.equal((0, internal_suppression_1.isInternalOrDemoRoute)('/internal/paid-promotions/pmc_0123AbCd?tab=payment'), true);
    strict_1.default.equal((0, internal_suppression_1.shouldSuppressClientCapture)({
        route: '/internal/paid-promotions/pmc_0123AbCd',
        allowInDev: true,
    }), true);
});
function createMemoryStorage() {
    const store = new Map();
    return {
        getItem(key) {
            return store.has(key) ? store.get(key) ?? null : null;
        },
        setItem(key, value) {
            store.set(key, value);
        },
        removeItem(key) {
            store.delete(key);
        },
        clear() {
            store.clear();
        },
    };
}
function setupBrowserMocks(pathname = '/auth/signup', search = '') {
    const previousWindow = globalThis.window;
    const previousFetch = globalThis.fetch;
    const previousNavigator = globalThis.navigator;
    const previousSendBeacon = previousNavigator?.sendBeacon;
    const localStorage = createMemoryStorage();
    const sessionStorage = createMemoryStorage();
    const fetchPayloads = [];
    const beaconPayloads = [];
    globalThis.window = {
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
    globalThis.fetch = (async (_input, init) => {
        if (init?.body && typeof init.body === 'string') {
            fetchPayloads.push(JSON.parse(init.body));
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({}),
            text: async () => '',
        };
    });
    if (previousNavigator && typeof previousNavigator === 'object') {
        try {
            previousNavigator.sendBeacon = (_url, data) => {
                beaconPayloads.push(data);
                return true;
            };
        }
        catch {
            // ignore navigator mutation failures
        }
    }
    return {
        localStorage,
        fetchPayloads,
        beaconPayloads,
        restore() {
            globalThis.window = previousWindow;
            globalThis.fetch = previousFetch;
            if (previousNavigator && typeof previousNavigator === 'object') {
                try {
                    previousNavigator.sendBeacon = previousSendBeacon;
                }
                catch {
                    // ignore navigator mutation failures
                }
            }
        },
    };
}
async function collectCapturedPayloads(fetchPayloads, beaconPayloads) {
    const captured = [...fetchPayloads];
    for (const blob of beaconPayloads) {
        try {
            const text = await blob.text();
            if (!text)
                continue;
            captured.push(JSON.parse(text));
        }
        catch {
            // ignore parse failures
        }
    }
    return captured;
}
(0, node_test_1.default)('captureClientEvent is a no-op when PostHog env keys are missing', { concurrency: false }, async () => {
    const previous = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    delete process.env.NEXT_PUBLIC_POSTHOG_KEY;
    (0, client_1.resetAnalyticsContextForTests)();
    const result = await (0, client_1.captureClientEvent)('profile_viewed', {
        route: '/profile/test',
        source_surface: 'profile',
    });
    strict_1.default.equal(result, false);
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previous;
});
(0, node_test_1.default)('identifyClientUser emits alias merge and identify for anon-to-user transitions', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/auth/signup');
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:test-user');
    const result = await (0, client_1.identifyClientUser)({
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
    strict_1.default.equal(result, true);
    strict_1.default.ok(events.includes('$create_alias'));
    strict_1.default.ok(events.includes('$identify'));
    const aliasPayload = captured.find((payload) => payload.event === '$create_alias');
    const identifyPayload = captured.find((payload) => payload.event === '$identify');
    strict_1.default.equal(aliasPayload?.distinct_id, 'anon:test-user');
    strict_1.default.equal(aliasPayload?.properties?.alias, 'user-123');
    strict_1.default.equal(identifyPayload?.properties?.$set?.signup_source, 'friend');
    strict_1.default.equal(identifyPayload?.properties?.$set?.signup_medium, 'dm');
    strict_1.default.equal(identifyPayload?.properties?.$set?.signup_campaign, 'spring_launch');
    strict_1.default.equal(identifyPayload?.properties?.$set?.traffic_source, 'redditbot');
    strict_1.default.equal(identifyPayload?.properties?.$set?.traffic_medium, 'reddit_comment');
    strict_1.default.equal(identifyPayload?.properties?.$set?.traffic_campaign, 'playlist_link');
    strict_1.default.equal(identifyPayload?.properties?.$set?.traffic_content, 'cassetteclub');
    strict_1.default.equal(identifyPayload?.properties?.$set?.reddit_subreddit, 'cassetteclub');
    strict_1.default.equal(identifyPayload?.properties?.$set?.reddit_post_id, 't3_abc123');
    strict_1.default.equal(identifyPayload?.properties?.$set?.first_referrer_domain, 'instagram.com');
    strict_1.default.equal(identifyPayload?.properties?.$set?.first_touch_source, 'friend');
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('identifyClientUser emits identify only when anonymous id equals user id', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/auth/signup');
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'user-123');
    const result = await (0, client_1.identifyClientUser)({
        userId: 'user-123',
        isAuthenticated: true,
        accountType: 'Regular',
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
    const identifyEvents = captured.filter((payload) => payload.event === '$identify');
    strict_1.default.equal(result, true);
    strict_1.default.equal(aliasEvents.length, 0);
    strict_1.default.equal(identifyEvents.length, 1);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('identifyClientUser alias merge is idempotent for same anon-user pair', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/auth/signup');
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:repeat');
    await (0, client_1.identifyClientUser)({
        userId: 'user-123',
        isAuthenticated: true,
        accountType: 'Regular',
    });
    await (0, client_1.identifyClientUser)({
        userId: 'user-123',
        isAuthenticated: true,
        accountType: 'Regular',
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const aliasEvents = captured.filter((payload) => payload.event === '$create_alias');
    const identifyEvents = captured.filter((payload) => payload.event === '$identify');
    strict_1.default.equal(aliasEvents.length, 1);
    strict_1.default.equal(identifyEvents.length, 2);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('identifyClientUser respects internal/demo suppression', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/debug');
    mocks.localStorage.setItem('cassette_posthog_distinct_id', 'anon:suppressed');
    const result = await (0, client_1.identifyClientUser)({
        userId: 'user-123',
        isAuthenticated: true,
        accountType: 'Regular',
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    strict_1.default.equal(result, false);
    strict_1.default.equal(captured.length, 0);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('captureClientEvent derives internal_actor from account_type only', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/profile/test');
    await (0, client_1.captureClientEvent)('profile_viewed', {
        route: '/profile/test',
        source_surface: 'profile',
        account_type: 'Regular',
        internal_actor: true,
    });
    await (0, client_1.captureClientEvent)('profile_viewed', {
        route: '/profile/test',
        source_surface: 'profile',
        account_type: 'CassetteTeam',
        internal_actor: false,
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const profileEvents = captured.filter((payload) => payload.event === 'profile_viewed');
    const regularProps = profileEvents[0]?.properties;
    const teamProps = profileEvents[1]?.properties;
    strict_1.default.equal(regularProps?.internal_actor, false);
    strict_1.default.equal(teamProps?.internal_actor, true);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('captureClientEvent preserves post viewer relationship flags', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/post/post-123');
    await (0, client_1.captureClientEvent)('post_viewed', {
        route: '/post/post-123',
        source_surface: 'post',
        post_id: 'post-123',
        is_creator_view: false,
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const postViewEvent = captured.find((payload) => payload.event === 'post_viewed');
    const props = postViewEvent?.properties;
    strict_1.default.equal(props?.is_creator_view, false);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('fan-action events keep only sanitizer-validated paid-promotion attribution', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/post/p_PaidDeliverable01');
    const fanActionEvents = [
        'post_viewed',
        'streaming_link_opened',
        'post_platform_conversion_clicked',
    ];
    for (const event of fanActionEvents) {
        await (0, client_1.captureClientEvent)(event, {
            route: '/post/p_PaidDeliverable01',
            source_surface: 'post',
            post_id: 'p_PaidDeliverable01',
            paid_promotion_campaign_id: 'pmc_0123AbCd',
        });
        await (0, client_1.captureClientEvent)(event, {
            route: '/post/p_OrdinaryPost01',
            source_surface: 'post',
            post_id: 'p_OrdinaryPost01',
        });
    }
    await (0, client_1.captureClientEvent)('post_viewed', {
        route: '/post/p_InvalidAttribution01',
        source_surface: 'post',
        post_id: 'p_InvalidAttribution01',
        paid_promotion_campaign_id: 'campaign-from-route',
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    for (const event of fanActionEvents) {
        const matching = captured.filter((payload) => payload.event === event);
        const paid = matching.find((payload) => payload.properties?.post_id ===
            'p_PaidDeliverable01');
        const ordinary = matching.find((payload) => payload.properties?.post_id ===
            'p_OrdinaryPost01');
        strict_1.default.equal(paid?.properties?.paid_promotion_campaign_id, 'pmc_0123AbCd');
        strict_1.default.equal(ordinary?.properties?.paid_promotion_campaign_id, undefined);
    }
    const invalid = captured.find((payload) => payload.event === 'post_viewed' &&
        payload.properties?.post_id ===
            'p_InvalidAttribution01');
    strict_1.default.equal(invalid?.properties?.paid_promotion_campaign_id, undefined);
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('trackBrowserPageview stores safe Reddit attribution for later events', { concurrency: false }, async () => {
    const previousKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const previousDevFlag = process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV;
    process.env.NEXT_PUBLIC_POSTHOG_KEY = 'phc_test_key';
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = 'true';
    (0, client_1.resetAnalyticsContextForTests)();
    const mocks = setupBrowserMocks('/post/post-123', '?utm_source=redditbot&utm_medium=reddit_comment&utm_campaign=playlist_link&utm_content=cassetteclub&reddit_subreddit=cassetteclub&reddit_post_id=t3_abc123&token=secret');
    await (0, client_1.trackBrowserPageview)({
        route: '/post/post-123',
        isAuthenticated: false,
        accountType: 'Regular',
    });
    (globalThis.window.location).search = '';
    (globalThis.window.location).href =
        'https://cassette.test/post/post-123';
    await (0, client_1.captureClientEvent)('post_viewed', {
        route: '/post/post-123',
        source_surface: 'post',
        post_id: 'post-123',
        element_type: 'playlist',
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const pageview = captured.find((payload) => payload.event === '$pageview');
    const postView = captured.find((payload) => payload.event === 'post_viewed');
    const pageviewProps = pageview?.properties;
    const postViewProps = postView?.properties;
    strict_1.default.equal(pageviewProps?.traffic_source, 'redditbot');
    strict_1.default.equal(pageviewProps?.traffic_medium, 'reddit_comment');
    strict_1.default.equal(pageviewProps?.traffic_campaign, 'playlist_link');
    strict_1.default.equal(pageviewProps?.traffic_content, 'cassetteclub');
    strict_1.default.equal(pageviewProps?.reddit_subreddit, 'cassetteclub');
    strict_1.default.equal(pageviewProps?.reddit_post_id, 't3_abc123');
    strict_1.default.match(String(pageviewProps?.$current_url), /utm_source=redditbot/);
    strict_1.default.match(String(pageviewProps?.$current_url), /reddit_post_id=t3_abc123/);
    strict_1.default.doesNotMatch(String(pageviewProps?.$current_url), /token=secret/);
    strict_1.default.equal(postViewProps?.traffic_source, 'redditbot');
    strict_1.default.equal(postViewProps?.reddit_subreddit, 'cassetteclub');
    strict_1.default.equal(postViewProps?.reddit_post_id, 't3_abc123');
    mocks.restore();
    process.env.NEXT_PUBLIC_POSTHOG_KEY = previousKey;
    process.env.NEXT_PUBLIC_ENABLE_ANALYTICS_IN_DEV = previousDevFlag;
});
(0, node_test_1.default)('suppression logic blocks internal/demo routes but not cassette team actors', () => {
    strict_1.default.equal((0, internal_suppression_1.isInternalOrDemoRoute)('/debug'), true);
    strict_1.default.equal((0, internal_suppression_1.isInternalOrDemoRoute)('/demo/profile'), true);
    strict_1.default.equal((0, internal_suppression_1.isInternalOrDemoRoute)('/post/abc'), false);
    strict_1.default.equal((0, internal_suppression_1.shouldSuppressClientCapture)({ route: '/profile/test', accountType: 'CassetteTeam', allowInDev: true }), false);
    strict_1.default.equal((0, internal_suppression_1.shouldSuppressClientCapture)({ route: '/post/abc', accountType: 'Regular', allowInDev: true }), false);
});
(0, node_test_1.default)('cassette team actor classification is account-type based', () => {
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('CassetteTeam'), true);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('cassette_team'), true);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('Cassette Team'), true);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('cassette-team'), true);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)(2), true);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('Verified'), false);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)('Regular'), false);
    strict_1.default.equal((0, internal_suppression_1.isCassetteInternalAccount)(undefined), false);
});
