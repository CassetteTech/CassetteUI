'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { CoralGlow } from '@/components/ui/coral-glow';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useHomeSearch } from './use-home-search';
import { HomeSearchBar, HomeSearchResults } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { CuratorPhoneDemo } from './curator-phone-demo';
import { CuratorProChip, CuratorProSection } from './curator-pro-section';
import { HomeClosing } from './home-closing';
import { HalftoneBlobField } from './pixel-backgrounds';

// The two jobs, side by side. Not a sequence, so no numbers.
const jobs = [
  {
    title: 'Share one link',
    body: 'Paste a Spotify, Apple Music, or Deezer link, or search a song. The link you get opens in whichever app your friend uses.',
  },
  {
    title: 'Build a page fans pay for',
    body: 'Every link you share, and every playlist you save, collects on your page. With Curator Pro, fans join it for a monthly price you set.',
  },
];

/** Concept 8, Profile led: the curator's page is the hero. Copy on the
    left says the page is something fans can pay for. Using the search
    takes over that column: the copy folds away, the bar rises under the
    wordmark, and the results fill the panel. Escape or a click outside
    hands the copy back. */
export function HomeConceptProfileLed() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const phoneY = useTransform(scrollYProgress, [0, 1], [0, still ? 0 : 80]);
  const open = search.isSearchActive && !search.isConverting;

  const rise = (order: number) => ({
    initial: still ? false : { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, delay: 0.25 + 0.1 * order, ease: EASE_OUT_QUART },
  });
  const spring = { type: 'spring' as const, stiffness: 320, damping: 32 };

  return (
    <div className="relative min-h-screen">
      <CoralGlow aria-hidden vivid className="pointer-events-none fixed inset-0 z-0 opacity-70 dark:opacity-100" />
      {/* Halftone screen that pools around the phone and fades out under
          the copy, so the print texture frames the page without sitting
          behind the words. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 lg:[mask-image:linear-gradient(to_right,transparent_38%,black_68%)]">
        <HalftoneBlobField spacing={12} blobs={4} className="text-primary opacity-20 dark:opacity-30" />
      </div>

      <section ref={heroRef} className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-8 sm:px-8 lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)] lg:pt-0">
        <div className="flex flex-col lg:min-h-[36rem]">
          <HomeBrand className="w-[80%] max-w-[440px]" />

          <AnimatePresence initial={false}>
            {!open && (
              <motion.div
                key="copy"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                <motion.div {...rise(0)} className="mt-8"><CuratorProChip /></motion.div>
                <motion.h1 {...rise(1)} className="mt-4 font-teko text-6xl font-bold uppercase leading-[0.88] tracking-tight text-foreground sm:text-7xl">
                  Your taste, on a page fans can pay for.
                </motion.h1>
                <motion.p {...rise(2)} className="mt-5 max-w-lg font-roboto text-base italic text-muted-foreground sm:text-lg">
                  Every link you share builds your page, and it opens in every app. With Curator Pro, fans join it for a monthly price you set, unlock members-only playlists, and you get paid monthly.
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div layout="position" transition={spring} className="mt-8 max-w-xl">
            <HomeSearchBar search={search} chrome="ink" closeOnBlur placeholder="Search a song, or paste a link" />
          </motion.div>

          <AnimatePresence>
            {open && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25, ease: EASE_OUT_QUART }}
                className="mt-3 max-w-xl"
              >
                <HomeSearchResults search={search} />
                <p className="mt-3 text-xs text-muted-foreground">Press Escape, or click away, to go back.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence initial={false}>
            {!open && (
              <motion.div
                key="actions"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={spring}
                className="overflow-hidden"
              >
                <motion.div {...rise(3)} className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                  <Link
                    href="/auth/signup"
                    className="inline-flex items-center justify-center border-2 border-foreground bg-primary px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-primary-foreground shadow-flat-3 transition-[transform,box-shadow] duration-150 ease-out-quart hover:-translate-y-0.5 hover:shadow-flat-4 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/50"
                  >
                    Start your page
                  </Link>
                  <DemoButton variant="brutalist-outline" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.div
          style={{ y: phoneY }}
          initial={still ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4, ease: EASE_OUT_QUART }}
          className="mx-auto w-full max-w-[420px]"
        >
          <CuratorPhoneDemo />
        </motion.div>
      </section>

      <section className="relative z-10 mx-auto mt-16 grid max-w-5xl grid-cols-1 gap-10 border-t border-border/60 px-5 pt-10 sm:grid-cols-2 sm:px-8">
        {jobs.map((job) => (
          <div key={job.title}>
            <h2 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight text-foreground">{job.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{job.body}</p>
          </div>
        ))}
      </section>

      <CuratorProSection layout="stack" phone={false} className="relative z-10 mt-28" />

      <HomeClosing isAuthenticated={search.isAuthenticated} title="Ready to start your page?" className="mt-24" />
    </div>
  );
}
