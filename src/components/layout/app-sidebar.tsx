'use client';

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
import { Home, Music, User, LogOut, Edit } from 'lucide-react';
import Image from 'next/image';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ThemeSwitcher } from '@/components/layout/theme-switcher';
import { MusicConnectionsStatus } from '@/components/features/music/music-connections-status';
import { usePathname } from 'next/navigation';
import { KOFI_SUPPORT_URL, KOFI_ICON_SRC } from '@/lib/ko-fi';

interface AppSidebarProps {
  className?: string;
}

export function AppSidebar({ className }: AppSidebarProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const pathname = usePathname();

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="none" className={`h-screen ${className}`}>
      <SidebarHeader>
        {/* Cassette Logo */}
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.png"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        {/* User Profile Section */}
        {user ? (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Avatar className="h-12 w-12 border-2 border-border/20">
                    <AvatarImage 
                      src={user.profilePicture} 
                      alt={`@${user.username}`}
                    />
                    <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                      {user.username?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </div>
                {/* Music Connections Status */}
                <MusicConnectionsStatus variant="sidebar" />
              </div>
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
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <a
                    href={KOFI_SUPPORT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="text-left"
                  >
                    <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={16} height={16} className="mr-2" />
                    <span>Support Us</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/')}>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/add-music')}>
                  <Link href="/add-music">
                    <Music className="mr-2 h-4 w-4" />
                    <span>Add Music</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/profile')}>
                    <Link href={`/profile/${user.username}`}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/profile') && pathname.includes('/edit')}>
                    <Link href={`/profile/${user.username}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4 space-y-2">
        {/* Theme Switcher */}
        <div className="flex justify-center">
          <ThemeSwitcher />
        </div>
        
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
export function AppSidebarSkeleton({ className }: AppSidebarProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon" className={className}>
      <SidebarHeader>
        <div className="p-4">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/images/app_logo.png"
              alt="Cassette"
              width={150}
              height={50}
              className="h-10 w-auto"
            />
          </Link>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 bg-muted rounded-full animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-muted rounded animate-pulse mb-1" />
                  <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                </div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/')}>
                  <Link href="/">
                    <Home className="mr-2 h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/add-music')}>
                  <Link href="/add-music">
                    <Music className="mr-2 h-4 w-4" />
                    <span>Add Music</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive('/profile')}>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {user && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive('/profile') && pathname.includes('/edit')}>
                    <Link href={`/profile/${user.username}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit Profile</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarFooter className="border-t p-4 space-y-2">
        <div className="flex justify-center">
          <ThemeSwitcher />
        </div>
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
