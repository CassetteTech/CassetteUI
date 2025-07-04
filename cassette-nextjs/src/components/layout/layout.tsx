'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { useAuthState } from '@/hooks/use-auth';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { config } from '@/lib/config';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { isLoading } = useAuthState();

  useEffect(() => {
    // Initialize auth listener
    authService.initializeAuthListener();

    // Warmup lambdas if enabled
    if (config.features.enableLambdaWarmup) {
      apiService.warmupLambdas().catch(console.warn);
    }
  }, []);

  const isAuthPage = pathname?.startsWith('/auth');
  const showNavbar = !isAuthPage;
  const showFooter = !isAuthPage;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {showNavbar && <Navbar />}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}