'use client';

import { ReactNode, useEffect } from 'react';
import { initPosthog } from '@/lib/analytics/posthog.client';

interface AnalyticsProviderProps {
  children: ReactNode;
}

export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  useEffect(() => {
    initPosthog();
  }, []);

  return <>{children}</>;
}
