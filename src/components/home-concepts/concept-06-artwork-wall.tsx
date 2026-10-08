'use client';

import { useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArtworkWallBackground } from '@/components/features/marketing/artwork-wall-background';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { HomeDitherField } from '@/components/pages/home-dither-field';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useHomeSearch } from './use-home-search';
import { HomeSearchDropdown } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { CuratorMembershipSection } from './curator-membership-section';
import { HomeClosing } from './home-closing';

/** Concept 6, Artwork wall: the charts are the backdrop, printed. Real
    covers drift in slow columns under a paper halftone screen, a grain
    sun rises behind the card, and the page below dithers in over the
    wall like a sheet laid on top. */
export function HomeConceptArtworkWall() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-svh">
      <ArtworkWallBackground />
      {/* Grain sun behind the card, cut-outs drifting above it. */}
      <HomeDitherField
        wordmarkRef={cardRef}
        taglineRef={sheetRef}
        searchRef={sheetRef}
        algorithm="atkinson"
        className="pointer-events-none absolute left-0 -top-16 z-0 text-primary opacity-40 dark:opacity-50"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100svh-4rem)] w-full max-w-2xl items-center justify-center px-5 py-12">
        <motion.div
          ref={cardRef}
          initial={still ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT_QUART }}
          className="relative w-full rounded-xl border-2 border-foreground bg-card/85 p-6 text-center shadow-flat-6 backdrop-blur-md sm:p-10"
        >
          <HomeBrand className="mx-auto w-[86%] max-w-[460px]" />
          <h1 className="mt-4 font-atkinson text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Share music with anyone. Get paid for your taste.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground sm:text-base">
            Paste a Spotify, Apple Music, or Deezer link to share a song in every app. Or open a curator page that fans join for a monthly price you set.
          </p>
          <HomeSearchDropdown search={search} className="mt-7" placeholder="Search a song, or paste a link" />
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5">
            <DemoButton />
            <span className="text-xs text-muted-foreground">Tracks, albums, artists, and playlists. Free.</span>
          </div>
        </motion.div>
      </section>

      {/* The rest of the page is a sheet laid over the wall: its top edge
          dithers into the covers, and everything below sits on paper. */}
      <div ref={sheetRef} className="relative z-10 mt-10 bg-background">
        <DitherEdge color="hsl(var(--background))" side="top" />
        <CuratorMembershipSection isAuthenticated={search.isAuthenticated} className="pt-24" />
        <div className="mx-auto mt-28 max-w-6xl px-5 pb-24">
          <HomeDemoSection isAuthenticated={search.isAuthenticated} />
        </div>
        {/* The demo section carries the sign-up ask, so only the footer here. */}
        <HomeClosing isAuthenticated />
      </div>
    </div>
  );
}
