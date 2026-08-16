'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { EmailPreferencesSettingsProvider } from '@/components/features/profile/email-preferences-settings';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

export default function SidebarLayout({ children }: SidebarLayoutProps) {
  return (
    <EmailPreferencesSettingsProvider>
      <SidebarProvider defaultOpen className="min-h-svh lg:h-screen lg:min-h-0 lg:overflow-hidden">
        <div className="hidden lg:block">
          <AppSidebar />
        </div>
        <div className="min-w-0 flex-1 lg:overflow-y-auto">{children}</div>
      </SidebarProvider>
    </EmailPreferencesSettingsProvider>
  );
}
