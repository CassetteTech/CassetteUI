'use client';

import Link from 'next/link';
import { AnimatedPrimaryButton } from '@/components/ui/animated-button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthState, useSignOut } from '@/hooks/use-auth';
import { Search, User, LogOut, Home, Plus, Menu } from 'lucide-react';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '@/components/ui/navigation-menu';
import Image from 'next/image';

export function Navbar() {
  const { user, isAuthenticated } = useAuthState();
  const { mutate: signOut } = useSignOut();

  const handleSignOut = () => {
    signOut();
  };

  return (
    <nav className="bg-cream/95 backdrop-blur border-b border-text-hint/20">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
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

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href="/" className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-text-primary hover:text-primary transition-colors">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link href="/search" className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-text-primary hover:text-primary transition-colors">
                    <Search className="h-4 w-4" />
                    <span>Search</span>
                  </Link>
                </NavigationMenuItem>
                {isAuthenticated && (
                  <NavigationMenuItem>
                    <Link href="/add" className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-text-primary hover:text-primary transition-colors">
                      <Plus className="h-4 w-4" />
                      <span>Add Music</span>
                    </Link>
                  </NavigationMenuItem>
                )}
              </NavigationMenuList>
            </NavigationMenu>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <NavigationMenu>
                <NavigationMenuList>
                  <NavigationMenuItem>
                    <NavigationMenuTrigger className="p-0">
                      <Avatar className="h-8 w-8 border-2 border-primary">
                        <AvatarImage src={user?.profilePicture} alt={user?.username} />
                        <AvatarFallback className="bg-primary text-white font-atkinson font-bold">
                          {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="w-48 p-2 bg-white border border-text-hint/20 rounded-lg shadow-main">
                        <div className="px-3 py-2 border-b border-text-hint/20">
                          <p className="text-sm font-atkinson font-bold text-text-primary">{user?.displayName}</p>
                          <p className="text-xs text-text-secondary font-atkinson">@{user?.username}</p>
                        </div>
                        <div className="py-2">
                          <Link
                            href={`/profile/${user?.username}`}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-text-primary hover:bg-cream hover:text-primary transition-colors"
                          >
                            <User className="h-4 w-4" />
                            <span>Profile</span>
                          </Link>
                          <button
                            onClick={handleSignOut}
                            className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-atkinson font-bold text-text-primary hover:bg-cream hover:text-primary transition-colors w-full text-left"
                          >
                            <LogOut className="h-4 w-4" />
                            <span>Sign Out</span>
                          </button>
                        </div>
                      </div>
                    </NavigationMenuContent>
                  </NavigationMenuItem>
                </NavigationMenuList>
              </NavigationMenu>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  href="/auth/signin"
                  className="text-sm font-atkinson font-bold text-text-primary hover:text-primary transition-colors px-3 py-2"
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
          <div className="md:hidden">
            <button className="text-text-primary hover:text-primary transition-colors">
              <Menu className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}