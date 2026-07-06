'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { CONSOLE_NAV } from './internal-nav-config';

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

/**
 * Sectioned secondary navigation. The outer (sidebar) layout mounts this twice
 * (mobile + desktop branches); CSS visibility picks the right presentation, so
 * it stays purely class-responsive. Each section is wrapped in its `.domain-*`
 * class so the active item picks up that domain's accent. The mobile layout
 * WRAPS rather than scrolls horizontally.
 */
export function InternalNavRail() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop: vertical grouped rail */}
      <nav className="hidden lg:flex lg:w-56 lg:shrink-0 lg:flex-col lg:gap-5 lg:border-r lg:border-border lg:px-3 lg:py-5">
        <Link href="/internal" className="px-2">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground">
            Console
          </span>
        </Link>

        {CONSOLE_NAV.map((section) => (
          <div key={section.label} className={cn(section.domainClass, 'flex flex-col gap-0.5')}>
            <span className="px-2 pb-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {section.label}
            </span>
            {section.items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition-colors',
                    active
                      ? 'bg-domain/10 font-medium text-domain'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Mobile: wrapping grouped pills (no horizontal scroll) */}
      <div className="border-b border-border lg:hidden">
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5">
          {CONSOLE_NAV.map((section) => (
            <div key={section.label} className={cn(section.domainClass, 'flex flex-wrap items-center gap-1.5')}>
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                      active
                        ? 'bg-domain/10 font-medium text-domain'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="whitespace-nowrap">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
