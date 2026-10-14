/**
 * Canonical public origin. Must agree with CassetteBridge's
 * `Auth:FrontendBaseUrl`, which stamps the canonical URL onto post metadata.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://www.cassette.tech';

export const DEFAULT_SOCIAL_PREVIEW = {
  images: [{
    url: '/images/backgrounds/cassette-engraved-footer-v2.png',
    width: 1672,
    height: 941,
    alt: 'An engraved cassette surrounded by unspooled tape',
  }],
};

export const PUBLIC_STATIC_ROUTES = [
  '/',
  '/explore',
  '/promote',
  '/about',
  '/team',
  '/release-notes',
  '/privacy',
  '/terms',
] as const;

export const NOINDEX_ROUTES = [
  '/add-music',
  '/studio',
  '/feed',
  '/onboarding',
  '/collections',
  '/profile',
  '/profile/edit',
  '/login',
  '/signup',
  '/spotify_callback',
  '/deezer_callback',
  // Development leftovers. Kept out of the index while they still exist; they
  // are candidates for deletion rather than long-term maintenance.
  '/debug',
  '/demo',
  '/demo/profile',
  '/music-auth-demo',
] as const;

export const NOINDEX_SUBTREES = ['/auth', '/internal', '/studio'] as const;

export function buildRobotsDisallowList(): string[] {
  return [
    '/api/',
    ...NOINDEX_SUBTREES.map((subtree) => `${subtree}/`),
    ...NOINDEX_ROUTES.map((route) => `${route}$`),
  ];
}
