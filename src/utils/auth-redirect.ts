const STORAGE_KEY = 'cassette_auth_redirect';
const REDIRECT_BASE_URL = 'https://cassette.invalid';

// localStorage (not sessionStorage) so the redirect survives flows that
// resume in a different tab — most importantly the email-verification link,
// which opens in a fresh tab where per-tab storage is empty. The TTL bounds
// how long a stale destination can hijack a later, unrelated sign-in.
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
    // Catch encoded and double-encoded protocol-relative or backslash paths.
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

// A redirect aimed at the paid-promotion flow marks the signup as
// promote-intent: auth and onboarding surfaces reframe their copy and trim
// fan-only steps, without any account-type or schema difference.
export const isPromoteIntentRedirect = (value: string | null | undefined) => {
  const normalized = normalizeAuthRedirect(value);
  return normalized != null && /^\/promote($|[/?])/.test(normalized);
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
  // Absent values are a no-op rather than a clear: pages save whatever is in
  // their ?redirect param on load, and a paramless sign-in page opened from
  // an email link must not wipe the redirect another tab already saved.
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
    // normalizeAuthRedirect stays authoritative on read regardless of what
    // was persisted.
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
