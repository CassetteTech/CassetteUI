'use client';

import { useState, type ReactNode } from 'react';
import { CoralGlow } from '@/components/ui/coral-glow';
import { cn } from '@/lib/utils';
import { useHomeSearch } from './use-home-search';
import { HomeSearchDropdown } from './home-search-bar';
import { HomeBrand } from './home-brand';
import { HalftoneBlobField, DitherWaveField, DitherWeaveField } from './pixel-backgrounds';

const fields: { key: string; name: string; note: string; render: (ink: string) => ReactNode }[] = [
  {
    key: 'halftone',
    name: 'Halftone blobs',
    note: 'A print screen. Dots swell as unseen blobs drift under it.',
    render: (ink) => <HalftoneBlobField className={ink} />,
  },
  {
    key: 'wave',
    name: 'Dither wave',
    note: 'Bayer bands drift across the page. The pointer bends them.',
    render: (ink) => <DitherWaveField className={ink} />,
  },
  {
    key: 'weave',
    name: 'Dither weave',
    note: 'Hatched dashes switched on and off by a flowing field.',
    render: (ink) => <DitherWeaveField className={ink} />,
  },
];

// Ink choices are tokens, so each field follows the theme.
const inks = [
  { key: 'brand', label: 'Brand red', className: 'text-primary opacity-30 dark:opacity-40' },
  { key: 'ink', label: 'Ink', className: 'text-foreground opacity-[0.16] dark:opacity-25' },
  { key: 'tape', label: 'Tape brown', className: 'text-secondary opacity-25 dark:opacity-30' },
];

const chip = 'rounded-full px-2.5 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';

/** Flip between the canvas backdrops in Cassette colours, with the
    wordmark and the search bar on top so each one is judged with content. */
export function BackgroundGallery() {
  const search = useHomeSearch();
  const [fieldKey, setFieldKey] = useState(fields[0].key);
  const [inkKey, setInkKey] = useState(inks[0].key);
  const [glow, setGlow] = useState(true);
  const field = fields.find((entry) => entry.key === fieldKey) ?? fields[0];
  const ink = inks.find((entry) => entry.key === inkKey) ?? inks[0];

  return (
    <div className="relative min-h-screen">
      {glow && <CoralGlow aria-hidden className="pointer-events-none fixed inset-0 z-0" />}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
        {field.render(ink.className)}
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-3xl flex-col items-center justify-center px-5 py-10">
        <HomeBrand className="w-[80%] max-w-[480px]" />
        <h1 className="mt-4 text-center font-atkinson text-2xl font-bold leading-tight text-foreground text-balance sm:text-3xl">
          Share music with anyone. Get paid for your taste.
        </h1>
        <p className="mt-3 max-w-xl text-center text-sm text-muted-foreground sm:text-base">{field.note}</p>
        <div className="mt-7 w-full">
          <HomeSearchDropdown search={search} placeholder="Paste a music link, or search a song" />
        </div>
      </div>

      <fieldset className="fixed left-4 top-20 z-[70] m-0 flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-full border border-border/70 bg-card/85 p-1.5 backdrop-blur-md elev-soft">
        <legend className="sr-only">Background gallery controls</legend>
        {fields.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setFieldKey(entry.key)}
            aria-pressed={entry.key === fieldKey}
            className={cn(chip, entry.key === fieldKey ? 'bg-foreground text-background' : 'text-foreground hover:bg-muted')}
          >
            {entry.name}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        {inks.map((entry) => (
          <button
            key={entry.key}
            type="button"
            onClick={() => setInkKey(entry.key)}
            aria-pressed={entry.key === inkKey}
            className={cn(chip, entry.key === inkKey ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
          >
            {entry.label}
          </button>
        ))}
        <span aria-hidden className="mx-1 h-4 w-px bg-border" />
        <button
          type="button"
          onClick={() => setGlow((value) => !value)}
          aria-pressed={glow}
          className={cn(chip, glow ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted')}
        >
          Glow {glow ? 'on' : 'off'}
        </button>
      </fieldset>
    </div>
  );
}
