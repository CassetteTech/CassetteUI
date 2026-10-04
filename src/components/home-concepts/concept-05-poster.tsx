'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CoralGlow } from '@/components/ui/coral-glow';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { DitherWaveField } from './pixel-backgrounds';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useHomeSearch } from './use-home-search';
import { HomeSearchDropdown } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { CuratorPhoneDemo } from './curator-phone-demo';
import { CuratorProChip, CuratorProSection } from './curator-pro-section';
import { HomeClosing } from './home-closing';

const lines = ['Playlists', 'people pay for.'];

/** Concept 5, Poster: a poster headline at poster size, not wall size,
    with the curator's page as the picture beside it. The wordmark signs
    the bottom left, and the search bar stays docked to the viewport
    bottom with results opening upward. */
export function HomeConceptPoster() {
  const search = useHomeSearch();
  const still = useReducedMotion();

  return (
    <div className="relative min-h-screen">
      <CoralGlow aria-hidden className="pointer-events-none fixed inset-0 z-0" />
      {/* Ordered-dither bands drift under the poster; the pointer bends them.
          The field drains to paper behind the headline and lede on the left. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        <DitherWaveField density={0.3} calm={[0.27, 0.58, 0.34, 0.36]} className="text-primary opacity-25 dark:opacity-35" />
      </div>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-[1400px] flex-col justify-between px-5 pb-40 pt-6 sm:px-8 sm:pt-10">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div>
            <motion.div
              initial={still ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <CuratorProChip />
            </motion.div>
            <h1 className="mt-4 font-teko font-bold uppercase leading-[0.86] tracking-tight text-foreground" style={{ fontSize: 'clamp(3.5rem, 8.5vw, 8.5rem)' }}>
              {lines.map((line, index) => (
                <span key={line} className="block overflow-hidden">
                  <motion.span
                    className={index === 1 ? 'block text-primary' : 'block'}
                    initial={still ? false : { y: '110%' }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.9, delay: 0.15 + index * 0.12, ease: EASE_OUT_QUART }}
                  >
                    {line}
                  </motion.span>
                </span>
              ))}
            </h1>
            <motion.p
              initial={still ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: EASE_OUT_QUART }}
              className="mt-6 max-w-lg font-roboto text-lg italic text-foreground/85 sm:text-xl"
            >
              One page for your taste that opens in every app, and a membership your fans can join for a monthly price you set. Anyone else can paste a link and share a song, free.
            </motion.p>
          </div>
          <motion.div
            initial={still ? false : { opacity: 0, y: 24, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: -2 }}
            transition={{ duration: 0.9, delay: 0.5, ease: EASE_OUT_QUART }}
            className="justify-self-center"
          >
            <CuratorPhoneDemo />
          </motion.div>
        </div>

        <motion.div
          initial={still ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8, ease: EASE_OUT_QUART }}
          className="mt-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"
        >
          <HomeBrand className="w-[64%] max-w-[340px]" />
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <DemoButton />
            <span className="text-xs text-muted-foreground">Spotify, Apple Music, and Deezer. Free, no account needed.</span>
          </div>
        </motion.div>
      </section>

      <CuratorProSection phone={false} className="relative z-10 mt-8" />

      <div className="relative z-10 mx-auto mt-28 max-w-6xl px-5 pb-40">
        <HomeDemoSection isAuthenticated={search.isAuthenticated} />
      </div>

      {/* The demo section carries the sign-up ask, so only the footer here. */}
      <HomeClosing isAuthenticated className="pb-28" />

      {/* Bottom dock: pointer events only on the bar itself, so the page
          under the gutters stays scrollable. On phones it sits above the
          support button in the bottom-left corner. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 bg-gradient-to-t from-background/90 via-background/50 to-transparent px-4 pb-[4.75rem] pt-10 sm:pb-6">
        <motion.div
          initial={still ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.9, ease: EASE_OUT_QUART }}
          className="pointer-events-auto mx-auto max-w-3xl"
        >
          <HomeSearchDropdown search={search} above chrome="retro" placeholder="Paste a music link, or search a song" />
        </motion.div>
      </div>
    </div>
  );
}
