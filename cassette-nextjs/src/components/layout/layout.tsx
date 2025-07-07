'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { authService } from '@/services/auth';
import { apiService } from '@/services/api';
import { useAuthState } from '@/hooks/use-auth';
import { Navbar } from './navbar';
import { Footer } from './footer';
import { config } from '@/lib/config';
import { MobileMenu } from './mobile-menu';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const pathname = usePathname();
  const { isLoading } = useAuthState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  console.log('Layout: isMobileMenuOpen =', isMobileMenuOpen);

  useEffect(() => {
    // Initialize auth listener
    authService.initializeAuthListener();

    // Warmup lambdas if enabled
    if (config.features.enableLambdaWarmup) {
      apiService.warmupLambdas().catch(console.warn);
    }
  }, []);

  const isAuthPage = pathname?.startsWith('/auth');
  const isProfilePage = pathname?.startsWith('/profile');

  // We always want to show the navbar/footer unless on an auth page.
  // The hiding for the profile page will be handled responsively with CSS.
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
    <div className="min-h-screen flex flex-col relative">
      <MobileMenu 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      {showNavbar && (
        <div className={isProfilePage ? 'lg:hidden' : ''}>
          <Navbar onMenuClick={() => {
            console.log('Layout: Setting mobile menu open to true');
            setIsMobileMenuOpen(true);
          }} />
        </div>
      )}
      <main className="flex-1">
        {children}
      </main>
      {showFooter && (
        <div className={isProfilePage ? 'lg:hidden' : ''}>
          <Footer />
        </div>
      )}
    </div>
  );
}