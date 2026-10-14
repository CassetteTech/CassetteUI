import type { ReactNode } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { STREAMING_SERVICES } from './home-brand';

const [spotify] = STREAMING_SERVICES;
const chip = 'flex h-8 w-full items-center gap-2 rounded-md border px-2.5 font-mono text-xs';

const logo = (service: (typeof STREAMING_SERVICES)[number]) => (
  <Image key={service.label} src={service.logo} alt="" width={14} height={14} className="h-3.5 w-3.5 shrink-0 object-contain" />
);

const steps: Array<{ title: string; body: string; visual: ReactNode }> = [
  {
    title: 'Paste a link',
    body: 'Any song, album, playlist, or artist from Spotify, Apple Music, or Deezer.',
    visual: (
      <span className={cn(chip, 'border-border bg-background text-muted-foreground')}>
        {logo(spotify)}
        <span className="truncate">open.spotify.com/…</span>
      </span>
    ),
  },
  {
    title: 'Share one link',
    body: 'Cassette finds the same music on the other apps, so your link opens in all three.',
    visual: (
      <span className="w-full space-y-2">
        <span className={cn(chip, 'border-primary/40 bg-primary/10 font-semibold text-foreground')}>
          <span className="truncate">cassette.tech/post/…</span>
        </span>
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          Opens in
          {STREAMING_SERVICES.map(logo)}
        </span>
      </span>
    ),
  },
  {
    title: 'Earn from fans',
    body: 'Make your page a membership. Fans pay monthly for the posts you keep for members.',
    visual: (
      <span className="block w-full rounded-md border border-primary/30 bg-background p-2.5">
        <span className="flex items-center justify-between text-xs font-semibold">
          Membership
          <span>Your price<span className="text-muted-foreground">/mo</span></span>
        </span>
        <span className="mt-2 block rounded bg-primary py-1 text-center text-xs font-bold text-primary-foreground">Join</span>
      </span>
    ),
  },
];

export function HomeHowItWorks({ className }: { className?: string }) {
  return (
    <section id="how-it-works" aria-labelledby="how-it-works-title" className={cn('mx-auto w-full max-w-5xl scroll-mt-24 px-5 sm:px-8', className)}>
      <div className="text-center">
        <h2 id="how-it-works-title" className="font-atkinson text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          How it works
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
          Share any music with one link. Then let fans pay for your best playlists.
        </p>
      </div>
      <ol className="mt-10 grid gap-4 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex flex-col rounded-lg border border-border bg-card/60 p-5">
            <span aria-hidden className="flex h-24 items-center rounded-md bg-muted/50 px-4">
              {step.visual}
            </span>
            <span aria-hidden className="mt-5 font-mono text-xs font-bold tabular-nums text-primary">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="mt-1.5 text-base font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
