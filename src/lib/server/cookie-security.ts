interface CookieSecurityConfig {
  nodeEnv?: string;
  appDomain?: string;
  nextAuthUrl?: string;
}

export function shouldUseSecureCookies({
  nodeEnv = process.env.NODE_ENV,
  appDomain = process.env.NEXT_PUBLIC_APP_DOMAIN,
  nextAuthUrl = process.env.NEXTAUTH_URL,
}: CookieSecurityConfig = {}): boolean {
  for (const value of [appDomain, nextAuthUrl]) {
    if (!value?.trim()) {
      continue;
    }

    try {
      return new URL(value).protocol === 'https:';
    } catch {
      continue;
    }
  }

  return nodeEnv === 'production';
}
