'use client';

import { useMemo } from 'react';
import Image from 'next/image';
import { useTopCharts } from '@/hooks/use-music';

const COLUMNS = 7;

/** Decorative full-viewport backdrop: chart artwork drifts in slow columns
    under a paper halftone screen. Until the charts arrive, the columns hold
    muted tiles so the surface above still has something to sit on. Hidden
    from assistive technology; the columns stand still under reduced motion. */
export function ArtworkWallBackground() {
  const { data: charts } = useTopCharts();

  // Distinct artwork from the charts, dealt into columns.
  const columns = useMemo(() => {
    const artworks = Array.from(new Set(
      [...(charts?.tracks ?? []), ...(charts?.albums ?? []), ...(charts?.playlists ?? [])]
        .map((item) => item.artwork)
        .filter((artwork): artwork is string => !!artwork),
    ));
    return Array.from({ length: COLUMNS }, (_, column) => {
      const dealt = artworks.filter((_, index) => index % COLUMNS === column);
      const tiles = dealt.length ? dealt : Array<null>(8).fill(null);
      // Two copies, so the drift can move one copy's height and loop.
      return [...tiles, ...tiles];
    });
  }, [charts]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-background">
      <div className="absolute inset-x-0 -top-10 bottom-0 grid grid-cols-3 gap-3 px-3 opacity-70 saturate-[0.85] sm:grid-cols-5 lg:grid-cols-7 dark:opacity-50 [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_78%)]">
        {columns.map((tiles, index) => (
          <div
            key={index}
            className={index >= 3 ? (index >= 5 ? 'artwork-wall-column hidden lg:flex' : 'artwork-wall-column hidden sm:flex') : 'artwork-wall-column'}
            style={{ animationDuration: `${70 + index * 11}s`, animationDirection: index % 2 ? 'reverse' : 'normal' }}
          >
            {tiles.map((artwork, tile) => (
              <div key={tile} className="relative aspect-square w-full overflow-hidden rounded-md bg-muted">
                {artwork && <Image src={artwork} alt="" fill sizes="220px" className="object-cover" />}
              </div>
            ))}
          </div>
        ))}
      </div>
      {/* Paper dots over the covers: the wall is a print, not a photo grid. */}
      <div className="artwork-wall-halftone absolute inset-0 opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-transparent to-background" />
    </div>
  );
}
