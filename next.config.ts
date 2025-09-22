import type { NextConfig } from "next";

const normalizeProxyPath = (value: string) => {
  const trimmed = value.replace(/\/+$/, '');
  if (!trimmed) {
    return '/_ph';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const posthogProxyPath = normalizeProxyPath(process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH ?? '/_ph');

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'is1-ssl.mzstatic.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'is2-ssl.mzstatic.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'is3-ssl.mzstatic.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'is4-ssl.mzstatic.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'is5-ssl.mzstatic.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'i.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'mosaic.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'cdn-images.dzcdn.net',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'e-cdns-images.dzcdn.net',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'wefxtfnobcmlzysornxw.supabase.co',
        port: '',
        pathname: '**',
      },
    ],
  },
  async rewrites() {
    return [
      {
        source: `${posthogProxyPath}/static/:path*`,
        destination: 'https://us-assets.i.posthog.com/static/:path*',
      },
      {
        source: `${posthogProxyPath}/:path*`,
        destination: 'https://us.i.posthog.com/:path*',
      },
    ];
  },
  // This is required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
