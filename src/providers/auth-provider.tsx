'use client';

import { useEffect } from 'react';
import { authService } from '@/services/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const dispose = authService.initializeAuthListener();
    return () => dispose && dispose();
  }, []);

  return <>{children}</>;
}