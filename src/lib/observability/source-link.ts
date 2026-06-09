function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function normalizeRouteContext(value: string | undefined): string {
  if (!value) return '/';

  const path = (() => {
    try {
      return new URL(value).pathname;
    } catch {
      return value.split('?')[0].split('#')[0];
    }
  })();

  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (/^\/post\/[^/]+$/.test(normalized)) return '/post/[id]';
  if (/^\/artist\/[^/]+$/.test(normalized)) return '/artist/[id]';
  if (/^\/profile\/[^/]+$/.test(normalized)) return '/profile/[username]';
  return normalized || '/';
}

export function getSourceDomain(sourceLink: string | undefined): string | undefined {
  if (!sourceLink) return undefined;
  try {
    return new URL(sourceLink.trim()).hostname.toLowerCase();
  } catch {
    return undefined;
  }
}

export async function hashSourceLink(sourceLink: string | undefined): Promise<string | undefined> {
  if (!sourceLink || typeof crypto === 'undefined' || !crypto.subtle) return undefined;

  try {
    const parsed = new URL(sourceLink.trim());
    parsed.protocol = parsed.protocol.toLowerCase();
    parsed.hostname = parsed.hostname.toLowerCase();
    parsed.search = '';
    parsed.hash = '';
    return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(parsed.toString())));
  } catch {
    return undefined;
  }
}
