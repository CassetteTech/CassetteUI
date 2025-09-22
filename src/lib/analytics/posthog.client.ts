'use client';

import posthog from 'posthog-js';

let isInitialized = false;

const withLeadingSlash = (value: string) => (value.startsWith('/') ? value : `/${value}`);
const withoutTrailingSlash = (value: string) => value.replace(/\/+$/, '');

export const initPosthog = () => {
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  const apiKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('NEXT_PUBLIC_POSTHOG_KEY is not set; PostHog will not be initialised.');
    }
    return;
  }

  const proxyPath = process.env.NEXT_PUBLIC_POSTHOG_PROXY_PATH ?? '/_ph';
  const trimmedProxyPath = withoutTrailingSlash(proxyPath);
  const apiHost = trimmedProxyPath ? withLeadingSlash(trimmedProxyPath) : '/_ph';

  posthog.init(apiKey, {
    api_host: apiHost,
    ui_host: process.env.NEXT_PUBLIC_POSTHOG_UI_HOST ?? 'https://us.posthog.com',
    capture_exceptions: true,
    capture_pageview: false,
    persistence: 'localStorage+cookie',
    debug: process.env.NODE_ENV === 'development',
  });

  isInitialized = true;
};

export { posthog };
