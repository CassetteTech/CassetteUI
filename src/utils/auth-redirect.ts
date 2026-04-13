const STORAGE_KEY = 'cassette_auth_redirect';

const normalizeRedirect = (value: string | null | undefined) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return null;
  }
  return trimmed;
};

export const authRedirectService = {
  save(redirect: string | null | undefined) {
    if (typeof window === 'undefined') return;
    const normalized = normalizeRedirect(redirect);
    if (!normalized) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, normalized);
  },

  get() {
    if (typeof window === 'undefined') return null;
    const normalized = normalizeRedirect(sessionStorage.getItem(STORAGE_KEY));
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
