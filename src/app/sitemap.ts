import type { MetadataRoute } from 'next';

// Static public marketing/content surfaces only; user-generated routes
// (posts, profiles) are discovered through links and OG metadata instead.
const PUBLIC_ROUTES = [
  '/',
  '/explore',
  '/promote',
  '/about',
  '/team',
  '/release-notes',
  '/privacy',
  '/terms',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://www.cassette.tech';
  return PUBLIC_ROUTES.map((route) => ({ url: new URL(route, base).toString() }));
}
