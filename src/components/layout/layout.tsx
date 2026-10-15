'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { useAuthState } from '@/hooks/use-auth';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { SupportFloatingButton } from './support-floating-button';
import { PageLoader } from '@/components/ui/page-loader';
import { isHeroRoute } from './hero-routes';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { isLoading } = useAuthState();

useEffect(() => {
  const disposeAuthListener = authService.initializeAuthListener();
  apiService.warmupLambdas();

  return () => {
    disposeAuthListener();
  };
}, []);

  const isAuthPage = pathname?.startsWith('/auth');
  const isOnboardingPage = pathname?.startsWith('/onboarding');
  const isProfilePage = pathname?.startsWith('/profile') || pathname?.startsWith('/curator') || pathname?.startsWith('/studio') || pathname?.startsWith('/memberships') || pathname?.startsWith('/feed') || pathname?.startsWith('/internal');
  const isProfileRoute = pathname?.startsWith('/profile');
  const isStudioRoute = pathname?.startsWith('/studio') || pathname?.startsWith('/memberships');
  const isHomePage = isHeroRoute(pathname);
  const isPostPage = pathname?.startsWith('/post');
  const isStoryPage = pathname === '/about' || pathname === '/team';

  const showNavbar = !isAuthPage;
  const showFooter = !isAuthPage && !isHomePage && !isPostPage && !isProfileRoute && !isStudioRoute && !isStoryPage;

  if (isLoading && !isHomePage) {
    return <PageLoader />;
  }

  return (
    <div className="min-h-svh flex flex-col relative">
      
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
      {!isPostPage && !isProfileRoute && !isStudioRoute && !isAuthPage && !isOnboardingPage && (
        <div className={isProfilePage ? 'lg:hidden' : ''}>
          <SupportFloatingButton />
        </div>
      )}
    </div>
  );
}
