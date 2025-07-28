'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Music, User, Edit, LogOut, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavigationLinksProps {
  onLinkClick?: () => void; // To close the menu after a click
}

const navItems = [
  { href: '/', icon: Home, text: 'Home', auth: false },
  { href: '/about', icon: Info, text: 'About', auth: false },
  { href: '/team', icon: Users, text: 'Team', auth: false },
  { href: '/add-music', icon: Music, text: 'Add Music', auth: true },
  { href: '/profile', icon: User, text: 'Profile', auth: true },
  { href: '/profile/edit', icon: Edit, text: 'Edit Profile', auth: true },
];

export function NavigationLinks({ onLinkClick }: NavigationLinksProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const pathname = usePathname();

  const handleSignOut = () => {
    signOut();
    onLinkClick?.();
  };

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    if (path === '/profile') return pathname.startsWith('/profile') && !pathname.includes('/edit');
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
      </div>
      
      {/* Sign Out */}
      {user && (
        <div className="pt-4 mt-auto">
          <Button
            variant="ghost"
            size="lg"
            className="w-full justify-start text-muted-foreground hover:text-foreground h-12"
            onClick={handleSignOut}
          >
            <LogOut className="mr-4 h-6 w-6" />
            <span className="text-lg">Sign Out</span>
          </Button>
        </div>
      )}
    </nav>
  );
}