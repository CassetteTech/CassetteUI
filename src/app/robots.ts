import type { MetadataRoute } from 'next';
import { SITE_URL, buildRobotsDisallowList } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: buildRobotsDisallowList(),
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
