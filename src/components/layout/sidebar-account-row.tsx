'use client';

/** Compact signed-in identity for the sidebar: avatar, name, handle, and the inbox. */

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationMenu } from '@/components/layout/notification-menu';
import type { AuthUser } from '@/types';

/** active marks the own profile page; the sidebar's sliding indicator follows data-active.
    The avatar shares the left edge of the sidebar's page rows. */
export function SidebarAccountRow({ user, active = false }: { user: AuthUser; active?: boolean }) {
  const name = user.displayName || user.username;
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/profile/${user.username}`}
        data-active={active}
        aria-current={active ? 'page' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground"
      >
        <Avatar className="size-8 border border-border/70">
          <AvatarImage src={user.profilePicture} alt="" />
          <AvatarFallback className="bg-primary font-atkinson text-xs font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-medium leading-none">{name}</span>
          <span className="mt-1 block truncate font-mono text-[10px] text-muted-foreground">@{user.username}</span>
        </span>
      </Link>
      <NotificationMenu className="border-transparent bg-transparent text-muted-foreground hover:text-foreground" />
    </div>
  );
}

export function SidebarAccountRowSkeleton() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5">
      <div className="size-8 animate-pulse rounded-full bg-muted" />
      <div className="space-y-1.5">
        <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        <div className="h-2.5 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
