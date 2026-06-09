import { getBaseUrl } from './utils/url';
import { appLogger } from '@/lib/observability/logger';

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
  appLogger.debug('server_config_validation_started', {
    node_env: process.env.NODE_ENV || 'not set',
    is_production: process.env.NODE_ENV === 'production',
    is_development: process.env.NODE_ENV === 'development',
    platform: process.platform,
    node_version: process.version,
  });

  // Check all music API credentials
  const musicApiStatus = {
    spotify: {
      client_id_present: Boolean(serverConfig.spotify.clientId),
      client_id_length: serverConfig.spotify.clientId.length || undefined,
      client_secret_present: Boolean(serverConfig.spotify.clientSecret),
      client_secret_length: serverConfig.spotify.clientSecret.length || undefined,
    },
    appleMusic: {
      key_id_present: Boolean(serverConfig.appleMusic.keyId),
      key_id_length: serverConfig.appleMusic.keyId.length || undefined,
      team_id_present: Boolean(serverConfig.appleMusic.teamId),
      team_id_length: serverConfig.appleMusic.teamId.length || undefined,
      private_key: serverConfig.appleMusic.privateKey ? {
        length: serverConfig.appleMusic.privateKey.length,
        has_begin_marker: serverConfig.appleMusic.privateKey.includes('-----BEGIN'),
        has_end_marker: serverConfig.appleMusic.privateKey.includes('-----END'),
      } : { present: false },
    },
  };

  appLogger.debug('music_api_configuration_status', musicApiStatus);

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
    appLogger.error('server_config_required_env_missing', { missing });
  } else {
    appLogger.debug('server_config_required_env_present');
  }

  if (missingOptional.length > 0) {
    appLogger.warn('server_config_optional_env_missing', { missing_optional: missingOptional });
  }

  // Log deployment info if available
  if (process.env.VERCEL) {
    appLogger.debug('server_config_vercel_environment', {
      env: process.env.VERCEL_ENV,
      region: process.env.VERCEL_REGION,
      url: process.env.VERCEL_URL,
    });
  }

  return missing.length === 0;
}
