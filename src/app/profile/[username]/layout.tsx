'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  SidebarInset,
  SidebarProvider,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { ProfileLayoutContext } from './layout-context';
import { profileService } from '@/services/profile';
import type { UserBio } from '@/types';

interface ProfileLayoutProps {
  children: React.ReactNode;
}

export default function ProfileLayout({ children }: ProfileLayoutProps) {
  const params = useParams();
  const username = params.username as string;

  const [profileUser, setProfileUser] = useState<UserBio | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(true);

  // Fetch the profile user data for the sidebar
  useEffect(() => {
    if (!username) {
      setIsProfileLoading(false);
      return;
    }

    setIsProfileLoading(true);
    profileService
      .fetchUserBio(username)
      .then((bio) => {
        setProfileUser(bio);
      })
      .catch((error) => {
        console.error('Failed to fetch profile for sidebar:', error);
        setProfileUser(null);
      })
      .finally(() => {
        setIsProfileLoading(false);
      });
  }, [username]);

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
            profileUser={profileUser}
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
