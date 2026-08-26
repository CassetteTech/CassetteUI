import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { NOINDEX_ROUTES, NOINDEX_SUBTREES } from "./src/lib/seo";

const distDir = process.env.NEXT_DIST_DIR ?? ".next";

// Most private pages are client components, which cannot export `metadata`.
// An X-Robots-Tag header carries the same directive without a layout file per
// route. This is deliberately belt-and-braces with the robots.txt disallow
// list: bots that ignore robots.txt still see the header on a direct fetch.
const NOINDEX_HEADERS = [
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ['local.cassette.tech'],
  distDir,
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    useTypeScriptCli: true,
  },
  typescript: {
    tsconfigPath: "tsconfig.typecheck.json",
  },
  images: {
    qualities: [75, 80],
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
        hostname: 'image-cdn-ak.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'image-cdn-fa.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'blend-playlist-covers.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'seeded-session-images.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lineup-images.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'dailymix-images.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'newjams-images.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'thisis-images.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'wrapped-images.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'pl-preview-images.scdn.co',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'seed-mix-image.spotifycdn.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'charts-images.scdn.co',
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
        hostname: '**.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'storage.ko-fi.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '**',
      },
    ],
  },
  async redirects() {
    return [
      {
        source: '/changelog',
        destination: '/release-notes',
        permanent: true,
      },
      // Email/password auth is temporarily disabled (Google-only), so the
      // password reset flow is parked too — a password set here could never be
      // used to sign in. Remove these when the email auth blocks in
      // /auth/signin and /auth/signup are re-enabled.
      {
        source: '/auth/forgot-password',
        destination: '/auth/signin',
        permanent: false,
      },
      {
        source: '/auth/reset',
        destination: '/auth/signin',
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      // Exact matches only — `/profile/:username` is public and must stay indexable.
      ...NOINDEX_ROUTES.map((route) => ({
        source: route,
        headers: NOINDEX_HEADERS,
      })),
      ...NOINDEX_SUBTREES.flatMap((subtree) => [
        { source: subtree, headers: NOINDEX_HEADERS },
        { source: `${subtree}/:path*`, headers: NOINDEX_HEADERS },
      ]),
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  telemetry: false,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
