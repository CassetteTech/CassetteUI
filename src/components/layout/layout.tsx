'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { useAuthState } from '@/hooks/use-auth';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { clientConfig } from '@/lib/config-client';
import { SupportFloatingButton } from './support-floating-button';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { isLoading } = useAuthState();
  // No longer need isMobileMenuOpen state

  useEffect(() => {
    authService.initializeAuthListener();
    if (clientConfig.features.enableLambdaWarmup) {
      apiService.warmupLambdas().catch(console.warn);
    }
  }, []);

  const isAuthPage = pathname?.startsWith('/auth');
  const isProfilePage = pathname?.startsWith('/profile') || pathname?.startsWith('/add-music');
  const isHomePage = pathname === '/';
  const isPostPage = pathname?.startsWith('/post');

  const showNavbar = !isAuthPage;
  const showFooter = !isAuthPage && !isHomePage && !isPostPage;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* We don't render MobileMenu here anymore, it's self-contained in Navbar */}
      
      {showNavbar && (
        <div className={isProfilePage ? 'lg:hidden' : ''}>
          <Navbar />
        </div>
      )}
      <main className={`flex-1 ${showNavbar && !isProfilePage && !isPostPage ? 'pt-16' : ''} ${showNavbar && isProfilePage ? 'pt-16 lg:pt-0' : ''}`}>
        {children}
      </main>
      {showFooter && (
        <div className={isProfilePage ? 'lg:hidden' : ''}>
          <Footer />
        </div>
      )}
      <SupportFloatingButton />
    </div>
  );
}
