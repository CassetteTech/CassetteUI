export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-role-key',
  },

  // NextAuth Configuration
  nextAuth: {
    url: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    secret: process.env.NEXTAUTH_SECRET || 'placeholder-secret',
  },

  // Music API Configuration
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID || '',
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET || '',
  },

  appleMusic: {
    developerToken: process.env.APPLE_MUSIC_DEVELOPER_TOKEN || '',
    keyId: process.env.APPLE_MUSIC_KEY_ID || '',
    teamId: process.env.APPLE_MUSIC_TEAM_ID || '',
    privateKey: process.env.APPLE_MUSIC_PRIVATE_KEY || '',
  },

  // Backend API Configuration
  api: {
    url: process.env.NODE_ENV === 'production' 
      ? process.env.NEXT_PUBLIC_API_URL || 'https://nm2uheummh.us-east-1.awsapprunner.com'
      : process.env.NEXT_PUBLIC_API_URL_LOCAL || 'http://localhost:5173',
  },

  // Feature Flags
  features: {
    enableLambdaWarmup: process.env.ENABLE_LAMBDA_WARMUP === 'true',
  },

  // Webhook Configuration
  webhooks: {
    reportUrl: process.env.REPORT_WEBHOOK_URL || '',
  },

  // App Configuration
  app: {
    domain: process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://cassetteinc.org',
  },
} as const;

export type Config = typeof config;