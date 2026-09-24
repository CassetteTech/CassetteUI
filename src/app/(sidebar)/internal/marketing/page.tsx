import Link from 'next/link';
import { ArrowRight, CalendarClock, MessageSquare } from 'lucide-react';
import { SectionHeader } from '../_components/kit';

export default function MarketingPage() {
  return (
    <div className="domain-growth flex max-w-5xl flex-col gap-5">
      <SectionHeader section="Marketing" title="Automations" />
      <p className="max-w-2xl text-sm text-muted-foreground">
        Manage recurring marketing tasks, review drafts, and approve content for publication.
      </p>
      <ul className="grid gap-4 md:grid-cols-2">
        <li>
          <Link
            href="/internal/marketing/automations/reddit"
            className="group flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-5 shadow-sm hover:border-domain/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <div className="flex items-center justify-between gap-3">
              <MessageSquare aria-hidden="true" className="size-5 text-domain" />
              <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">Reddit</span>
            </div>
            <div className="space-y-2">
              <h2 className="text-base font-semibold">Weekly playlist competition</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Collect community playlist entries, prepare an announcement, and review it before the bot posts.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarClock aria-hidden="true" className="size-4" />Weekly schedule</span>
              <span>Approval required</span>
            </div>
            <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-domain">
              Manage automation<ArrowRight aria-hidden="true" className="size-4" />
            </span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
