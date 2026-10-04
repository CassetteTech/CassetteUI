'use client';

import { useMemo, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { HomeDitherField } from '@/components/pages/home-dither-field';
import { HomeDemoSection } from '@/components/demo/home-demo-section';
import { EASE_OUT_QUART } from '@/lib/motion';
import { useHomeSearch } from './use-home-search';
import { HomeSearchDropdown } from './home-search-bar';
import { HomeBrand, DemoButton } from './home-brand';
import { CuratorProChip, CuratorProSection } from './curator-pro-section';
import { HomeClosing } from './home-closing';

const COLUMNS = 7;

/** Concept 6, Artwork wall: the charts are the backdrop, printed. Real
    covers drift in slow columns under a paper halftone screen, a grain
    sun rises behind the card, and the page below dithers in over the
    wall like a sheet laid on top. */
export function HomeConceptArtworkWall() {
  const search = useHomeSearch();
  const still = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Distinct artwork from the charts, dealt into columns. Until the charts
  // arrive, the wall is muted tiles so the card has something to frost.
  const columns = useMemo(() => {
    const charts = search.topCharts;
    const artworks = Array.from(new Set(
      [...(charts?.tracks ?? []), ...(charts?.albums ?? []), ...(charts?.playlists ?? [])]
        .map((item) => item.artwork)
        .filter((artwork): artwork is string => !!artwork),
    ));
    return Array.from({ length: COLUMNS }, (_, column) =>
      artworks.filter((_, index) => index % COLUMNS === column));
  }, [search.topCharts]);

  return (
    <div className="relative min-h-screen">
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
        <div className="absolute inset-x-0 -top-10 bottom-0 grid grid-cols-3 gap-3 px-3 opacity-70 saturate-[0.85] sm:grid-cols-5 lg:grid-cols-7 dark:opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_78%)]">
          {columns.map((column, index) => (
            <div
              key={index}
              className={index >= 3 ? (index >= 5 ? 'home-wall-column hidden lg:flex' : 'home-wall-column hidden sm:flex') : 'home-wall-column'}
              style={{ animationDuration: `${70 + index * 11}s`, animationDirection: index % 2 ? 'reverse' : 'normal' }}
            >
              {[...(column.length ? column : Array<null>(8).fill(null)), ...(column.length ? column : Array<null>(8).fill(null))].map((artwork, tile) => (
                <div key={tile} className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                  {artwork && <Image src={artwork} alt="" fill sizes="220px" className="object-cover" />}
                </div>
              ))}
            </div>
          ))}
        </div>
        {/* Paper dots over the covers: the wall is a print, not a photo grid. */}
        <div className="home-halftone-screen absolute inset-0 opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
      </div>
      {/* Grain sun behind the card, cut-outs drifting above it. */}
      <HomeDitherField
        wordmarkRef={cardRef}
        taglineRef={sheetRef}
        searchRef={sheetRef}
        algorithm="atkinson"
        className="pointer-events-none absolute left-0 -top-16 z-0 text-primary opacity-40 dark:opacity-50"
      />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-2xl items-center justify-center px-5 py-12">
        <motion.div
          ref={cardRef}
          initial={still ? false : { opacity: 0, y: 16, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE_OUT_QUART }}
          className="relative w-full rounded-xl border-2 border-foreground bg-card/85 p-6 text-center shadow-flat-6 backdrop-blur-md sm:p-10"
        >
          <HomeBrand className="mx-auto w-[86%] max-w-[460px]" />
          <CuratorProChip className="mt-6" />
          <h1 className="mt-4 font-atkinson text-2xl font-bold leading-tight text-foreground text-balance sm:text-3xl">
            Share music with anyone. Get paid for your taste.
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground text-pretty sm:text-base">
            Paste a Spotify, Apple Music, or Deezer link to share a song in every app. Or open a curator page that fans join for a monthly price you set.
          </p>
          <HomeSearchDropdown search={search} chrome="ink" className="mt-7" placeholder="Search a song, or paste a link" />
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
        <CuratorProSection className="pt-24" />
        <div className="mx-auto mt-28 max-w-6xl px-5 pb-24">
          <HomeDemoSection isAuthenticated={search.isAuthenticated} />
        </div>
        {/* The demo section carries the sign-up ask, so only the footer here. */}
        <HomeClosing isAuthenticated />
      </div>
    </div>
  );
}
