'use client';

import Link from 'next/link';
import { Music } from 'lucide-react';
import { useAuthState } from '@/hooks/use-auth';

export function Footer() {
  const { user } = useAuthState();

  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo and Description */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Music className="h-6 w-6 text-primary" />
              <span className="text-lg font-bold">Cassette</span>
            </Link>
            <p className="text-muted-foreground text-sm mb-4">
              Share your favorite music across all platforms. Connect with friends and discover new tunes.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-semibold mb-4">Navigation</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-foreground">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/explore" className="text-muted-foreground hover:text-foreground">
                  Explore
                </Link>
              </li>
              {user && (
                <li>
                  <Link href="/add-music" className="text-muted-foreground hover:text-foreground">
                    Add Music
                  </Link>
                </li>
              )}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h3 className="font-semibold mb-4">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-muted-foreground hover:text-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-muted-foreground hover:text-foreground">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-muted-foreground hover:text-foreground">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-6 flex flex-col sm:flex-row justify-between items-center">
          <p className="text-muted-foreground text-sm">
            © 2024 Cassette. All rights reserved.
          </p>
          <div className="flex space-x-4 mt-4 sm:mt-0">
            <span className="text-muted-foreground text-sm">
              Made with ❤️ for music lovers
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
