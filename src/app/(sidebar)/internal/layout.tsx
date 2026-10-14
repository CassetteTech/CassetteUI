'use client';

import type { ReactNode } from 'react';
import { InternalAccessGate } from './_components/internal-access-gate';
import { InternalNavRail } from './_components/internal-nav-rail';

export default function InternalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="console-surface contents">
      <InternalAccessGate>
        <div className="flex flex-col bg-background lg:h-full lg:min-h-0 lg:flex-1 lg:flex-row">
          <InternalNavRail />
          <div className="min-w-0 lg:flex-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-y-none">
            <div className="px-4 py-4 md:px-6 lg:px-8 lg:py-6">{children}</div>
          </div>
        </div>
      </InternalAccessGate>
    </div>
  );
}
