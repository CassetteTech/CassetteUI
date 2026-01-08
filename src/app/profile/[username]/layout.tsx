'use client';

import { useParams } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ProfileLayoutContext } from './layout-context';
import { useUserBio } from '@/hooks/use-profile';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const params = useParams();
  const username = params.username as string;

  // Use React Query for bio fetching - handles caching and deduplication
  const { data: profileUser, isLoading: isProfileLoading } = useUserBio(username);

  return (
    <ProfileLayoutContext.Provider value={{ hasLayout: true }}>
      {/* Mobile: render children directly (pages handle mobile layout) */}
      <div className="lg:hidden">
        {children}
      </div>

      {/* Desktop: persistent sidebar with content area */}
      <div className="hidden lg:block min-h-screen bg-background">
        <SidebarProvider defaultOpen={true}>
          <AppSidebar
            profileUser={profileUser ?? null}
            isProfileLoading={isProfileLoading}
          />
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
