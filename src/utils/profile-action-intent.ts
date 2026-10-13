/**
 * A Follow or Join that a fan started in an in-app browser travels to the
 * device browser in the URL (`?intent=`), because per-tab session storage
 * does not move between browsers. The URL is untrusted: it never commits an
 * action by itself. Signed out, it restarts the existing sign-in flow; signed
 * in, the page asks the fan to confirm.
 */

import { normalizeAuthRedirect } from './auth-redirect';

export type ProfileActionIntent =
  | { action: 'follow' }
  | { action: 'join'; interval: 'month' | 'year' };

const REDIRECT_BASE_URL = 'https://cassette.invalid';
const PROFILE_PATH = /^\/profile\/[A-Za-z0-9_]{1,50}$/;

const single = (params: URLSearchParams, key: string) => {
  const values = params.getAll(key);
  return values.length === 1 ? values[0] : null;
};

/** Reads `?intent=follow` or `?intent=join&interval=month|year`; anything else is no intent. */
export function parseProfileActionIntent(params: URLSearchParams): ProfileActionIntent | null {
  const intent = single(params, 'intent');
  if (intent === 'follow') return { action: 'follow' };
  if (intent !== 'join') return null;
  const interval = single(params, 'interval');
  return interval === 'month' || interval === 'year' ? { action: 'join', interval } : null;
}

/**
 * The local path to open in the device browser for a sign-in that would
 * return to `returnPath`. A Follow or Join return on a profile becomes the
 * profile with its intent; any other return opens sign-in with the same
 * return. The page paths of the auth flow return nowhere.
 */
export function browserHandoffPath(returnPath: string | null | undefined): string {
  const normalized = normalizeAuthRedirect(returnPath);
  if (!normalized || normalized === '/' || /^\/(auth|onboarding)($|[/?#])/.test(normalized)) return '/auth/signin';

  const url = new URL(normalized, REDIRECT_BASE_URL);
  if (PROFILE_PATH.test(url.pathname)) {
    const params = url.searchParams;
    if (single(params, 'follow') === '1') {
      params.delete('follow');
      params.set('intent', 'follow');
      return `${url.pathname}?${params}`;
    }
    const interval = single(params, 'interval');
    if (single(params, 'membership') === 'join' && (interval === 'month' || interval === 'year')) {
      params.delete('membership');
      params.delete('interval');
      params.set('intent', 'join');
      params.set('interval', interval);
      return `${url.pathname}?${params}`;
    }
  }
  return `/auth/signin?redirect=${encodeURIComponent(normalized)}`;
}
