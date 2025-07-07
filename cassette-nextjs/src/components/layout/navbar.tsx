'use client';

import Link from 'next/link';
import { AnimatedPrimaryButton } from '@/components/ui/animated-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { User, LogOut, Menu } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import Image from 'next/image';

export function Navbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user, isAuthenticated } = useAuthState();
  const { mutate: signOut } = useSignOut();

  console.log('Navbar: onMenuClick function is:', typeof onMenuClick, onMenuClick);

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="bg-background/95 backdrop-blur border-b border-border/20 relative z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/images/cassette_words_logo.png"
                alt="Cassette"
                width={120}
                height={32}
                className="h-[80%] w-auto"
              />
            </Link>

            <div className="hidden md:flex items-center ml-6">
            </div>
          </div>

          <div className="flex items-center">
            {/* User Menu & Theme Switcher */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <ThemeSwitcher />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="outline-none">
                        <Avatar className="h-8 w-8 border-2 border-primary cursor-pointer">
                          <AvatarImage src={user?.profilePicture} alt={user?.username} />
                          <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-background border border-border/20 rounded-lg shadow-main">
                      <div className="px-3 py-2">
                        <p className="text-sm font-atkinson font-bold text-foreground">{user?.displayName}</p>
                        <p className="text-xs text-muted-foreground font-atkinson">@{user?.username}</p>
                      </div>
                      <DropdownMenuSeparator className="bg-border/20" />
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/profile/${user?.username}`}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                        >
                          <User className="h-4 w-4" />
                          <span>Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <button
                          onClick={handleSignOut}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors w-full text-left cursor-pointer"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Sign Out</span>
                        </button>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <div className="flex items-center space-x-3">
                  <ThemeSwitcher />
                  <Link
                    href="/auth/signin"
                    className="text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-3 py-2"
                  >
                    Sign In
                  </Link>
                  <AnimatedPrimaryButton
                    text="Sign Up"
                    onClick={() => window.location.href = '/auth/signup'}
                    height={32}
                    width={80}
                    initialPos={2}
                  />
                </div>
              )}
            </div>

            {/* Mobile menu button */}
            <div className="md:hidden ml-2">
              <button 
                className="text-foreground hover:text-primary transition-colors p-2 rounded-lg hover:bg-muted"
                onClick={() => {
                  console.log('Navbar: Mobile menu button clicked');
                  onMenuClick();
                }}
                aria-label="Open mobile menu"
              >
                <Menu className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}