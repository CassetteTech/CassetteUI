'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Music, User, Edit, LogOut, Info, Users, AlertCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { KOFI_SUPPORT_URL, KOFI_ICON_SRC } from '@/lib/ko-fi';
import { useReportIssue } from '@/providers/report-issue-provider';

interface NavigationLinksProps {
  onLinkClick?: () => void; // To close the menu after a click
}

const navItems = [
  { href: '/', icon: Home, text: 'Home', auth: false },
  { href: '/explore', icon: Compass, text: 'Explore', auth: false },
  { href: '/about', icon: Info, text: 'About', auth: false },
  { href: '/team', icon: Users, text: 'Team', auth: false },
  { href: '/add-music', icon: Music, text: 'Add Music', auth: true },
  { href: '/profile', icon: User, text: 'Profile', auth: true },
  { href: '/profile/analytics', icon: BarChart3, text: 'Analytics', auth: true },
  { href: '/profile/edit', icon: Edit, text: 'Edit Profile', auth: true },
];

export function NavigationLinks({ onLinkClick }: NavigationLinksProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut();
    onLinkClick?.();
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/profile') return pathname.startsWith('/profile') && !pathname.includes('/edit') && !pathname.includes('/analytics');
    if (path === '/profile/analytics') return pathname.includes('/analytics');
    if (path === '/profile/edit') return pathname.includes('/edit');
    return pathname.startsWith(path);
  };
  
  // Dynamically adjust profile links
  const dynamicNavItems = navItems.map(item => {
    if (user && item.href.startsWith('/profile')) {
      return { ...item, href: item.href.replace('/profile', `/profile/${user.username}`) };
    }
    return item;
  });

  return (
    <nav className="flex flex-col h-full">
      <div className="pb-4 mb-4 border-b border-border/20">
        <a
          href={KOFI_SUPPORT_URL}
          target="_blank"
          rel="noreferrer"
          onClick={onLinkClick}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground px-4 py-3 text-base font-semibold transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Support Cassette on Ko-fi"
        >
          <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} className="rounded-full" />
          <span>Support Us</span>
        </a>
      </div>
      {/* Links */}
      <div className="flex-1 space-y-2">
        {dynamicNavItems.map((item) => {
          if (item.auth && !user) return null;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onLinkClick}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <item.icon className="h-6 w-6" />
              <span>{item.text}</span>
            </Link>
          );
        })}
        {/* Report a Problem */}
        <button
          onClick={() => { openReportModal(); onLinkClick?.(); }}
          className={cn(
            'flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors',
            'text-foreground hover:bg-muted w-full text-left'
          )}
        >
          <AlertCircle className="h-6 w-6" />
          <span>Report a Problem</span>
        </button>
        {user && (
          <button
            onClick={handleSignOut}
            className={cn(
              'flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors',
              'text-foreground hover:bg-muted w-full text-left'
            )}
          >
            <LogOut className="h-6 w-6" />
            <span>Sign Out</span>
          </button>
        )}
      </div>
    </nav>
  );
}
