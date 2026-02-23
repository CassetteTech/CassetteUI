'use client';

import { useRef, useState, useEffect } from 'react';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Music, Compass, User, LogOut, Edit, AlertCircle, Shield } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { SidebarProfileCard, SidebarProfileCardSkeleton } from '@/components/features/profile/sidebar-profile-card';
import { usePathname } from 'next/navigation';
import { KOFI_SUPPORT_URL, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { useReportIssue } from '@/providers/report-issue-provider';
import { theme } from '@/lib/theme';
import { useUserBio } from '@/hooks/use-profile';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();

  // Extract username from /profile/[username] routes to fetch profile data
  const profileUsername = pathname?.startsWith('/profile/')
    ? pathname.split('/')[2]
    : undefined;

  // Fetch profile user when on a profile page (hook handles caching and deduplication)
  const { data: profileUser, isLoading: isProfileLoading } = useUserBio(profileUsername);

  // Determine which user to display in the profile card
  // If viewing a profile page, show that user; otherwise show logged-in user
  const displayUser = profileUser ?? user;
  const isViewingOwnProfile = !profileUser || (user && profileUser.username === user.username);
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
    hasPositioned: boolean;
  }>({ top: 0, height: 0, opacity: 0, hasPositioned: false });
  const canSeeInternalDashboard = isCassetteInternalAccount(user?.accountType ?? null);

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname?.startsWith(path);
  };

  // Update indicator position when pathname changes or when user/profile data loads
  // (menu items are conditionally rendered based on user state, and profile card affects layout)
  useEffect(() => {
    const updateIndicator = () => {
      if (!contentRef.current) return;

      const activeButton = contentRef.current.querySelector(
        '[data-active="true"]'
      ) as HTMLElement | null;

      if (activeButton) {
        const containerRect = contentRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const newTop = buttonRect.top - containerRect.top;
        const newHeight = buttonRect.height;

        setIndicatorStyle((prev) => {
          if (!prev.hasPositioned) {
            // First time: set position, then reveal in next frame
            requestAnimationFrame(() => {
              setIndicatorStyle((p) => ({ ...p, opacity: 1, hasPositioned: true }));
            });
            return { top: newTop, height: newHeight, opacity: 0, hasPositioned: false };
          }
          // Subsequent: just update position (transitions will animate)
          return { ...prev, top: newTop, height: newHeight, opacity: 1 };
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    // Don't calculate position while profile is loading (layout will shift)
    if (isProfileLoading) return;

    // Delay to ensure DOM has fully settled after layout changes
    const timeoutId = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timeoutId);
  }, [pathname, user, displayUser, isProfileLoading]);

  return (
    <Sidebar collapsible="none" className={`h-screen ${className}`}>
      <SidebarHeader>
        {/* Cassette Logo and Theme Switcher */}
        <div className="p-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.png"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
          <ThemeSwitcher />
        </div>
      </SidebarHeader>
      
      <SidebarContent className="relative" ref={contentRef}>
        {/* Sliding indicator */}
        <div
          className="absolute left-0 w-1 rounded-r-full z-10"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
            backgroundColor: theme.colors.brandRed,
            // No transition until first position is set, then smooth sliding
            transition: indicatorStyle.hasPositioned
              ? (indicatorStyle.opacity === 1
                  ? 'top 300ms ease-out, height 300ms ease-out, opacity 0ms'
                  : 'top 300ms ease-out, height 300ms ease-out, opacity 500ms ease-out')
              : 'none',
          }}
        />
        {/* User Profile Section */}
        {isProfileLoading ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarProfileCardSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : displayUser ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarProfileCard
                user={displayUser}
                isCurrentUser={isViewingOwnProfile ?? false}
              />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (
          /* Auth Options for non-authenticated users */
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4 space-y-3">
                <Button asChild className="w-full">
                  <Link href="/auth/signup">
                    Sign Up
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/auth/signin">
                    Sign In
                  </Link>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        {/* Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/profile') && !pathname.includes('/edit')}>
                    <Link href={`/profile/${user.username}`}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/explore')}>
                  <Link href="/explore">
                    <Compass className="mr-2 h-4 w-4" />
                    <span>Explore</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/add-music')}>
                    <Link href="/add-music">
                      <Music className="mr-2 h-4 w-4" />
                      <span>Add Music</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {canSeeInternalDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/internal')}>
                    <Link href="/internal">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Internal</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user && (
                <>
                  <div className="my-2 mx-2 border-t border-border" />
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/profile') && pathname.includes('/edit')}>
                      <Link href={`/profile/${user.username}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Profile</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        {/* Support Us */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <a
            href={KOFI_SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={16} height={16} className="mr-2" />
            <span>Support Us</span>
          </a>
        </Button>

        {/* Report a Problem */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => openReportModal()}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          <span>Report a Problem</span>
        </Button>

        {/* Sign Out */}
        {user && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

// Skeleton version for loading states
export function AppSidebarSkeleton({ className }: { className?: string }) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
    hasPositioned: boolean;
  }>({ top: 0, height: 0, opacity: 0, hasPositioned: false });
  const canSeeInternalDashboard = isCassetteInternalAccount(user?.accountType ?? null);

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  // Update indicator position when pathname changes
  useEffect(() => {
    const updateIndicator = () => {
      if (!contentRef.current) return;

      const activeButton = contentRef.current.querySelector(
        '[data-active="true"]'
      ) as HTMLElement | null;

      if (activeButton) {
        const containerRect = contentRef.current.getBoundingClientRect();
        const buttonRect = activeButton.getBoundingClientRect();
        const newTop = buttonRect.top - containerRect.top;
        const newHeight = buttonRect.height;

        setIndicatorStyle((prev) => {
          if (!prev.hasPositioned) {
            // First time: set position, then reveal in next frame
            requestAnimationFrame(() => {
              setIndicatorStyle((p) => ({ ...p, opacity: 1, hasPositioned: true }));
            });
            return { top: newTop, height: newHeight, opacity: 0, hasPositioned: false };
          }
          // Subsequent: just update position (transitions will animate)
          return { ...prev, top: newTop, height: newHeight, opacity: 1 };
        });
      } else {
        setIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };

    // Small delay to ensure DOM has updated
    const timeoutId = setTimeout(updateIndicator, 10);
    return () => clearTimeout(timeoutId);
  }, [pathname]);

  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader>
        <div className="p-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.png"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
          <ThemeSwitcher />
        </div>
      </SidebarHeader>

      <SidebarContent className="relative" ref={contentRef}>
        {/* Sliding indicator */}
        <div
          className="absolute left-0 w-1 rounded-r-full z-10"
          style={{
            top: indicatorStyle.top,
            height: indicatorStyle.height,
            opacity: indicatorStyle.opacity,
            backgroundColor: theme.colors.brandRed,
            // No transition until first position is set, then smooth sliding
            transition: indicatorStyle.hasPositioned
              ? (indicatorStyle.opacity === 1
                  ? 'top 300ms ease-out, height 300ms ease-out, opacity 0ms'
                  : 'top 300ms ease-out, height 300ms ease-out, opacity 500ms ease-out')
              : 'none',
          }}
        />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarProfileCardSkeleton />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/profile') && !pathname.includes('/edit')}>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/explore')}>
                  <Link href="/explore">
                    <Compass className="mr-2 h-4 w-4" />
                    <span>Explore</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/add-music')}>
                    <Link href="/add-music">
                      <Music className="mr-2 h-4 w-4" />
                      <span>Add Music</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {canSeeInternalDashboard && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/internal')}>
                    <Link href="/internal">
                      <Shield className="mr-2 h-4 w-4" />
                      <span>Internal</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user && (
                <>
                  <div className="my-2 mx-2 border-t border-border" />
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={isActive('/profile') && pathname.includes('/edit')}>
                      <Link href={`/profile/${user.username}/edit`}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Profile</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        {/* Support Us */}
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
        >
          <a
            href={KOFI_SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={16} height={16} className="mr-2" />
            <span>Support Us</span>
          </a>
        </Button>

        {/* Report a Problem */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-foreground"
          onClick={() => openReportModal()}
        >
          <AlertCircle className="mr-2 h-4 w-4" />
          <span>Report a Problem</span>
        </Button>

        {user && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
            onClick={() => signOut()}
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
