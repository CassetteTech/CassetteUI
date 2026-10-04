'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { HomeSearch } from './use-home-search';

const COUNT = 12;

/** What is charting right now as a row of covers. One tap converts it,
    so the strip is the fastest way to see the product work. Hidden while
    a conversion runs; skeleton covers while the charts load. */
export function ChartStrip({ search, title = 'Charting now', className }: { search: HomeSearch; title?: string; className?: string }) {
  if (search.isConverting) return null;
  const items = (search.topCharts?.tracks ?? []).slice(0, COUNT);
  const loading = search.isLoadingCharts && items.length === 0;

  return (
    <section className={cn('w-full', className)} aria-label={title}>
      <p className="mb-3 text-sm font-semibold text-foreground">{title}</p>
      <ul className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:none]">
        {loading && Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="h-[5.5rem] w-24 shrink-0 animate-pulse rounded-lg bg-muted" aria-hidden />
        ))}
        {items.map((item) => {
          const url = item.externalUrls?.spotify || item.externalUrls?.appleMusic || item.externalUrls?.deezer;
          return (
            <li key={item.id} className="w-24 shrink-0">
              <button
                type="button"
                disabled={!url}
                onClick={() => url && search.selectItem(url, item.title, 'Track')}
                className="group block w-full text-left focus-visible:outline-none"
              >
                <span className="relative block aspect-square w-full overflow-hidden rounded-lg border border-border/60 bg-muted transition-transform duration-280 ease-out-quart group-hover:-translate-y-0.5 group-focus-visible:ring-2 group-focus-visible:ring-primary">
                  {item.artwork && <Image src={item.artwork} alt="" fill sizes="96px" className="object-cover" />}
                </span>
                <span className="mt-1.5 block truncate text-xs font-medium text-foreground">{item.title}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{item.artist}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
