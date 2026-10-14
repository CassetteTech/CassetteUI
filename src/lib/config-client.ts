import { getApiUrl, getBaseUrl } from './utils/url';

export const clientConfig = {
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  },

  api: {
    url: getApiUrl(),
  },

  features: {
    enableLambdaWarmup: process.env.NEXT_PUBLIC_ENABLE_LAMBDA_WARMUP === 'true',
    useCassetteSpotifyAccount: process.env.NEXT_PUBLIC_USE_CASSETTE_SPOTIFY_ACCOUNT === 'true',
  },

  app: {
    domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://cassette.tech',
    baseUrl: getBaseUrl(),
  },

  appleMusic: {
    developerToken: process.env.NEXT_PUBLIC_APPLE_MUSIC_DEVELOPER_TOKEN || '',
  },
} as const;

export type ClientConfig = typeof clientConfig;
