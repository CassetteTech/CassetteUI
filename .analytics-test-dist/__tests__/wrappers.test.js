"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const client_1 = require("../client");
const internal_suppression_1 = require("../internal-suppression");
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
function setupBrowserMocks(pathname = '/auth/signup') {
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
            origin: 'https://cassette.test',
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
    });
    const captured = await collectCapturedPayloads(mocks.fetchPayloads, mocks.beaconPayloads);
    const events = captured.map((payload) => payload.event);
    strict_1.default.equal(result, true);
    strict_1.default.ok(events.includes('$create_alias'));
    strict_1.default.ok(events.includes('$identify'));
    const aliasPayload = captured.find((payload) => payload.event === '$create_alias');
    strict_1.default.equal(aliasPayload?.distinct_id, 'anon:test-user');
    strict_1.default.equal(aliasPayload?.properties?.alias, 'user-123');
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
