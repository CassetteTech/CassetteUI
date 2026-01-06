'use client';

import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ProfileLayoutContext } from './layout-context';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  return (
    <ProfileLayoutContext.Provider value={{ hasLayout: true }}>
      {/* Mobile: render children directly (pages handle mobile layout) */}
      <div className="lg:hidden">
        {children}
      </div>

      {/* Desktop: persistent sidebar with content area */}
      <div className="hidden lg:block min-h-screen bg-background">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar />
          <SidebarInset>
            <div className="flex flex-col h-screen overflow-hidden">
              {children}
            </div>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </ProfileLayoutContext.Provider>
  );
}
