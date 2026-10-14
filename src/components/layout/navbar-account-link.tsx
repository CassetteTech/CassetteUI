'use client';

/** Signed-in identity for the top navbar: avatar, name, and handle, as a link to Curator Studio,
    the curator's home, like the sidebar's account row. It opens no menu: the account routes are in
    the sidebar from 1024 px and in the navbar menu below that width. Pill shape from
    opensourceui.in's user-menu (MIT). */

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthState } from '@/hooks/use-auth';

export function NavbarAccountLink() {
  const { user } = useAuthState();
  if (!user) return null;
  const name = user.displayName || user.username;

  return (
    <Link
      href="/studio"
      data-testid="navbar-account-link"
      className="flex h-10 items-center gap-2.5 rounded-full border border-border/70 bg-card pl-2 pr-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* Decorative: the name and handle name the link, so the fallback letter stays out of it. */}
      <Avatar aria-hidden className="size-7 border border-border/70">
        <AvatarImage src={user.profilePicture} alt="" />
        <AvatarFallback className="bg-primary font-atkinson text-xs font-bold text-white">
          {user.username.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium leading-none">{name}</span>
        <span className="mt-1 block truncate font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
          @{user.username}
        </span>
      </span>
    </Link>
  );
}
