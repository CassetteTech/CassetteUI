export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function getBaseUrl(): string {
  if (isProduction()) {
    return process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://cassette.tech';
  }
  
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

export function getCallbackUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}


export function getApiUrl(): string {
  const sanitize = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed && trimmed !== 'undefined' && trimmed !== 'null' ? trimmed : undefined;
  };

  const localUrl = sanitize(process.env.NEXT_PUBLIC_API_URL_LOCAL);
  if (localUrl) {
    return localUrl;
  }

  const configuredUrl = sanitize(process.env.NEXT_PUBLIC_API_URL);
  if (configuredUrl) {
    return configuredUrl;
  }

  throw new Error(
    'Missing API base URL. Set NEXT_PUBLIC_API_URL_LOCAL (dev) or NEXT_PUBLIC_API_URL (shared/prod).'
  );
}

export function getBrowserApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return '';
  }

  return getApiUrl();
}
