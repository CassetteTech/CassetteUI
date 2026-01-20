'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AnimatedPrimaryButton } from '@/components/ui/animated-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthState } from '@/hooks/use-auth';
import { ChevronDown, Info, Users, Shield, FileText } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';
import { NavigationLinks } from './navigation-links';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { openKoFiSupport, KOFI_ICON_SRC } from '@/lib/ko-fi';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, isAuthenticated } = useAuthState();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <nav className="bg-background/95 backdrop-blur border-b border-border/20 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/cassette_words_logo.png"
                alt="Cassette"
                width={120}
                height={32}
                className="h-[80%] w-auto"
              />
            </Link>
            
            {/* Desktop Company Dropdown */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center space-x-1 text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted outline-none">
                    <span>Company</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 bg-background border border-border/20 rounded-lg shadow-main">
                  <DropdownMenuItem asChild>
                    <Link
                      href="/about"
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <Info className="h-4 w-4" />
                      <span>About</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/team"
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      <span>Team</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem asChild>
                    <Link
                      href="/privacy"
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <Shield className="h-4 w-4" />
                      <span>Privacy</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/terms"
                      className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                    >
                      <FileText className="h-4 w-4" />
                      <span>Terms</span>
                    </Link>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Switcher - always visible in navbar */}
            <ThemeSwitcher />

            <button
              className="hidden md:inline-flex items-center gap-1.5 text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={openKoFiSupport}
              aria-label="Support Cassette on Ko-fi"
            >
              <Image src={KOFI_ICON_SRC} alt="Ko-fi" width={18} height={18} className="rounded-full" />
              <span>Support Us</span>
            </button>
            
            {isAuthenticated ? (
              <>
                
                {/* User Avatar - visible on desktop */}
                <div className="hidden md:block">
                  <Link href={`/profile/${user?.username}`}>
                    <Avatar className="h-8 w-8 border-2 border-primary cursor-pointer">
                      <AvatarImage src={user?.profilePicture} alt={user?.username} />
                      <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                        {user?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* Auth buttons - visible on all screen sizes */}
                <Link
                  href="/auth/signin"
                  className="text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-2 sm:px-3 py-2"
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
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              className="md:hidden flex flex-col justify-center items-center w-10 h-10 relative focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg hover:bg-muted p-2"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span className={cn(
                "block w-6 h-[3px] bg-foreground rounded transform transition duration-300 ease-in-out",
                isMobileMenuOpen && "rotate-45 translate-y-[7px]"
              )} />
              <span className={cn(
                "block w-6 h-[3px] bg-foreground rounded my-1 transition duration-300 ease-in-out",
                isMobileMenuOpen && "opacity-0"
              )} />
              <span className={cn(
                "block w-6 h-[3px] bg-foreground rounded transform transition duration-300 ease-in-out",
                isMobileMenuOpen && "-rotate-45 -translate-y-[7px]"
              )} />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Overlay */}
      <div className={cn(
        "md:hidden absolute top-full left-0 right-0 bg-background border-b border-border/20 shadow-lg overflow-hidden transition-all duration-300 ease-in-out",
        isMobileMenuOpen ? "max-h-[600px]" : "max-h-0"
      )}>
        <div className="container mx-auto px-4 py-4">
          {/* User Profile Section - only show for authenticated users */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-4 pb-4 mb-4 border-b border-border/20">
              <Avatar className="h-12 w-12 border-2 border-border/20">
                <AvatarImage src={user.profilePicture} alt={`@${user.username}`} />
                <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user.displayName || user.username}</p>
                <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <NavigationLinks onLinkClick={() => setIsMobileMenuOpen(false)} />
        </div>
      </div>
    </nav>
  );
}
