'use client';

import { useRef, useState, useEffect, useLayoutEffect } from 'react';
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
import { AlertCircle, ArrowUpRight, LogOut, Plus } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSegmentedControl } from '@/components/layout/theme-switcher';
import { SidebarAccountRow, SidebarAccountRowSkeleton } from '@/components/layout/sidebar-account-row';
import { NotificationMenu } from '@/components/layout/notification-menu';
import { usePathname } from 'next/navigation';
import { AuthLink } from '@/components/auth/auth-link';
import { pendingActionService } from '@/utils/pending-action';
import { useReportIssue } from '@/providers/report-issue-provider';
import {
  addMusicHrefForPage,
  appNavOrder,
  getOrderedNavItems,
  isNavItemActive,
  promoteNavOrder,
  resolveNavHref,
  type NavigationItemDefinition,
  type NavUser,
} from './navigation-config';

const SIDEBAR_EXIT_KEYS: readonly string[] = ['explore'];
const footerButtonClassName = 'w-full justify-start text-muted-foreground hover:text-foreground has-[>svg]:px-2';

interface AppSidebarProps {
  className?: string;
}

interface SidebarPageMenuProps {
  items: NavigationItemDefinition[];
  pathname: string | null;
  user: NavUser;
}

function SidebarPageMenu({ items, pathname, user }: SidebarPageMenuProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const [pointedKey, setPointedKey] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<{ top: number; height: number; glides: boolean } | null>(null);
  const activeKey = items.find((item) => isNavItemActive(item, pathname, user))?.key ?? null;
  const targetKey = pointedKey ?? activeKey;
  const rowKeys = items.map((item) => item.key).join();

  useLayoutEffect(() => {
    const row = targetKey ? rowRefs.current.get(targetKey) : undefined;
    if (!row) return;
    setHighlight((previous) => ({ top: row.offsetTop, height: row.offsetHeight, glides: previous !== null }));
  }, [targetKey, rowKeys]);

  return (
    <SidebarGroupContent className="relative">
      <span
        aria-hidden
        data-sidebar="menu-highlight"
        className={`pointer-events-none absolute inset-x-0 rounded-md bg-sidebar-accent duration-200 ease-out-quart motion-reduce:transition-none ${
          highlight?.glides ? 'transition-[top,height,opacity]' : 'transition-opacity'
        }`}
        style={{
          top: highlight?.top ?? 0,
          height: highlight?.height ?? 0,
          opacity: highlight && targetKey ? 1 : 0,
        }}
      />
      <SidebarMenu onMouseLeave={() => setPointedKey(null)}>
        {items.map((item) => (
          <SidebarMenuItem
            key={item.key}
            ref={(row) => {
              if (row) rowRefs.current.set(item.key, row);
              else rowRefs.current.delete(item.key);
            }}
          >
            <SidebarMenuButton
              asChild
              isActive={item.key === activeKey}
              className="hover:bg-transparent data-[active=true]:bg-transparent"
            >
              <Link
                href={resolveNavHref(item, user)}
                onMouseEnter={() => setPointedKey(item.key)}
                onFocus={() => setPointedKey(item.key)}
                onBlur={() => setPointedKey(null)}
              >
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
  );
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
  const sidebarNavItems = getOrderedNavItems(appNavOrder, user, paidPromotion);
  const promoteItem = getOrderedNavItems(promoteNavOrder, user, paidPromotion)[0];

  // Update indicator position when pathname changes or when auth resolves
  // (menu items are conditionally rendered based on user state, and the user menu affects layout)
  useEffect(() => {
    const updateIndicator = () => {
      if (!contentRef.current) return;

      const activeButton = contentRef.current.querySelector<HTMLElement>('[data-active="true"]');

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
        <div className="pl-2 pt-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.svg"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
          {user && (
            <NotificationMenu className="border-transparent bg-transparent text-muted-foreground hover:text-foreground" />
          )}
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
        {authLoading && !user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarAccountRowSkeleton />
            </SidebarGroupContent>
          </SidebarGroup>
        ) : user ? (
          <SidebarGroup className="pb-1">
            <SidebarGroupContent className="space-y-5">
              <SidebarAccountRow user={user} />
              <Button asChild size="sm" className="w-full bg-foreground text-background hover:bg-foreground/90">
                <Link href={addMusicHrefForPage(pathname)}>
                  <Plus aria-hidden />
                  Add music
                </Link>
              </Button>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}

        {!authLoading && !user && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4 space-y-3">
                <Button asChild className="w-full">
                  <AuthLink authPath="/auth/signup" onClick={() => pendingActionService.saveOwnerlessPostForSignup()}>
                    Sign Up
                  </AuthLink>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <AuthLink authPath="/auth/signin">
                    Sign In
                  </AuthLink>
                </Button>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        
        <SidebarGroup className="pt-0">
          <SidebarPageMenu items={sidebarNavItems} pathname={pathname} user={user} />
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-2 py-3 gap-1">
        {promoteItem && (
          <Button asChild variant="ghost" size="sm" className={footerButtonClassName}>
            <Link href={promoteItem.href}>
              <promoteItem.icon className="mr-2.5 h-4 w-4" />
              <span>{promoteItem.label}</span>
              <ArrowUpRight aria-hidden className="ml-auto h-3 w-3 opacity-40" />
            </Link>
          </Button>
        )}

        <Button variant="ghost" size="sm" className={footerButtonClassName} onClick={() => openReportModal()}>
          <AlertCircle className="mr-2.5 h-4 w-4" />
          <span>Report a Problem</span>
        </Button>

        {user && (
          <Button variant="ghost" size="sm" className={footerButtonClassName} onClick={() => signOut()}>
            <LogOut className="mr-2.5 h-4 w-4" />
            <span>Sign Out</span>
          </Button>
        )}

        <ThemeSegmentedControl />
      </SidebarFooter>
    </Sidebar>
  );
}
