"use strict";
'use client';
Object.defineProperty(exports, "__esModule", { value: true });
exports.surfaceFromRoute = surfaceFromRoute;
exports.setClientAnalyticsContext = setClientAnalyticsContext;
exports.trackBrowserPageview = trackBrowserPageview;
exports.captureClientEvent = captureClientEvent;
exports.identifyClientUser = identifyClientUser;
exports.resetAnalyticsContextForTests = resetAnalyticsContextForTests;
const sanitize_1 = require("./sanitize");
const events_1 = require("./events");
const internal_suppression_1 = require("./internal-suppression");
const DEFAULT_CLIENT_CAPTURE_HOST = '/api/ingest';
const ANON_DISTINCT_ID_KEY = 'cassette_posthog_distinct_id';
const ALIAS_MERGE_GUARD_PREFIX = 'cassette_posthog_alias';
const SESSION_ID_KEY = 'cassette_posthog_session_id';
const SESSION_LAST_SEEN_KEY = 'cassette_posthog_session_last_seen_at';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const TRAFFIC_ATTRIBUTION_KEY = 'cassette_traffic_attribution';
const TRAFFIC_ATTRIBUTION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ATTRIBUTION_QUERY_PARAMS = [
    'src',
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_content',
    'reddit_subreddit',
    'reddit_post_id',
];
let sharedContext = {};
let activePageview = null;
let beforeUnloadBound = false;
function getClientPosthogConfig() {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_CAPTURE_HOST || DEFAULT_CLIENT_CAPTURE_HOST;
    return { key, host };
}
function getAnonymousDistinctId() {
    if (typeof window === 'undefined') {
        return `anon:${Date.now()}`;
    }
    try {
        const existing = window.localStorage.getItem(ANON_DISTINCT_ID_KEY);
        if (existing)
            return existing;
        const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? `anon:${crypto.randomUUID()}`
            : `anon:${Date.now()}-${Math.random().toString(16).slice(2)}`;
        window.localStorage.setItem(ANON_DISTINCT_ID_KEY, generated);
        return generated;
    }
    catch {
        return `anon:${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}
function resolveRoute(props) {
    if (props?.route)
        return (0, sanitize_1.sanitizeRoute)(props.route);
    if (typeof window === 'undefined')
        return undefined;
    return (0, sanitize_1.sanitizeRoute)(window.location.pathname);
}
function getOrCreateSessionId(nowMs = Date.now()) {
    if (typeof window === 'undefined') {
        return `session:${nowMs}`;
    }
    try {
        const existing = window.sessionStorage.getItem(SESSION_ID_KEY);
        const lastSeenRaw = window.sessionStorage.getItem(SESSION_LAST_SEEN_KEY);
        const lastSeen = lastSeenRaw ? Number(lastSeenRaw) : NaN;
        if (existing && Number.isFinite(lastSeen) && nowMs - lastSeen <= SESSION_IDLE_TIMEOUT_MS) {
            window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(nowMs));
            return existing;
        }
        const next = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? `session:${crypto.randomUUID()}`
            : `session:${nowMs}-${Math.random().toString(16).slice(2)}`;
        window.sessionStorage.setItem(SESSION_ID_KEY, next);
        window.sessionStorage.setItem(SESSION_LAST_SEEN_KEY, String(nowMs));
        return next;
    }
    catch {
        return `session:${nowMs}-${Math.random().toString(16).slice(2)}`;
    }
}
function getSafeReferrer() {
    if (typeof document === 'undefined' || !document.referrer) {
        return {};
    }
    try {
        const parsed = new URL(document.referrer);
        return {
            referrer: `${parsed.origin}${parsed.pathname}`,
            referringDomain: parsed.hostname.toLowerCase(),
        };
    }
    catch {
        return {};
    }
}
function parseTrafficAttributionFromUrl() {
    if (typeof window === 'undefined') {
        return null;
    }
    const params = new URLSearchParams(window.location.search || '');
    const source = params.get('src') || params.get('utm_source') || undefined;
    const properties = (0, sanitize_1.sanitizeAnalyticsProps)({
        traffic_source: source,
        traffic_medium: params.get('utm_medium') || undefined,
        traffic_campaign: params.get('utm_campaign') || undefined,
        traffic_content: params.get('utm_content') || undefined,
        reddit_subreddit: params.get('reddit_subreddit') || undefined,
        reddit_post_id: params.get('reddit_post_id') || undefined,
    });
    return Object.keys(properties).length > 0 ? properties : null;
}
function readStoredTrafficAttribution(nowMs = Date.now()) {
    if (typeof window === 'undefined') {
        return null;
    }
    try {
        const raw = window.localStorage.getItem(TRAFFIC_ATTRIBUTION_KEY);
        if (!raw) {
            return null;
        }
        const stored = JSON.parse(raw);
        if (typeof stored.expiresAt !== 'number' ||
            stored.expiresAt <= nowMs ||
            !stored.properties ||
            typeof stored.properties !== 'object') {
            window.localStorage.removeItem(TRAFFIC_ATTRIBUTION_KEY);
            return null;
        }
        const properties = (0, sanitize_1.sanitizeAnalyticsProps)(stored.properties);
        return Object.keys(properties).length > 0 ? properties : null;
    }
    catch {
        return null;
    }
}
function writeTrafficAttribution(properties, nowMs = Date.now()) {
    if (typeof window === 'undefined' || Object.keys(properties).length === 0) {
        return;
    }
    try {
        const stored = {
            expiresAt: nowMs + TRAFFIC_ATTRIBUTION_TTL_MS,
            properties,
        };
        window.localStorage.setItem(TRAFFIC_ATTRIBUTION_KEY, JSON.stringify(stored));
    }
    catch {
        // ignore storage failures
    }
}
function getCurrentTrafficAttribution() {
    const fromUrl = parseTrafficAttributionFromUrl();
    if (fromUrl) {
        writeTrafficAttribution(fromUrl);
        return fromUrl;
    }
    return readStoredTrafficAttribution() ?? {};
}
function buildSafeAttributionSearch() {
    if (typeof window === 'undefined') {
        return '';
    }
    const current = new URLSearchParams(window.location.search || '');
    const safe = new URLSearchParams();
    for (const key of ATTRIBUTION_QUERY_PARAMS) {
        for (const value of current.getAll(key)) {
            safe.append(key, value);
        }
    }
    const query = safe.toString();
    return query ? `?${query}` : '';
}
function buildSafeCurrentUrl(route) {
    if (typeof window === 'undefined') {
        return route;
    }
    return `${window.location.origin}${route}${buildSafeAttributionSearch()}`;
}
function posthogCapture(body, host) {
    if (typeof window === 'undefined')
        return;
    const payload = JSON.stringify(body);
    const endpoint = `${host.replace(/\/$/, '')}/capture/`;
    try {
        if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
            const blob = new Blob([payload], { type: 'application/json' });
            navigator.sendBeacon(endpoint, blob);
            return;
        }
    }
    catch {
        // ignore and fall back to fetch
    }
    void fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => {
        // analytics must never break UX
    });
}
function surfaceFromRoute(route) {
    if (!route)
        return 'unknown';
    const path = route.split('?')[0];
    if (path === '/')
        return 'home';
    if (path.startsWith('/add-music'))
        return 'add_music';
    if (path.startsWith('/promote'))
        return 'paid_promotion';
    if (path.startsWith('/post'))
        return 'post';
    if (path.startsWith('/profile'))
        return 'profile';
    if (path.startsWith('/onboarding'))
        return 'onboarding';
    if (path.startsWith('/explore'))
        return 'explore';
    if (path.startsWith('/auth'))
        return 'auth';
    return 'unknown';
}
function setClientAnalyticsContext(context) {
    sharedContext = {
        ...sharedContext,
        ...context,
    };
}
function getClientDistinctId(userId) {
    return userId || sharedContext.user_id || getAnonymousDistinctId();
}
function resolveInternalActor(accountType) {
    return (0, internal_suppression_1.isCassetteInternalAccount)(accountType);
}
function aliasMergeGuardKey(anonymousDistinctId, userId) {
    return `${ALIAS_MERGE_GUARD_PREFIX}:${anonymousDistinctId}:${userId}`;
}
function hasAliasMergeGuard(guardKey) {
    if (typeof window === 'undefined') {
        return false;
    }
    try {
        return window.localStorage.getItem(guardKey) === '1';
    }
    catch {
        return false;
    }
}
function setAliasMergeGuard(guardKey) {
    if (typeof window === 'undefined') {
        return;
    }
    try {
        window.localStorage.setItem(guardKey, '1');
    }
    catch {
        // ignore storage failures
    }
}
function flushCurrentPageleave(options) {
    if (!activePageview) {
        return;
    }
    const elapsedMs = Date.now() - activePageview.startedAtMs;
    const durationSeconds = elapsedMs > 0 ? Math.round(elapsedMs / 1000) : 0;
    posthogCapture({
        api_key: options.key,
        event: '$pageleave',
        distinct_id: options.distinctId,
        properties: {
            $lib: 'cassette-ui',
            $pathname: activePageview.route,
            route: activePageview.route,
            source_surface: surfaceFromRoute(activePageview.route),
            is_authenticated: options.isAuthenticated ?? sharedContext.is_authenticated ?? false,
            internal_actor: resolveInternalActor(sharedContext.account_type),
            $session_id: activePageview.sessionId,
            $prev_pageview_duration: durationSeconds,
            leave_reason: options.reason || 'route_change',
        },
    }, options.host);
}
function bindBeforeUnloadPageleave(config) {
    if (beforeUnloadBound || typeof window === 'undefined') {
        return;
    }
    const onBeforeUnload = () => {
        const accountType = sharedContext.account_type;
        const route = activePageview?.route || sharedContext.route;
        if ((0, internal_suppression_1.shouldSuppressClientCapture)({ route, accountType })) {
            return;
        }
        flushCurrentPageleave({
            key: config.key,
            host: config.host,
            distinctId: getClientDistinctId(),
            isAuthenticated: sharedContext.is_authenticated,
            reason: 'beforeunload',
        });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    beforeUnloadBound = true;
}
async function trackBrowserPageview(options) {
    const { key, host } = getClientPosthogConfig();
    if (!key || typeof window === 'undefined') {
        return false;
    }
    const route = (0, sanitize_1.sanitizeRoute)(options.route || window.location.pathname) || '/';
    const accountType = options.accountType != null
        ? String(options.accountType)
        : sharedContext.account_type;
    const internalActor = resolveInternalActor(accountType);
    if ((0, internal_suppression_1.shouldSuppressClientCapture)({ route, accountType })) {
        return false;
    }
    const distinctId = getClientDistinctId(options.userId);
    const sessionId = getOrCreateSessionId();
    const { referrer, referringDomain } = getSafeReferrer();
    const attribution = getCurrentTrafficAttribution();
    if (activePageview && activePageview.route !== route) {
        flushCurrentPageleave({
            key,
            host,
            distinctId,
            isAuthenticated: options.isAuthenticated,
            reason: 'route_change',
        });
        activePageview = null;
    }
    if (activePageview?.route === route) {
        return true;
    }
    const currentUrl = buildSafeCurrentUrl(route);
    posthogCapture({
        api_key: key,
        event: '$pageview',
        distinct_id: distinctId,
        properties: {
            $lib: 'cassette-ui',
            $current_url: currentUrl,
            $pathname: route,
            route,
            source_surface: surfaceFromRoute(route),
            is_authenticated: options.isAuthenticated ?? sharedContext.is_authenticated ?? false,
            internal_actor: internalActor,
            $session_id: sessionId,
            $referrer: referrer,
            $referring_domain: referringDomain,
            ...attribution,
        },
    }, host);
    activePageview = {
        route,
        startedAtMs: Date.now(),
        sessionId,
    };
    bindBeforeUnloadPageleave({ key, host });
    return true;
}
async function captureClientEvent(event, props = {}) {
    const { key, host } = getClientPosthogConfig();
    if (!key || typeof window === 'undefined') {
        return false;
    }
    const route = resolveRoute(props) || sharedContext.route;
    const attribution = getCurrentTrafficAttribution();
    const combinedProps = {
        ...sharedContext,
        ...attribution,
        ...props,
        route,
        source_surface: props.source_surface || sharedContext.source_surface || surfaceFromRoute(route),
        is_authenticated: props.is_authenticated ?? sharedContext.is_authenticated,
        user_id: props.user_id || sharedContext.user_id,
        internal_actor: resolveInternalActor(props.account_type ?? sharedContext.account_type),
    };
    if ((0, internal_suppression_1.shouldSuppressClientCapture)({
        route,
        accountType: combinedProps.account_type,
    })) {
        return false;
    }
    const sanitized = (0, sanitize_1.sanitizeAnalyticsProps)((0, events_1.withCoreAction)(event, combinedProps));
    const distinctId = combinedProps.user_id || getAnonymousDistinctId();
    posthogCapture({
        api_key: key,
        event,
        distinct_id: distinctId,
        properties: {
            ...sanitized,
            $lib: 'cassette-ui',
        },
    }, host);
    return true;
}
async function identifyClientUser(context) {
    const { key, host } = getClientPosthogConfig();
    if (!key || typeof window === 'undefined' || !context.userId) {
        return false;
    }
    const route = resolveRoute();
    if ((0, internal_suppression_1.shouldSuppressClientCapture)({ route, accountType: context.accountType })) {
        return false;
    }
    const anonymousDistinctId = getAnonymousDistinctId();
    if (anonymousDistinctId !== context.userId) {
        const guardKey = aliasMergeGuardKey(anonymousDistinctId, context.userId);
        if (!hasAliasMergeGuard(guardKey)) {
            posthogCapture({
                api_key: key,
                event: '$create_alias',
                distinct_id: anonymousDistinctId,
                properties: {
                    distinct_id: anonymousDistinctId,
                    alias: context.userId,
                    $lib: 'cassette-ui',
                },
            }, host);
            setAliasMergeGuard(guardKey);
        }
    }
    setClientAnalyticsContext({
        user_id: context.userId,
        is_authenticated: context.isAuthenticated ?? true,
        organization_id: context.organizationId,
        role: context.role,
        plan: context.plan,
        account_type: context.accountType != null ? String(context.accountType) : undefined,
    });
    const attribution = getCurrentTrafficAttribution();
    const setPayload = (0, sanitize_1.sanitizeAnalyticsProps)({
        user_id: context.userId,
        is_authenticated: context.isAuthenticated ?? true,
        organization_id: context.organizationId,
        role: context.role,
        plan: context.plan,
        account_type: context.accountType != null ? String(context.accountType) : undefined,
        signup_source: context.signupSource,
        signup_medium: context.signupMedium,
        signup_campaign: context.signupCampaign,
        first_referrer_domain: context.firstReferrerDomain,
        first_touch_source: context.signupSource,
        traffic_source: context.trafficSource ?? attribution.traffic_source ?? context.signupSource,
        traffic_medium: context.trafficMedium ?? attribution.traffic_medium ?? context.signupMedium,
        traffic_campaign: context.trafficCampaign ?? attribution.traffic_campaign ?? context.signupCampaign,
        traffic_content: context.trafficContent ?? attribution.traffic_content,
        reddit_subreddit: context.redditSubreddit ?? attribution.reddit_subreddit,
        reddit_post_id: context.redditPostId ?? attribution.reddit_post_id,
        internal_actor: resolveInternalActor(context.accountType),
    });
    posthogCapture({
        api_key: key,
        event: '$identify',
        distinct_id: context.userId,
        properties: {
            ...setPayload,
            $set: setPayload,
        },
    }, host);
    if (context.organizationId) {
        posthogCapture({
            api_key: key,
            event: '$groupidentify',
            distinct_id: context.userId,
            properties: {
                $group_type: 'organization',
                $group_key: context.organizationId,
            },
        }, host);
    }
    return true;
}
function resetAnalyticsContextForTests() {
    sharedContext = {};
    activePageview = null;
    beforeUnloadBound = false;
}
