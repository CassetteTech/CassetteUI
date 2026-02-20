const ANON_ID_STORAGE_KEY = 'cassette_analytics_anon_id_v1';
const ANON_ID_COOKIE_NAME = 'cassette_analytics_anon_id';
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;

function generateAnonymousId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `anon_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${TWO_YEARS_SECONDS}; SameSite=Lax`;
}

export function getOrCreateAnonymousId(): string | null {
  if (typeof window === 'undefined') return null;

  const fromStorage = window.localStorage?.getItem(ANON_ID_STORAGE_KEY)?.trim();
  if (fromStorage) {
    writeCookie(ANON_ID_COOKIE_NAME, fromStorage);
    return fromStorage;
  }

  const fromCookie = readCookie(ANON_ID_COOKIE_NAME)?.trim();
  if (fromCookie) {
    window.localStorage?.setItem(ANON_ID_STORAGE_KEY, fromCookie);
    return fromCookie;
  }

  const generated = generateAnonymousId();
  window.localStorage?.setItem(ANON_ID_STORAGE_KEY, generated);
  writeCookie(ANON_ID_COOKIE_NAME, generated);
  return generated;
}
