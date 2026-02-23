'use client';

import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <>
      {/* Mobile: render children directly (pages handle mobile layout) */}
      <div className="lg:hidden">
        {children}
      </div>

      {/* Desktop: persistent sidebar with content area */}
      <div className="hidden lg:block h-screen overflow-hidden bg-background">
        <SidebarProvider defaultOpen={true} className="h-full min-h-0">
          <AppSidebar />
          <SidebarInset className="overflow-y-auto">
            {children}
          </SidebarInset>
        </SidebarProvider>
      </div>
    </>
  );
}
