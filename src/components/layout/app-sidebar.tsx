'use client';

// Renders Cassette's responsive application sidebar from role-aware navigation configuration.

import { useRef, useState, useEffect } from 'react';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { AlertCircle, ArrowUpRight, LogOut } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { SidebarProfileCard, SidebarProfileCardSkeleton } from '@/components/features/profile/sidebar-profile-card';
import { useUserBio } from '@/hooks/use-profile';
import { useCuratorPage } from '@/hooks/use-curator';
import { usePathname } from 'next/navigation';
import { KOFI_SUPPORT_URL } from '@/lib/ko-fi';
import { KofiIcon } from '@/components/ui/kofi-icon';
import { useReportIssue } from '@/providers/report-issue-provider';
import {
  accountNavItems,
  getVisibleNavItems,
  isNavItemActive,
  primaryNavItems,
  resolveNavHref,
  type NavigationItemDefinition,
  type NavUser,
} from './navigation-config';

// Interleaved sidebar ordering across primary + account groups.
const SIDEBAR_NAV_ORDER = ['profile', 'curator-studio', 'add-music', 'memberships', 'internal'] as const;
// Pages outside the sidebar shell; shown in the footer with an exit marker.
const SIDEBAR_EXIT_ORDER = ['explore', 'promote'] as const;

function getSidebarNavItems(user: NavUser, order: readonly string[] = SIDEBAR_NAV_ORDER): NavigationItemDefinition[] {
  const all = [...primaryNavItems, ...accountNavItems];
  const ordered = order
    .map((key) => all.find((item) => item.key === key))
    .filter((item): item is NavigationItemDefinition => Boolean(item));
  return getVisibleNavItems(ordered, user);
}

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { user, isLoading: authLoading } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();

  // The identity card is persistent: on /profile/[username] it shows the viewed
  // profile; everywhere else in the sidebar layout it shows the signed-in user,
  // loaded through the same bio + curator queries so the card never loses data.
  const rawProfileSegment = pathname?.startsWith('/profile/') ? pathname.split('/')[2] : undefined;
  const profileUsername =
    (rawProfileSegment && rawProfileSegment !== 'edit' ? rawProfileSegment : undefined) ?? user?.username;
  const { data: profileBio, isLoading: profileLoading } = useUserBio(profileUsername, {
    staleTime: 1000 * 60,
    gcTime: 1000 * 60 * 10,
  });
  const curatorQuery = useCuratorPage(
    profileUsername ?? '',
    profileUsername && !authLoading ? (user?.id ?? 'anonymous') : null,
  );
  const profileCurator = curatorQuery.data?.pages[0]?.curator;
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
    hasPositioned: boolean;
  }>({ top: 0, height: 0, opacity: 0, hasPositioned: false });
  const sidebarNavItems = getSidebarNavItems(user);

  // Update indicator position when pathname changes or when auth resolves
  // (menu items are conditionally rendered based on user state, and the user menu affects layout)
  useEffect(() => {
    const updateIndicator = () => {
      if (!contentRef.current) return;

      // SAFETY: data-active is only set on rendered menu buttons, which are HTMLElements.
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

    // Don't calculate position while auth or the profile card is loading (layout can shift)
    if (authLoading || profileLoading) return;

    // Delay to ensure DOM has fully settled after layout changes
    const timeoutId = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timeoutId);
  }, [pathname, user, authLoading, profileLoading]);

  return (
    <Sidebar collapsible="none" className={`h-screen border-r border-sidebar-border/50 ${className}`}>
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
            backgroundColor: 'hsl(var(--primary))',
            // No transition until first position is set, then smooth sliding
            transition: indicatorStyle.hasPositioned
              ? (indicatorStyle.opacity === 1
                  ? 'top 300ms ease-out, height 300ms ease-out, opacity 0ms'
                  : 'top 300ms ease-out, height 300ms ease-out, opacity 500ms ease-out')
              : 'none',
          }}
        />
        {/* Persistent identity card */}
        {profileUsername ? (
          <SidebarGroup>
            <SidebarGroupContent>
              {profileBio ? (
                <SidebarProfileCard
                  user={profileBio}
                  isCurrentUser={profileBio.username === user?.username}
                  curatorGenres={profileCurator?.declaredGenres}
                  curatorAbout={profileCurator?.about}
                  curatorPlatforms={profileCurator?.declaredPlatforms}
                />
              ) : profileLoading ? (
                <SidebarProfileCardSkeleton />
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>
        ) : authLoading && !user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarProfileCardSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarProfileCard user={user} isCurrentUser />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {!authLoading && !user && (
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
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarNavItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isNavItemActive(item, pathname, user)}>
                    <Link href={resolveNavHref(item, user)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        {/* Pages that leave the sidebar shell */}
        {getSidebarNavItems(user, SIDEBAR_EXIT_ORDER).map((item) => (
          <Button
            key={item.key}
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Link href={resolveNavHref(item, user)}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
              <ArrowUpRight aria-hidden className="ml-auto h-3 w-3 opacity-40" />
            </Link>
          </Button>
        ))}

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
            <KofiIcon width={16} className="mr-2" />
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

// Skeleton version for loading states
export function AppSidebarSkeleton({ className }: { className?: string }) {
  const { user } = useAuthState();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();
  const contentRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<{
    top: number;
    height: number;
    opacity: number;
    hasPositioned: boolean;
  }>({ top: 0, height: 0, opacity: 0, hasPositioned: false });
  const sidebarNavItems = getSidebarNavItems(user);

  // Update indicator position when pathname changes
  useEffect(() => {
    const updateIndicator = () => {
      if (!contentRef.current) return;

      // SAFETY: data-active is only set on rendered menu buttons, which are HTMLElements.
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
            backgroundColor: 'hsl(var(--primary))',
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
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarNavItems.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton asChild isActive={isNavItemActive(item, pathname, user)}>
                    <Link href={resolveNavHref(item, user)}>
                      <item.icon className="mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
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
            <KofiIcon width={16} className="mr-2" />
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
      </SidebarFooter>
    </Sidebar>
  );
}
