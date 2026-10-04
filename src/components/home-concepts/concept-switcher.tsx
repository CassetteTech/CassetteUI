'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// The concepts still in the running. Numbers stay as first presented, so
// "number six" keeps meaning the same page.
export const HOME_CONCEPTS = [1, 2, 5, 6, 8, 11];

/** Steps between the kept home page concepts. */
export function ConceptSwitcher() {
  const pathname = usePathname() ?? '';
  const current = Number(pathname.slice(1));
  const index = HOME_CONCEPTS.indexOf(current);
  if (index === -1) return null;
  const previous = HOME_CONCEPTS[(index + HOME_CONCEPTS.length - 1) % HOME_CONCEPTS.length];
  const next = HOME_CONCEPTS[(index + 1) % HOME_CONCEPTS.length];
  const step = 'inline-flex h-8 w-8 items-center justify-center rounded-full text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary';
  return (
    <nav
      className={cn(
        // Bottom right, clear of the support button (bottom left), the
        // poster concept's centred dock, and sticky panels under the navbar.
        'fixed bottom-5 right-16 z-[70] items-center gap-1 rounded-full border border-border/70 bg-card/85 p-1 pl-3 text-sm backdrop-blur-md elev-soft',
        'hidden lg:inline-flex',
      )}
      aria-label="Home page concepts"
    >
      <span className="font-mono text-xs tabular-nums text-muted-foreground">concept</span>
      <Link href={`/${previous}`} className={step} aria-label={`Concept ${previous}`}><ChevronLeft className="h-4 w-4" /></Link>
      <span className="font-teko text-xl font-bold leading-none tabular-nums text-foreground">{current}<span className="text-muted-foreground"> of {HOME_CONCEPTS.join(', ')}</span></span>
      <Link href={`/${next}`} className={step} aria-label={`Concept ${next}`}><ChevronRight className="h-4 w-4" /></Link>
    </nav>
  );
}
