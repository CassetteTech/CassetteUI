'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { CONSOLE_NAV } from './_components/internal-nav-config';

export default function InternalOverviewPage() {
  return (
    <div className="max-w-3xl space-y-5">
      <header>
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Internal Ops</p>
        <h1 className="mt-0.5 text-base font-semibold text-foreground">Console</h1>
      </header>

      <div className="grid gap-5 sm:grid-cols-2">
        {CONSOLE_NAV.map((section) => (
          <section key={section.label} className={cn(section.domainClass, 'space-y-2')}>
            <div className="flex items-center gap-2">
              <span className="signal-dot text-domain" aria-hidden />
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-domain">{section.label}</h2>
            </div>
            <ul className="divide-y divide-border rounded-lg border border-border bg-card">
              {section.items.map((item) => (
                <li key={item.key}>
                  <Link
                    href={item.href}
                    className="group flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-domain" />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-medium text-foreground">{item.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{item.blurb}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
