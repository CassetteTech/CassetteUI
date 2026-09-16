'use client';

/** Signed-in user pill for the top navbar: avatar, name, handle, and a
    dropdown with the account routes, report a problem, and sign out. Pattern from
    opensourceui.in's user-menu (MIT), rebuilt on the shadcn dropdown so
    keyboard, focus, and outside-click behavior come from Radix. */

import Link from 'next/link';
import { AlertCircle, ChevronDown, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { useReportIssue } from '@/providers/report-issue-provider';
import { accountNavItems, getVisibleNavItems, resolveNavHref } from './navigation-config';

export function UserMenu({ align = 'start' }: { align?: 'start' | 'end' }) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  if (!user) return null;
  const name = user.displayName || user.username;
  const items = getVisibleNavItems(accountNavItems, user);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Account menu for ${name}`}
        data-testid="user-menu-trigger"
        className="group flex h-10 items-center gap-2.5 rounded-full border border-border/70 bg-card pl-2 pr-3.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted/40"
      >
        <Avatar className="size-7 border border-border/70">
          <AvatarImage src={user.profilePicture} alt="" />
          <AvatarFallback className="bg-primary font-atkinson text-xs font-bold text-white">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-medium leading-none">{name}</span>
          <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
            @{user.username}
          </span>
        </span>
        <ChevronDown aria-hidden className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} sideOffset={8} className="w-60 p-1.5">
        {items.map((item) => (
          <DropdownMenuItem key={item.key} asChild>
            <Link href={resolveNavHref(item, user)} className="gap-2.5 px-2.5 py-2">
              <item.icon className="size-4 text-muted-foreground" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => openReportModal()} className="gap-2.5 px-2.5 py-2">
          <AlertCircle className="size-4 text-muted-foreground" />
          Report a Problem
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => signOut()}
          className="gap-2.5 px-2.5 py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="size-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
