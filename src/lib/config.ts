// Legacy config export for backward compatibility
// New code should use clientConfig or serverConfig directly
import { clientConfig } from './config-client';
import { serverConfig } from './config-server';

// Combined config for backward compatibility
// WARNING: This exports sensitive secrets - use with caution
export const config = {
  // Client-safe configuration
  supabase: {
    url: clientConfig.supabase.url,
    anonKey: clientConfig.supabase.anonKey,
    // Server-only secrets
    serviceRoleKey: serverConfig.supabase.serviceRoleKey,
  },

  // Server-only configuration
  nextAuth: serverConfig.nextAuth,

  // Music API configuration (mixed client/server)
  spotify: {
    clientId: serverConfig.spotify.clientId,
    clientSecret: serverConfig.spotify.clientSecret,
  },

  appleMusic: {
    developerToken: process.env.APPLE_MUSIC_DEVELOPER_TOKEN || '',
    keyId: serverConfig.appleMusic.keyId,
    teamId: serverConfig.appleMusic.teamId,
    privateKey: serverConfig.appleMusic.privateKey,
  },

  // Client-safe configuration
  api: clientConfig.api,
  features: clientConfig.features,
  app: clientConfig.app,

  // Server-only secrets
  webhooks: serverConfig.webhooks,
} as const;

export type Config = typeof config;

// Re-export the split configs
export { clientConfig } from './config-client';
export { serverConfig, validateServerConfig } from './config-server';