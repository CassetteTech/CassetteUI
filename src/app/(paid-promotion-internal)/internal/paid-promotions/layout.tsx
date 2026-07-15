import type { ReactNode } from 'react';
import { AppSidebar } from '@/components/layout/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { InternalAccessGate } from '@/app/(sidebar)/internal/_components/internal-access-gate';
import { InternalNavRail } from '@/app/(sidebar)/internal/_components/internal-nav-rail';

export default function PaidPromotionsInternalLayout({ children }: { children: ReactNode }) {
  return (
    <InternalAccessGate>
      <SidebarProvider
        defaultOpen
        className="min-h-[calc(100svh-4rem)] bg-background lg:h-screen lg:min-h-0"
      >
        <AppSidebar className="max-lg:hidden" />
        <div className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background">
          <div className="domain-growth flex min-h-0 flex-1 flex-col lg:flex-row">
            <InternalNavRail />
            <section
              aria-label="Paid promotions operations"
              className="min-w-0 flex-1 overflow-y-auto px-4 py-4 md:px-6 lg:px-8 lg:py-6"
            >
              {children}
            </section>
          </div>
        </div>
      </SidebarProvider>
    </InternalAccessGate>
  );
}
