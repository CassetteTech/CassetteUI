'use client';

import { ProfileLayoutContext } from './layout-context';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <ProfileLayoutContext.Provider value={{ hasLayout: true }}>
      {/* Desktop: wrap in flex container for proper height handling */}
      <div className="hidden lg:flex lg:flex-col lg:h-screen lg:overflow-hidden">
        {children}
      </div>
      {/* Mobile: render children directly (pages handle mobile layout) */}
      <div className="lg:hidden">
        {children}
      </div>
    </ProfileLayoutContext.Provider>
  );
}
