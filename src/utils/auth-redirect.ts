const STORAGE_KEY = 'cassette_auth_redirect';
const REDIRECT_BASE_URL = 'https://cassette.invalid';

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

export const authRedirectService = {
  save(redirect: string | null | undefined) {
    if (typeof window === 'undefined') return;
    const normalized = normalizeAuthRedirect(redirect);
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, normalized);
  },

  get() {
    if (typeof window === 'undefined') return null;
    const normalized = normalizeAuthRedirect(sessionStorage.getItem(STORAGE_KEY));
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEY);
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
    sessionStorage.removeItem(STORAGE_KEY);
  },
};
