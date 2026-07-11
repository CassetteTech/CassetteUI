'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatedPrimaryButton } from '@/components/ui/animated-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { ChevronDown, AlertCircle, LogOut } from 'lucide-react';
import { ThemeSwitcher } from './theme-switcher';
import { NavigationLinks } from './navigation-links';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { useReportIssue } from '@/providers/report-issue-provider';
import { NotificationMenu } from './notification-menu';
import {
  accountNavItems,
  companyNavItems,
  getVisibleNavItems,
  resolveNavHref,
} from './navigation-config';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function Navbar() {
  const { user, isAuthenticated } = useAuthState();
  const { mutate: signOut } = useSignOut();
  const { openReportModal } = useReportIssue();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const visibleCompanyItems = getVisibleNavItems(companyNavItems, user);
  const visibleAccountItems = getVisibleNavItems(accountNavItems, user).filter(
    (item) => item.key !== 'edit-profile',
  );

  // Lock body scroll while the mobile menu is open so the panel feels modal.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileMenuOpen]);

  // Close on Escape for keyboard users.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobileMenuOpen]);

  return (
    <nav className="bg-background/95 backdrop-blur border-b border-border/20 fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/nav_logo_text.png"
                alt="Cassette"
                width={876}
                height={224}
                priority
                unoptimized
                className="h-7 w-auto sm:h-8"
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
                  {visibleCompanyItems.map((item) => (
                    <DropdownMenuItem key={item.key} asChild>
                      {item.external ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </a>
                      ) : (
                        <Link
                          href={resolveNavHref(item, user)}
                          className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </Link>
                      )}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator className="bg-border/20" />
                  <DropdownMenuItem
                    onClick={() => openReportModal()}
                    className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span>Report a Problem</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Link
              href="/explore"
              className="hidden md:inline-flex items-center text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-3 py-2 rounded-lg hover:bg-muted"
            >
              Explore
            </Link>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Theme Switcher - always visible in navbar */}
            <ThemeSwitcher />
            
            {isAuthenticated ? (
              <>
                <NotificationMenu />

                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                        aria-label="Open account menu"
                      >
                        <Avatar className="h-8 w-8 border-2 border-primary cursor-pointer">
                          <AvatarImage src={user?.profilePicture} alt={user?.username} />
                          <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-background border border-border/20 rounded-lg shadow-main">
                      <DropdownMenuLabel className="font-atkinson">
                        {user?.displayName || user?.username}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator className="bg-border/20" />
                      {visibleAccountItems.map((item) => (
                        <DropdownMenuItem key={item.key} asChild>
                          <Link
                            href={resolveNavHref(item, user)}
                            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        </DropdownMenuItem>
                      ))}
                      <DropdownMenuSeparator className="bg-border/20" />
                      <DropdownMenuItem
                        onClick={() => openReportModal()}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Report a Problem</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => signOut()}
                        className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-foreground hover:bg-muted hover:text-primary transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <>
                {/* Sign In hides on the narrowest phones; the mobile menu keeps it reachable */}
                <Link
                  href="/auth/signin"
                  className="hidden min-[400px]:inline-block whitespace-nowrap text-sm font-atkinson font-bold text-foreground hover:text-primary transition-colors px-2 sm:px-3 py-2"
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

            {/* Mobile Hamburger Button — quiet ghost chrome; selection told via muted, not primary */}
            <button
              type="button"
              className={cn(
                "md:hidden relative inline-flex shrink-0 items-center justify-center w-10 h-10 rounded-lg text-foreground transition-colors duration-200",
                "hover:bg-muted/70 active:scale-95",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                isMobileMenuOpen && "bg-muted"
              )}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu-panel"
            >
              <span className="relative block w-[18px] h-[14px]" aria-hidden="true">
                <span
                  className={cn(
                    "absolute left-0 top-0 w-full h-[2px] rounded-full bg-current transition-transform duration-300 ease-out-quart",
                    isMobileMenuOpen && "translate-y-[6px] rotate-45"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[6px] w-full h-[2px] rounded-full bg-current transition-[transform,opacity] duration-200 ease-out-quart",
                    isMobileMenuOpen && "scale-x-0 opacity-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 top-[12px] w-full h-[2px] rounded-full bg-current transition-transform duration-300 ease-out-quart",
                    isMobileMenuOpen && "-translate-y-[6px] -rotate-45"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Backdrop */}
      <button
        type="button"
        aria-hidden={!isMobileMenuOpen}
        tabIndex={-1}
        onClick={() => setIsMobileMenuOpen(false)}
        className={cn(
          "md:hidden fixed inset-x-0 top-16 bottom-0 z-40 bg-background/60 backdrop-blur-sm transition-opacity duration-280",
          isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      />

      {/* Mobile Menu - Panel */}
      <div
        id="mobile-menu-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        data-open={isMobileMenuOpen}
        inert={!isMobileMenuOpen}
        className={cn(
          "md:hidden absolute top-full inset-x-0 z-50 origin-top",
          "overflow-hidden border-b border-border/60 bg-card elev-3",
          "transition-[opacity,transform] duration-300 ease-out-quart",
          isMobileMenuOpen
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 -translate-y-2 pointer-events-none"
        )}
      >
        <div className="max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain px-4 pt-4 pb-8 sm:px-6">
          {/* Authenticated user summary */}
          {isAuthenticated && user && (
            <div
              className="mb-4 flex items-center gap-3 border-b border-border/40 pb-4"
              data-menu-reveal
              style={{ '--reveal-index': 1 } as React.CSSProperties}
            >
              <Avatar className="h-10 w-10 ring-2 ring-primary ring-offset-2 ring-offset-card">
                <AvatarImage src={user.profilePicture} alt={`@${user.username}`} />
                <AvatarFallback className="bg-primary text-primary-foreground font-atkinson font-bold">
                  {user.username?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="truncate font-atkinson text-[15px] font-bold leading-tight text-foreground">
                  {user.displayName || user.username}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">@{user.username}</p>
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
