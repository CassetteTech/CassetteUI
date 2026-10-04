'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CuratorPhoneDemo } from './curator-phone-demo';

// The three things Pro does, in the curator's words. Parallel, not a sequence.
const points = [
  { title: 'Set your price', body: 'Fans join your page for a monthly price you choose. Cassette handles the billing.' },
  { title: 'Keep some for members', body: 'Lock playlists and posts so only members can open them. Everything else stays public.' },
  { title: 'Get paid every month', body: 'Earnings pay out to your bank monthly. Your free page and links stay free.' },
];

export function CuratorProChip({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary', className)}>
      <Sparkles className="h-3 w-3" aria-hidden />
      Curator Pro, coming soon
    </span>
  );
}

/** The curator pitch every concept carries: a page fans pay for. `split`
    puts the phone beside the copy; `stack` centres the copy over it. */
export function CuratorProSection({ layout = 'split', phone = true, title = 'Get paid for your taste.', calm = false, className }: {
  layout?: 'split' | 'stack';
  /** Show the curator's page; off when the hero already shows it. */
  phone?: boolean;
  /** A different heading, when the hero already says the default. */
  title?: string;
  /** Sentence-case Atkinson headings and upright body, for heroes in that voice. */
  calm?: boolean;
  className?: string;
}) {
  const split = layout === 'split' && phone;
  return (
    <section
      className={cn(
        'mx-auto w-full max-w-6xl px-5 sm:px-8',
        split ? 'grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:gap-16' : 'flex flex-col items-center text-center',
        className,
      )}
      aria-labelledby="curator-pro-title"
    >
      <div className={cn(!split && 'max-w-2xl')}>
        <CuratorProChip />
        <h2
          id="curator-pro-title"
          className={cn(
            'mt-4 text-foreground',
            calm ? 'font-atkinson text-3xl font-bold leading-tight sm:text-4xl' : 'font-teko text-5xl font-bold uppercase leading-[0.9] tracking-tight sm:text-6xl lg:text-7xl',
          )}
        >
          {title}
        </h2>
        <p className={cn('mt-5 text-base text-muted-foreground sm:text-lg', !calm && 'font-roboto italic', split ? 'max-w-lg' : 'mx-auto max-w-xl')}>
          Curator Pro turns your Cassette page into a membership. Fans join for a monthly price you set, unlock the playlists you keep for members, and you get paid out every month. Think Patreon, for music curators.
        </p>
        <ul className={cn('mt-8 grid gap-6', split ? 'sm:grid-cols-3 lg:grid-cols-1 lg:gap-5' : 'sm:grid-cols-3 text-left')}>
          {points.map((point) => (
            <li key={point.title} className={cn(split && 'lg:flex lg:gap-4')}>
              <span aria-hidden className="mb-2 block h-[2px] w-8 bg-primary lg:mb-0 lg:mt-2.5 lg:shrink-0" />
              <div>
                <h3 className="text-base font-semibold leading-tight text-foreground">{point.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{point.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className={cn('mt-8 flex flex-wrap items-center gap-x-5 gap-y-3', !split && 'justify-center')}>
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center border-2 border-foreground bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-flat-3 transition-[transform,box-shadow] duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-flat-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
          >
            Get early access
          </Link>
          <p className="text-sm text-muted-foreground">Not a curator? Every Cassette link still opens in your app, free.</p>
        </div>
      </div>
      {phone && <CuratorPhoneDemo className={cn(!split && 'mt-12')} />}
    </section>
  );
}
