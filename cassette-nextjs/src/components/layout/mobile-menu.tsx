'use client';

import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Home, Music, User, LogOut, Edit, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { ThemeSwitcher } from './theme-switcher';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileMenu({ isOpen, onClose }: MobileMenuProps) {
  const { user } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const pathname = usePathname();

  // Close menu when route changes
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSignOut = () => {
    signOut();
    onClose();
  };

  // Helper function to check if a path is active
  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Menu Content */}
      <div className="relative h-full w-full bg-background">
        {/* Header with Logo and Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-border/20">
          <Link href="/" className="flex items-center">
            <Image
              src="/images/app_logo.png"
              alt="Cassette"
              width={120}
              height={40}
              className="h-8 w-auto"
            />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:text-primary"
          >
            <X className="h-6 w-6" />
          </Button>
        </div>

        <div className="flex flex-col h-full">
          {/* User Profile Section */}
          {user ? (
            <div className="p-6 border-b border-border/20">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-2 border-border/20">
                  <AvatarImage 
                    src={user.profilePicture || '/images/default-avatar.png'} 
                    alt={`@${user.username}`}
                  />
                  <AvatarFallback className="bg-primary text-white font-atkinson font-bold text-lg">
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg truncate">
                    {user.displayName || user.username}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    @{user.username}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* Auth Options for non-authenticated users */
            <div className="p-6 border-b border-border/20 space-y-3">
              <Button asChild className="w-full h-12">
                <Link href="/auth/signup">
                  Sign Up
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full h-12">
                <Link href="/auth/signin">
                  Sign In
                </Link>
              </Button>
            </div>
          )}

          {/* Navigation Links */}
          <div className="flex-1 p-6">
            <nav className="space-y-2">
              <Link
                href="/"
                className={`flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors ${
                  isActive('/') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Home className="h-6 w-6" />
                <span>Home</span>
              </Link>

              <Link
                href="/add-music"
                className={`flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors ${
                  isActive('/add-music') 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                <Music className="h-6 w-6" />
                <span>Add Music</span>
              </Link>

              {user && (
                <>
                  <Link
                    href={`/profile/${user.username}`}
                    className={`flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive('/profile') && !pathname.includes('/edit')
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <User className="h-6 w-6" />
                    <span>Profile</span>
                  </Link>

                  <Link
                    href={`/profile/${user.username}/edit`}
                    className={`flex items-center gap-4 p-4 rounded-lg text-lg font-medium transition-colors ${
                      isActive('/profile') && pathname.includes('/edit')
                        ? 'bg-primary text-primary-foreground' 
                        : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Edit className="h-6 w-6" />
                    <span>Edit Profile</span>
                  </Link>
                </>
              )}
            </nav>
          </div>

          {/* Footer with Theme Switcher and Sign Out */}
          <div className="p-6 border-t border-border/20 space-y-4">
            {/* Theme Switcher */}
            <div className="flex items-center justify-center">
              <ThemeSwitcher />
            </div>
            
            {/* Sign Out */}
            {user && (
              <Button
                variant="ghost"
                size="lg"
                className="w-full justify-start text-muted-foreground hover:text-foreground h-12"
                onClick={handleSignOut}
              >
                <LogOut className="mr-4 h-6 w-6" />
                <span className="text-lg">Sign Out</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}