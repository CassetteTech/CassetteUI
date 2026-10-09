'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SocialLinks } from '@/components/ui/social-links';
import { usePaidPromotionSalesEnabled } from '@/hooks/use-paid-promotion-availability';
import { cn } from '@/lib/utils';
import { STREAMING_SERVICES, StartPageLink } from './home-brand';

/** The sign-up ask that closes the page, a line for artists while Boost is on
    sale, then the footer links. The ask is skipped for signed-in visitors. */
export function HomeClosing({ isAuthenticated, className }: { isAuthenticated: boolean; className?: string }) {
  const paidPromotionSalesEnabled = usePaidPromotionSalesEnabled();
  return (
    <div className={cn('relative z-10', className)}>
      {!isAuthenticated && (
        <section className="mx-auto max-w-xl px-5 pb-16 pt-8 text-center">
          <h2 className="font-atkinson text-2xl font-bold leading-tight sm:text-3xl">Start your free Cassette page.</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Keep every song, album, and playlist you share in one place. Add a monthly price when you&apos;re ready.
          </p>
          <div className="mt-6 flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-3">
              {STREAMING_SERVICES.map((service) => (
                <Image key={service.label} src={service.logo} alt="" width={28} height={28} className="h-7 w-7 object-contain opacity-70" />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Works with Spotify, Apple Music, and Deezer</p>
          </div>
          <StartPageLink isAuthenticated={false} className="mt-7" />
          <p className="mt-3 text-xs text-muted-foreground">Sign up with Google.</p>
        </section>
      )}
      {paidPromotionSalesEnabled && (
        <p className="px-5 pb-6 text-center text-sm text-muted-foreground">
          Make music?{' '}
          <Link href="/promote" className="font-semibold text-foreground underline-offset-4 hover:underline">
            Promote it on Cassette
          </Link>{' '}
          with a clearly labeled sponsored spot on Explore.
        </p>
      )}
      <footer className="border-t border-border/40 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </footer>
    </div>
  );
}
