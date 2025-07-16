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
  // Check if we have a local API URL set - this takes precedence for local development
  if (process.env.NEXT_PUBLIC_API_URL_LOCAL) {
    return process.env.NEXT_PUBLIC_API_URL_LOCAL;
  }
  
  // If no local URL is set, use the production URL
  return process.env.NEXT_PUBLIC_API_URL || 'https://nm2uheummh.us-east-1.awsapprunner.com';
}