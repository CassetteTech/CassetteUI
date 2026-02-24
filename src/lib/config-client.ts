import { getApiUrl, getBaseUrl } from './utils/url';

// Client-safe configuration - only NEXT_PUBLIC_ variables
// This config can be safely imported by client components
export const clientConfig = {
  // Supabase public configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  },

  // Backend API configuration
  api: {
    url: getApiUrl(),
  },

  // Feature flags
  features: {
    enableLambdaWarmup: process.env.NEXT_PUBLIC_ENABLE_LAMBDA_WARMUP === 'true',
    // When true, Spotify playlists are created on Cassette's account (no user Spotify login required)
    useCassetteSpotifyAccount: process.env.NEXT_PUBLIC_USE_CASSETTE_SPOTIFY_ACCOUNT === 'true',
  },

  // App configuration
  app: {
    domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://cassetteinc.org',
    baseUrl: getBaseUrl(),
  },

  // Music service configuration
  appleMusic: {
    developerToken: process.env.NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN || '',
  },
} as const;

export type ClientConfig = typeof clientConfig;
