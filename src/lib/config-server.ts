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
  console.log('🔍 Validating server configuration...');
  console.log('🌍 Environment Details:', {
    NODE_ENV: process.env.NODE_ENV || 'not set',
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    platform: process.platform,
    nodeVersion: process.version,
  });

  // Check all music API credentials
  const musicApiStatus = {
    spotify: {
      clientId: serverConfig.spotify.clientId ? `present (${serverConfig.spotify.clientId.length} chars)` : 'MISSING',
      clientSecret: serverConfig.spotify.clientSecret ? `present (${serverConfig.spotify.clientSecret.length} chars)` : 'MISSING',
    },
    appleMusic: {
      keyId: serverConfig.appleMusic.keyId ? `present (${serverConfig.appleMusic.keyId.length} chars)` : 'MISSING',
      teamId: serverConfig.appleMusic.teamId ? `present (${serverConfig.appleMusic.teamId.length} chars)` : 'MISSING',
      privateKey: serverConfig.appleMusic.privateKey ? {
        length: serverConfig.appleMusic.privateKey.length,
        hasBeginMarker: serverConfig.appleMusic.privateKey.includes('-----BEGIN'),
        hasEndMarker: serverConfig.appleMusic.privateKey.includes('-----END'),
        preview: serverConfig.appleMusic.privateKey.substring(0, 50) + '...',
      } : 'MISSING',
    },
  };

  console.log('🎵 Music API Configuration Status:', musicApiStatus);

  const required = {
    'SUPABASE_SERVICE_ROLE_KEY': serverConfig.supabase.serviceRoleKey,
    'NEXTAUTH_SECRET': serverConfig.nextAuth.secret,
    'SPOTIFY_CLIENT_SECRET': serverConfig.spotify.clientSecret,
    'APPLE_MUSIC_PRIVATE_KEY': serverConfig.appleMusic.privateKey,
  };

  const optional = {
    'SPOTIFY_CLIENT_ID': serverConfig.spotify.clientId,
    'APPLE_MUSIC_KEY_ID': serverConfig.appleMusic.keyId,
    'APPLE_MUSIC_TEAM_ID': serverConfig.appleMusic.teamId,
    'REPORT_WEBHOOK_URL': serverConfig.webhooks.reportUrl,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value || value.includes('placeholder'))
    .map(([key]) => key);

  const missingOptional = Object.entries(optional)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error(`❌ Missing REQUIRED server-only environment variables:`, missing);
  } else {
    console.log('✅ All required server environment variables are present');
  }

  if (missingOptional.length > 0) {
    console.warn(`⚠️ Missing OPTIONAL environment variables (may affect some features):`, missingOptional);
  }

  // Log deployment info if available
  if (process.env.VERCEL) {
    console.log('🚀 Running on Vercel:', {
      env: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      url: process.env.VERCEL_URL,
    });
  }

  return missing.length === 0;
}