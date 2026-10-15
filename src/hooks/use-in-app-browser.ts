'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { detectInAppBrowser, type InAppBrowser } from '@/utils/in-app-browser';

const subscribe = () => () => {};

export function useInAppBrowser(): InAppBrowser | null {
  const userAgent = useSyncExternalStore(subscribe, () => navigator.userAgent, () => null);
  return useMemo(() => detectInAppBrowser(userAgent), [userAgent]);
}
