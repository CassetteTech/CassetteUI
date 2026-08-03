// Single source of truth for crawlability: the canonical origin, what belongs
// in the sitemap, and what must never be indexed. Imported by app/robots.ts,
// app/sitemap.ts, app/layout.tsx (metadataBase) and next.config.ts (the
// X-Robots-Tag headers), so the four never drift apart.

/**
 * Canonical public origin. Must agree with CassetteBridge's
 * `Auth:FrontendBaseUrl`, which stamps the canonical URL onto post metadata.
 */
export const SITE_URL = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://www.cassette.tech';

/** Public routes with stable content. Deliberately excludes every `/post/*`
 *  and `/profile/*` URL — see the note on sitemap size below. */
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

/**
 * Authenticated, transient, and internal routes. Nothing here should reach an
 * index: they are either behind auth, single-use OAuth landings, or staff-only.
 *
 * `/profile` and `/profile/edit` are listed exactly — `/profile/:username` is
 * a public, indexable page and must not be caught by a prefix match.
 */
export const NOINDEX_ROUTES = [
  '/add-music',
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

/** Route subtrees where every descendant is private. */
export const NOINDEX_SUBTREES = ['/auth', '/internal'] as const;

/**
 * robots.txt disallow rules.
 *
 * Disallow is prefix-matched, so exact routes are `$`-anchored: a bare
 * `/profile` rule would also block every public `/profile/:username` page.
 * Subtrees keep the trailing slash and stay prefix-matched on purpose.
 */
export function buildRobotsDisallowList(): string[] {
  return [
    '/api/',
    ...NOINDEX_SUBTREES.map((subtree) => `${subtree}/`),
    ...NOINDEX_ROUTES.map((route) => `${route}$`),
  ];
}
