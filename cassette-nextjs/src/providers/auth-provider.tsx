'use client';

import { useEffect } from 'react';
import { authService } from '@/services/auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize the auth listener when the app starts
    authService.initializeAuthListener();
  }, []);

  return <>{children}</>;
}