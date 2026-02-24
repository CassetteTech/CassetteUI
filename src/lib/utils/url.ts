// URL utilities for environment-based configuration

/**
 * Check if we're running in production environment
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get the base URL for the current environment
 * Works in both client and server contexts
 */
export function getBaseUrl(): string {
  // In production, use the configured domain
  if (isProduction()) {
    return process.env.NEXT_PUBLIC_APP_DOMAIN || 'https://cassetteinc.org';
  }
  
  // In development, check if we're in browser context
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Server-side in development - use NEXTAUTH_URL or fallback
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
}

/**
 * Generate a callback URL for OAuth flows
 */
export function getCallbackUrl(path: string): string {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}


/**
 * Get the API base URL for external service calls
 */
export function getApiUrl(): string {
  const sanitize = (value: string | undefined) => {
    const trimmed = value?.trim();
    return trimmed && trimmed !== 'undefined' && trimmed !== 'null' ? trimmed : undefined;
  };

  // Check if we have a local API URL set - this takes precedence for local development
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
