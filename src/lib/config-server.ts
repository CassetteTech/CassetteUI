import { getBaseUrl } from './utils/url';

// Server-only configuration - contains sensitive secrets
// This config should NEVER be imported by client components
// Only use in API routes, server actions, and server-side code

export const serverConfig = {
  // Supabase server configuration
  supabase: {
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  },

  // NextAuth configuration
  nextAuth: {
    url: getBaseUrl(),
    secret: process.env.NEXTAUTH_SECRET || 'placeholder-secret',
  },

  // Music API secrets
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  },

  appleMusic: {
    keyId: process.env.APPLE_MUSIC_KEY_ID || '',
    teamId: process.env.APPLE_MUSIC_TEAM_ID || '',
    privateKey: process.env.APPLE_MUSIC_PRIVATE_KEY || '',
  },

  // Webhook secrets
  webhooks: {
    reportUrl: process.env.REPORT_WEBHOOK_URL || '',
  },
} as const;

export type ServerConfig = typeof serverConfig;

// Validation function for server-only environment variables
export function validateServerConfig() {
  const required = {
    'SUPABASE_SERVICE_ROLE_KEY': serverConfig.supabase.serviceRoleKey,
    'NEXTAUTH_SECRET': serverConfig.nextAuth.secret,
    'SPOTIFY_CLIENT_SECRET': serverConfig.spotify.clientSecret,
    'APPLE_MUSIC_PRIVATE_KEY': serverConfig.appleMusic.privateKey,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value || value.includes('placeholder'))
    .map(([key]) => key);

  if (missing.length > 0) {
    console.warn(`Missing server-only environment variables: ${missing.join(', ')}`);
  }

  return missing.length === 0;
}