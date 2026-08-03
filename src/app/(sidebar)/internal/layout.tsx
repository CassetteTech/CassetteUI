'use client';

import type { ReactNode } from 'react';
import { InternalAccessGate } from './_components/internal-access-gate';
import { InternalNavRail } from './_components/internal-nav-rail';

/**
 * Section shell for the internal console. Guards access once for every
 * sub-route, then lays out the grouped nav rail beside a scrollable content
 * area. The content area owns its own scroll on desktop (mirroring the old
 * shell) so the rail stays put while data scrolls.
 */
export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    /* display:contents marker — no layout box, but body:has(.console-surface)
       in globals.css re-tokens the whole viewport (including portals) to the
       cool console surface for every internal route, loader state included. */
    <div className="console-surface contents">
      <InternalAccessGate>
        <div className="flex flex-col bg-background lg:h-full lg:min-h-0 lg:flex-1 lg:flex-row">
          <InternalNavRail />
          <main className="min-w-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
            <div className="px-4 py-4 md:px-6 lg:px-8 lg:py-6">{children}</div>
          </main>
        </div>
      </InternalAccessGate>
    </div>
  );
}
