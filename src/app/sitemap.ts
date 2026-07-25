import type { MetadataRoute } from 'next';
import { PUBLIC_STATIC_ROUTES, SITE_URL } from '@/lib/seo';

// Static routes only. Enumerating every post would aim crawlers at the SSR
// metadata path that has already exhausted the Bridge transaction pool once;
// posts are discovered through shares. Any future post feed here must be
// bounded and cached, not a full dump.
export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_STATIC_ROUTES.map((route) => ({
    url: new URL(route, SITE_URL).href,
    changeFrequency: route === '/' || route === '/explore' ? 'daily' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
