'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { detectInAppBrowser, type InAppBrowser } from '@/utils/in-app-browser';

const subscribe = () => () => {};

/** The social app's embedded browser this page runs in, or null. The server render and hydration assume none. */
export function useInAppBrowser(): InAppBrowser | null {
  const userAgent = useSyncExternalStore(subscribe, () => navigator.userAgent, () => null);
  return useMemo(() => detectInAppBrowser(userAgent), [userAgent]);
}
