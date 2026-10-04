'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { CoralGlow } from '@/components/ui/coral-glow';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useHomeSearch } from './use-home-search';
import { HomeSearchBar, HomeSearchResults } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { CuratorProChip, CuratorProSection } from './curator-pro-section';
import { HomeClosing } from './home-closing';
import { DitherWeaveField } from './pixel-backgrounds';

const services = [
  { name: 'Spotify', logo: '/images/spotify_logo_colored.png' },
  { name: 'Apple Music', logo: '/images/apple_music_logo_colored.png' },
  { name: 'Deezer', logo: '/images/deezer_logo_colored.png' },
];

// What happens, in order. Numbered because it is a sequence.
const steps = [
  { title: 'Paste a link, or search', body: 'A track, album, artist, or playlist from Spotify, Apple Music, or Deezer.' },
  { title: 'Get one Cassette link', body: 'Cassette finds the same music on every service and puts it behind one link.' },
  { title: 'Send it, or keep it', body: 'The link opens in the app your friend uses. On your page, it becomes part of your taste.' },
];

/** Concept 2, Split desk: copy leads on the left in the Studio's quiet
    voice and speaks to curators first; the search is a frosted console on
    the right that stays put while the page scrolls. No offset shadows. */
export function HomeConceptSplitDesk() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const rise = (order: number) => ({
    initial: still ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.45, delay: 0.25 + 0.07 * order, ease: EASE_OUT_QUART },
  });

  return (
    <div className="relative min-h-screen">
      <CoralGlow aria-hidden className="pointer-events-none fixed inset-0 z-0" />
      {/* Light mode: a photographed sheet of paper with one coral light leak
          (generated for this concept) instead of the CSS glow. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 dark:hidden">
        <Image src="/images/home-concepts/hero-paper-light.jpg" alt="" fill sizes="100vw" priority className="object-cover" />
      </div>
      {/* Hatched dashes in ink, switched by a slow field: texture, not a picture. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <DitherWeaveField className="text-foreground opacity-[0.14] dark:opacity-20" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-7xl px-5 pt-8 sm:px-8 lg:pt-14">
        <div className="grid grid-cols-1 gap-12 lg:min-h-[calc(100vh-7.5rem)] lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <div className="flex flex-col justify-center">
            <HomeBrand className="w-[76%] max-w-[420px]" />
            <motion.div {...rise(0)} className="mt-8"><CuratorProChip /></motion.div>
            <motion.h1 {...rise(1)} className="mt-4 font-teko text-6xl font-bold uppercase leading-[0.88] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
              Your taste.
              <br />
              Your page.
              <br />
              Your members.
            </motion.h1>
            <motion.p {...rise(2)} className="mt-6 max-w-lg font-roboto text-base italic text-muted-foreground sm:text-lg">
              Cassette gives curators one page any fan can open, whatever they stream with. Curator Pro lets those fans pay you for it every month.
            </motion.p>
            <motion.div {...rise(3)} className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/auth/signup"
                className="inline-flex items-center justify-center border-2 border-foreground bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-flat-3 transition-[transform,box-shadow] duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-flat-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
              >
                Start your page
              </Link>
              <DemoButton variant="brutalist-outline" />
            </motion.div>
            <motion.div {...rise(4)} className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <span>Just here to share a song? Paste a link. It opens in</span>
              <div className="flex items-center gap-3">
                {services.map((service) => (
                  <span key={service.name} className="inline-flex items-center gap-1.5 text-foreground">
                    <Image src={service.logo} alt="" width={20} height={20} className="h-5 w-5 object-contain" />
                    {service.name}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          <motion.aside
            {...rise(1)}
            className="card-quiet flex flex-col p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)]"
            aria-label="Find music to share"
          >
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-foreground">Find something to share</span>
              <span className="signal-dot signal-dot-pulse whitespace-nowrap text-xs text-success-text">Live charts</span>
            </div>
            <HomeSearchBar search={search} size="sm" chrome="ink" placeholder="Search a song, or paste a link" />
            <div className="mt-3 min-h-0 flex-1 overflow-hidden">
              <HomeSearchResults search={search} />
            </div>
          </motion.aside>
        </div>
      </div>

      <CuratorProSection className="relative z-10 mt-28" />

      <section className="relative z-10 mx-auto mt-28 max-w-5xl px-5 sm:px-8">
        <h2 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight text-foreground sm:text-5xl">
          How a Cassette link works
        </h2>
        <ol className="mt-8 grid grid-cols-1 gap-8 border-t border-border/60 pt-8 sm:grid-cols-3 sm:gap-10">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-4">
              <span className="font-teko text-4xl font-bold leading-none text-primary tabular-nums">{index + 1}</span>
              <div>
                <h3 className="text-lg font-semibold leading-tight tracking-tight text-foreground">{step.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <HomeClosing isAuthenticated={search.isAuthenticated} title="Ready to start your page?" className="mt-24" />
    </div>
  );
}
