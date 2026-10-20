const STORAGE_KEY = 'cassette_auth_redirect';
const REDIRECT_BASE_URL = 'https://cassette.invalid';

const REDIRECT_TTL_MS = 30 * 60 * 1000;

const hasUnsafePathCharacters = (value: string) => /[\\\u0000-\u001f\u007f]/.test(value);

export const normalizeAuthRedirect = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || hasUnsafePathCharacters(trimmed)) {
    return null;
  }

  let decoded = trimmed;
  try {
    for (let index = 0; index < 2; index += 1) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }
  } catch {
    return null;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//') || hasUnsafePathCharacters(decoded)) {
    return null;
  }

  try {
    if (new URL(trimmed, REDIRECT_BASE_URL).origin !== REDIRECT_BASE_URL) {
      return null;
    }
  } catch {
    return null;
  }

  return trimmed;
};

// The home page and the auth and onboarding pages add no redirect, so the
// default destination applies.
export const buildAuthPath = (
  authPath: '/auth/signin' | '/auth/signup',
  returnPath: string | null | undefined,
) => {
  const redirect = normalizeAuthRedirect(returnPath);
  if (!redirect || redirect === '/' || /^\/(auth|onboarding)($|[/?])/.test(redirect)) return authPath;
  return `${authPath}?redirect=${encodeURIComponent(redirect)}`;
};

export const isPromoteIntentRedirect = (value: string | null | undefined) => {
  const normalized = normalizeAuthRedirect(value);
  return normalized != null && /^\/promote($|[/?])/.test(normalized);
};

export type MembershipIntent = { username: string; interval: 'month' | 'year' };

export const parseMembershipIntentRedirect = (
  value: string | null | undefined,
): MembershipIntent | null => {
  const normalized = normalizeAuthRedirect(value);
  if (!normalized) return null;
  const url = new URL(normalized, REDIRECT_BASE_URL);
  const match = /^\/profile\/([A-Za-z0-9_]{1,50})$/.exec(url.pathname);
  if (!match || url.searchParams.get('membership') !== 'join') return null;
  const interval = url.searchParams.get('interval');
  if (interval !== 'month' && interval !== 'year') return null;
  return { username: match[1], interval };
};

function readStoredRedirect(): string | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as { value?: unknown; expiresAt?: unknown };
    if (typeof parsed.value !== 'string' || typeof parsed.expiresAt !== 'number') {
      return null;
    }
    if (parsed.expiresAt <= Date.now()) {
      return null;
    }
    return parsed.value;
  } catch {
    return null;
  }
}

export const authRedirectService = {
  save(redirect: string | null | undefined) {
    if (typeof window === 'undefined' || redirect == null) return;
    const normalized = normalizeAuthRedirect(redirect);
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ value: normalized, expiresAt: Date.now() + REDIRECT_TTL_MS }),
    );
  },

  get() {
    if (typeof window === 'undefined') return null;
    const normalized = normalizeAuthRedirect(readStoredRedirect());
    if (!normalized) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return normalized;
  },

  consume() {
    const redirect = this.get();
    this.clear();
    return redirect;
  },

  clear() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  },
};
