'use client';

import type { AnalyticsBaseProps, AnalyticsEventName, SourceSurface } from './events';
import { sanitizeAnalyticsProps, sanitizeRoute } from './sanitize';
import { withCoreAction } from './events';
import { isCassetteInternalAccount, shouldSuppressClientCapture } from './internal-suppression';

const DEFAULT_POSTHOG_HOST = 'https://app.posthog.com';
const ANON_DISTINCT_ID_KEY = 'cassette_posthog_distinct_id';
const ALIAS_MERGE_GUARD_PREFIX = 'cassette_posthog_alias';
const SESSION_ID_KEY = 'cassette_posthog_session_id';
const SESSION_LAST_SEEN_KEY = 'cassette_posthog_session_last_seen_at';
const SESSION_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

type IdentifyUserContext = {
  userId?: string;
  organizationId?: string;
  role?: string;
  plan?: string;
  isAuthenticated?: boolean;
  accountType?: string | number;
};

type SharedContext = {
  route?: string;
  source_surface?: SourceSurface;
  is_authenticated?: boolean;
  user_id?: string;
  organization_id?: string;
  role?: string;
  plan?: string;
  account_type?: string;
};

type ActivePageview = {
  route: string;
  startedAtMs: number;
  sessionId: string;
};

let sharedContext: SharedContext = {};
let activePageview: ActivePageview | null = null;
let beforeUnloadBound = false;

function getClientPosthogConfig(): { key?: string; host: string } {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || process.env.POSTHOG_HOST || DEFAULT_POSTHOG_HOST;
  return { key, host };
}

function getAnonymousDistinctId(): string {
  if (typeof window === 'undefined') {
    return `anon:${Date.now()}`;
  }

  try {
    const existing = window.localStorage.getItem(ANON_DISTINCT_ID_KEY);
    if (existing) return existing;

    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? `anon:${crypto.randomUUID()}`
      : `anon:${Date.now()}-${Math.random().toString(16).slice(2)}`;

    window.localStorage.setItem(ANON_DISTINCT_ID_KEY, generated);
    return generated;
  } catch {
    return `anon:${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function resolveRoute(props?: Partial<AnalyticsBaseProps>): string | undefined {
  if (props?.route) return sanitizeRoute(props.route);
  if (typeof window === 'undefined') return undefined;
  return sanitizeRoute(window.location.pathname);
}

function getOrCreateSessionId(nowMs = Date.now()): string {
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
  } catch {
    return `session:${nowMs}-${Math.random().toString(16).slice(2)}`;
  }
}

function getSafeReferrer(): { referrer?: string; referringDomain?: string } {
  if (typeof document === 'undefined' || !document.referrer) {
    return {};
  }

  try {
    const parsed = new URL(document.referrer);
    return {
      referrer: `${parsed.origin}${parsed.pathname}`,
      referringDomain: parsed.hostname.toLowerCase(),
    };
  } catch {
    return {};
  }
}

function posthogCapture(body: Record<string, unknown>, host: string): void {
  if (typeof window === 'undefined') return;

  const payload = JSON.stringify(body);
  const endpoint = `${host.replace(/\/$/, '')}/capture/`;

  try {
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([payload], { type: 'application/json' });
      navigator.sendBeacon(endpoint, blob);
      return;
    }
  } catch {
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

export function surfaceFromRoute(route?: string | null): SourceSurface {
  if (!route) return 'unknown';

  const path = route.split('?')[0];
  if (path === '/') return 'home';
  if (path.startsWith('/add-music')) return 'add_music';
  if (path.startsWith('/post')) return 'post';
  if (path.startsWith('/profile')) return 'profile';
  if (path.startsWith('/onboarding')) return 'onboarding';
  if (path.startsWith('/explore')) return 'explore';
  if (path.startsWith('/auth')) return 'auth';
  return 'unknown';
}

export function setClientAnalyticsContext(context: Partial<SharedContext>): void {
  sharedContext = {
    ...sharedContext,
    ...context,
  };
}

function getClientDistinctId(userId?: string): string {
  return userId || sharedContext.user_id || getAnonymousDistinctId();
}

function resolveInternalActor(accountType?: string | number | null): boolean {
  return isCassetteInternalAccount(accountType);
}

function aliasMergeGuardKey(anonymousDistinctId: string, userId: string): string {
  return `${ALIAS_MERGE_GUARD_PREFIX}:${anonymousDistinctId}:${userId}`;
}

function hasAliasMergeGuard(guardKey: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(guardKey) === '1';
  } catch {
    return false;
  }
}

function setAliasMergeGuard(guardKey: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(guardKey, '1');
  } catch {
    // ignore storage failures
  }
}

function flushCurrentPageleave(options: {
  key: string;
  host: string;
  distinctId: string;
  isAuthenticated?: boolean;
  reason?: 'route_change' | 'beforeunload';
}): void {
  if (!activePageview) {
    return;
  }

  const elapsedMs = Date.now() - activePageview.startedAtMs;
  const durationSeconds = elapsedMs > 0 ? Math.round(elapsedMs / 1000) : 0;

  posthogCapture(
    {
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
    },
    options.host,
  );
}

function bindBeforeUnloadPageleave(config: { key: string; host: string }): void {
  if (beforeUnloadBound || typeof window === 'undefined') {
    return;
  }

  const onBeforeUnload = () => {
    const accountType = sharedContext.account_type;
    const route = activePageview?.route || sharedContext.route;
    if (shouldSuppressClientCapture({ route, accountType })) {
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

export async function trackBrowserPageview(options: {
  route?: string | null;
  accountType?: string | number | null;
  isAuthenticated?: boolean;
  userId?: string;
}): Promise<boolean> {
  const { key, host } = getClientPosthogConfig();
  if (!key || typeof window === 'undefined') {
    return false;
  }

  const route = sanitizeRoute(options.route || window.location.pathname) || '/';
  const accountType = options.accountType != null
    ? String(options.accountType)
    : sharedContext.account_type;
  const internalActor = resolveInternalActor(accountType);

  if (shouldSuppressClientCapture({ route, accountType })) {
    return false;
  }

  const distinctId = getClientDistinctId(options.userId);
  const sessionId = getOrCreateSessionId();
  const { referrer, referringDomain } = getSafeReferrer();

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

  const currentUrl = `${window.location.origin}${route}`;

  posthogCapture(
    {
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
      },
    },
    host,
  );

  activePageview = {
    route,
    startedAtMs: Date.now(),
    sessionId,
  };

  bindBeforeUnloadPageleave({ key, host });
  return true;
}

export async function captureClientEvent<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsBaseProps = {},
): Promise<boolean> {
  const { key, host } = getClientPosthogConfig();
  if (!key || typeof window === 'undefined') {
    return false;
  }

  const route = resolveRoute(props) || sharedContext.route;
  const combinedProps: AnalyticsBaseProps = {
    ...sharedContext,
    ...props,
    route,
    source_surface: props.source_surface || sharedContext.source_surface || surfaceFromRoute(route),
    is_authenticated: props.is_authenticated ?? sharedContext.is_authenticated,
    user_id: props.user_id || sharedContext.user_id,
    internal_actor: props.internal_actor ?? resolveInternalActor(props.account_type ?? sharedContext.account_type),
  };

  if (shouldSuppressClientCapture({
    route,
    accountType: combinedProps.account_type,
  })) {
    return false;
  }

  const sanitized = sanitizeAnalyticsProps(withCoreAction(event, combinedProps));
  const distinctId = combinedProps.user_id || getAnonymousDistinctId();

  posthogCapture(
    {
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: {
        ...sanitized,
        $lib: 'cassette-ui',
      },
    },
    host,
  );

  return true;
}

export async function identifyClientUser(context: IdentifyUserContext): Promise<boolean> {
  const { key, host } = getClientPosthogConfig();
  if (!key || typeof window === 'undefined' || !context.userId) {
    return false;
  }

  const route = resolveRoute();
  if (shouldSuppressClientCapture({ route, accountType: context.accountType })) {
    return false;
  }

  const anonymousDistinctId = getAnonymousDistinctId();
  if (anonymousDistinctId !== context.userId) {
    const guardKey = aliasMergeGuardKey(anonymousDistinctId, context.userId);
    if (!hasAliasMergeGuard(guardKey)) {
      posthogCapture(
        {
          api_key: key,
          event: '$create_alias',
          distinct_id: anonymousDistinctId,
          properties: {
            distinct_id: anonymousDistinctId,
            alias: context.userId,
            $lib: 'cassette-ui',
          },
        },
        host,
      );
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

  const setPayload = sanitizeAnalyticsProps({
    user_id: context.userId,
    is_authenticated: context.isAuthenticated ?? true,
    organization_id: context.organizationId,
    role: context.role,
    plan: context.plan,
    account_type: context.accountType != null ? String(context.accountType) : undefined,
    internal_actor: resolveInternalActor(context.accountType),
  });

  posthogCapture(
    {
      api_key: key,
      event: '$identify',
      distinct_id: context.userId,
      properties: {
        ...setPayload,
        $set: setPayload,
      },
    },
    host,
  );

  if (context.organizationId) {
    posthogCapture(
      {
        api_key: key,
        event: '$groupidentify',
        distinct_id: context.userId,
        properties: {
          $group_type: 'organization',
          $group_key: context.organizationId,
        },
      },
      host,
    );
  }

  return true;
}

export function resetAnalyticsContextForTests(): void {
  sharedContext = {};
  activePageview = null;
  beforeUnloadBound = false;
}
