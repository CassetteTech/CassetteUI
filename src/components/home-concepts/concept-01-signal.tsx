'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { CoralGlow } from '@/components/ui/coral-glow';
import { HomeDitherField } from '@/components/pages/home-dither-field';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { EASE_OUT_QUART } from '@/lib/motion';
import { cn } from '@/lib/utils';
import { useHomeSearch } from './use-home-search';
import { HomeSearchDropdown } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { ChartStrip } from './chart-strip';
import { CuratorProSection } from './curator-pro-section';
import { HomeClosing } from './home-closing';

const services = [
  { name: 'Spotify', logo: '/images/spotify_logo_colored.png' },
  { name: 'Apple Music', logo: '/images/apple_music_logo_colored.png' },
  { name: 'Deezer', logo: '/images/deezer_logo_colored.png' },
];

// One pass of the signal, in seconds: the link leaves the phone, the mark
// folds it, three copies fan out, the apps light up, then it rests.
const PHASES = { travel: 0, fold: 1.0, deliver: 1.5, done: 2.4, rest: 3.6 };
const LOOP_MS = 4600;

/**
 * The product as a wire diagram. A Spotify link leaves one phone, hits
 * the Cassette mark, and lands in every app. It plays on a loop, and it
 * is still (at its end state) under reduced motion.
 */
function Signal() {
  const still = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (still) return;
    const timer = setInterval(() => setTick((value) => value + 1), LOOP_MS);
    return () => clearInterval(timer);
  }, [still]);
  const ease = EASE_OUT_QUART;
  const at = (delay: number, duration: number) => ({ duration, delay, ease });

  return (
    <div className="grid w-full max-w-3xl grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2 sm:gap-4" aria-label="A Spotify link becomes one Cassette link that opens in Spotify, Apple Music, and Deezer">
      {/* Sender */}
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card sm:h-16 sm:w-16">
          <Image src={services[0].logo} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
        </div>
        <span className="text-[11px] text-muted-foreground sm:text-xs">A Spotify link</span>
      </div>

      {/* Wire in */}
      <div className="relative h-px bg-foreground/20">
        <motion.span
          key={`in-${tick}`}
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary"
          initial={still ? { left: '100%', opacity: 0 } : { left: '0%', opacity: 0 }}
          animate={still ? undefined : { left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
          transition={{ ...at(PHASES.travel, 1), times: [0, 0.1, 0.9, 1] }}
        />
      </div>

      {/* The mark folds the link */}
      <div className="flex flex-col items-center gap-2">
        <motion.div
          key={`fold-${tick}`}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-foreground bg-primary shadow-flat-3 sm:h-20 sm:w-20"
          initial={false}
          animate={still ? undefined : { scale: [1, 0.9, 1.06, 1], rotate: [0, -3, 2, 0] }}
          transition={at(PHASES.fold, 0.55)}
        >
          <Image src="/images/cassette_logo.png" alt="" width={40} height={40} className="h-9 w-9 sm:h-10 sm:w-10" />
        </motion.div>
        <span className="text-[11px] font-semibold text-foreground sm:text-xs">One Cassette link</span>
      </div>

      {/* Wire out: three copies fan to three apps */}
      <div className="relative h-24 sm:h-28">
        {[-1, 0, 1].map((lane) => (
          <div key={lane} className="absolute inset-x-0 top-1/2 h-px origin-left bg-foreground/20" style={{ transform: `translateY(-50%) rotate(${lane * 17}deg)` }}>
            <motion.span
              key={`out-${lane}-${tick}`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full bg-primary"
              initial={{ left: '0%', opacity: 0 }}
              animate={still ? undefined : { left: ['0%', '100%'], opacity: [0, 1, 1, 0] }}
              transition={{ ...at(PHASES.deliver + Math.abs(lane) * 0.08, 0.8), times: [0, 0.1, 0.9, 1] }}
            />
          </div>
        ))}
      </div>

      {/* Receivers light up in order */}
      <ul className="flex flex-col gap-2">
        {services.map((service, index) => (
          <motion.li
            key={`${service.name}-${tick}`}
            className="flex items-center gap-2 rounded-xl border border-border/70 bg-card px-2.5 py-1.5"
            initial={still ? { borderColor: 'hsl(var(--primary))' } : { borderColor: 'hsl(var(--border) / 0.7)' }}
            animate={still ? undefined : { borderColor: ['hsl(var(--border) / 0.7)', 'hsl(var(--primary))', 'hsl(var(--primary))', 'hsl(var(--border) / 0.7)'] }}
            transition={{ ...at(PHASES.done + index * 0.12, 1.6), times: [0, 0.1, 0.7, 1] }}
          >
            <Image src={service.logo} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
            <span className="hidden text-xs text-foreground sm:inline">{service.name}</span>
            <motion.span
              key={`check-${service.name}-${tick}`}
              className="ml-auto text-success-text"
              initial={still ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
              animate={still ? undefined : { opacity: [0, 1, 1, 0], scale: [0.6, 1, 1, 0.8] }}
              transition={{ ...at(PHASES.done + index * 0.12, 1.6), times: [0, 0.1, 0.7, 1] }}
            >
              <Check className="h-3.5 w-3.5" aria-hidden />
            </motion.span>
          </motion.li>
        ))}
      </ul>
    </div>
  );
}

/** Concept 1, Signal: one centred column, vertically balanced. The
    wordmark in the dithered sun, one promise for both audiences, the bar
    with charting covers under it, and the wire diagram as the visual. */
export function HomeConceptSignal() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const wordmarkRef = useRef<HTMLDivElement>(null);
  const taglineRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const rise = (order: number) => ({
    initial: still ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay: 0.3 + 0.1 * order, ease: EASE_OUT_QUART },
  });

  return (
    <div className="relative min-h-screen">
      <CoralGlow aria-hidden className="pointer-events-none fixed inset-0 z-0" />
      <HomeDitherField
        wordmarkRef={wordmarkRef}
        taglineRef={taglineRef}
        searchRef={searchRef}
        algorithm="atkinson"
        className="pointer-events-none absolute left-0 -top-16 z-0 text-primary opacity-35 dark:opacity-45 dark:[--dither-peak:0.34]"
      />

      <div className="relative z-10">
        <section className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-5 py-10">
          <div ref={wordmarkRef} className="w-[80%] max-w-[480px]">
            <HomeBrand />
          </div>

          <div ref={taglineRef} className="mt-4 text-center">
            <motion.h1 {...rise(0)} className="font-atkinson text-2xl font-bold leading-tight text-foreground text-balance sm:text-3xl lg:text-4xl">
              Share music with anyone. Get paid for your taste.
            </motion.h1>
            <motion.p {...rise(1)} className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground text-pretty sm:text-base">
              Paste a Spotify, Apple Music, or Deezer link and get one that opens in every app. Curators get a page fans can join for a monthly price.
            </motion.p>
          </div>

          <motion.div {...rise(2)} ref={searchRef} className="mt-7 w-full">
            <HomeSearchDropdown search={search} onlyWhenQuery placeholder="Paste a music link, or search a song" />
          </motion.div>

          <motion.div {...rise(3)} className={cn('mt-9 flex w-full justify-center', search.isConverting && 'opacity-30')}>
            <Signal />
          </motion.div>

          <motion.div {...rise(4)} className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
            <DemoButton />
            <p className="text-xs text-muted-foreground">Tracks, albums, artists, and playlists. Free, no account needed.</p>
          </motion.div>
        </section>

        <ChartStrip search={search} className="mx-auto max-w-3xl px-5" />

        <CuratorProSection className="mt-28" />

        <div className="mx-auto mt-28 max-w-6xl px-5 pb-24">
          <HomeDemoSection isAuthenticated={search.isAuthenticated} />
        </div>
      </div>

      {/* The demo section above carries the sign-up ask, so only the footer here. */}
      <HomeClosing isAuthenticated />
    </div>
  );
}
