'use client';

// Renders Cassette's responsive application sidebar from role-aware navigation configuration.

import { useRef, useState, useEffect } from 'react';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { usePaidPromotionAccountVisible, usePaidPromotionSalesEnabled } from '@/hooks/use-paid-promotion-availability';
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
import { ThemeSegmentedControl } from '@/components/layout/theme-switcher';
import { SidebarAccountRow, SidebarAccountRowSkeleton } from '@/components/layout/sidebar-account-row';
import { usePathname } from 'next/navigation';
import { useReportIssue } from '@/providers/report-issue-provider';
import {
  accountNavItems,
  getVisibleNavItems,
  isNavItemActive,
  isOwnProfilePath,
  primaryNavItems,
  resolveNavHref,
  type NavigationItemDefinition,
  type NavUser,
} from './navigation-config';

// Interleaved sidebar ordering across primary + account groups. The logo links
// home and the account row links to the own profile, so neither has a row here.
// Feed shows only to a signed-in viewer, so Explore leads for a visitor.
const SIDEBAR_NAV_ORDER = ['feed', 'explore', 'curator-studio', 'add-music', 'memberships', 'internal'] as const;
// Explore leaves the sidebar shell, so its row carries an exit marker.
const SIDEBAR_EXIT_KEYS: readonly string[] = ['explore'];
// Both lead to /promote, so the footer shows only the first visible one: Promote
// while Boost sales are open, then Your Campaigns for a user who still has campaigns.
const SIDEBAR_PROMOTE_ORDER = ['promote', 'campaigns'] as const;

function getSidebarNavItems(
  user: NavUser,
  paidPromotion: { salesEnabled: boolean; accountVisible: boolean },
  order: readonly string[] = SIDEBAR_NAV_ORDER,
): NavigationItemDefinition[] {
  const all = [...primaryNavItems, ...accountNavItems];
  const ordered = order
    .map((key) => all.find((item) => item.key === key))
    .filter((item): item is NavigationItemDefinition => Boolean(item));
  return getVisibleNavItems(ordered, user, paidPromotion);
}

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { user, isLoading: authLoading } = useAuthState();
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
  const paidPromotion = {
    salesEnabled: usePaidPromotionSalesEnabled(),
    accountVisible: usePaidPromotionAccountVisible(),
  };
  const sidebarNavItems = getSidebarNavItems(user, paidPromotion);
  const promoteItem = getSidebarNavItems(user, paidPromotion, SIDEBAR_PROMOTE_ORDER)[0];

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

    // Don't calculate position while auth is loading (layout can shift)
    if (authLoading) return;

    // Delay to ensure DOM has fully settled after layout changes
    const timeoutId = setTimeout(updateIndicator, 100);
    return () => clearTimeout(timeoutId);
  }, [pathname, user, authLoading]);

  return (
    <Sidebar collapsible="none" className={`h-screen border-r border-sidebar-border/50 ${className}`}>
      <SidebarHeader>
        <div className="p-4 flex items-center">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.svg"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
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
        {/* The sidebar always carries the signed-in user; the page carries the viewed profile. */}
        {authLoading && !user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarAccountRowSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarAccountRow user={user} active={isOwnProfilePath(pathname, user)} />
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
                      {SIDEBAR_EXIT_KEYS.includes(item.key) && (
                        <ArrowUpRight aria-hidden className="ml-auto size-3! opacity-40" />
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4 space-y-2">
        {/* Promote leaves the sidebar shell */}
        {promoteItem && (
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <Link href={promoteItem.href}>
              <promoteItem.icon className="mr-2 h-4 w-4" />
              <span>{promoteItem.label}</span>
              <ArrowUpRight aria-hidden className="ml-auto h-3 w-3 opacity-40" />
            </Link>
          </Button>
        )}

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

        <ThemeSegmentedControl />
      </SidebarFooter>
    </Sidebar>
  );
}
