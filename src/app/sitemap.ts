import type { MetadataRoute } from 'next';
import { PUBLIC_STATIC_ROUTES, SITE_URL } from '@/lib/seo';

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_STATIC_ROUTES.map((route) => ({
    url: new URL(route, SITE_URL).href,
    changeFrequency: route === '/' || route === '/explore' ? 'daily' : 'monthly',
    priority: route === '/' ? 1 : 0.7,
  }));
}
