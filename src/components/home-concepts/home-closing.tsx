'use client';

import Link from 'next/link';
import Image from 'next/image';
import { SocialLinks } from '@/components/ui/social-links';
import { cn } from '@/lib/utils';

const services = ['spotify', 'apple_music', 'deezer'];

/** The sign-up ask that closes every concept, then the footer links. The
    ask is skipped for signed-in visitors. */
export function HomeClosing({
  isAuthenticated,
  title = 'Ready to share music everywhere?',
  calm = false,
  className,
}: {
  isAuthenticated: boolean;
  title?: string;
  /** Sentence-case Atkinson heading, for heroes in that voice. */
  calm?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('relative z-10', className)}>
      {!isAuthenticated && (
        <section className="mx-auto max-w-xl px-5 pb-20 pt-8 text-center">
          <h2 className={cn(calm ? 'font-atkinson text-2xl font-bold leading-tight sm:text-3xl' : 'font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl')}>{title}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            A free account keeps every link you share on one profile, and lets you save your own playlists to it.
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {services.map((service) => (
              <Image
                key={service}
                src={`/images/${service}_logo_colored.png`}
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 object-contain opacity-70"
              />
            ))}
          </div>
          <Link
            href="/auth/signup"
            className="mt-7 inline-flex items-center justify-center border-2 border-foreground bg-primary px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-flat-4 transition-[transform,box-shadow] duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-flat-6 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
          >
            Create a free account
          </Link>
        </section>
      )}
      <footer className="border-t border-border/40 px-4 py-4">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-center gap-3 text-sm text-muted-foreground sm:flex-row sm:gap-6">
          <Link href="/promote" className="hover:text-foreground">Promote Your Music</Link>
          <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
          <SocialLinks iconClassName="h-4 w-4" />
        </div>
      </footer>
    </div>
  );
}
