'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  {
    href: '/internal/paid-promotions',
    label: 'Campaigns',
    hint: 'Every booking, newest activity first',
    isActive: (pathname: string) => !pathname.startsWith('/internal/paid-promotions/subjects'),
  },
  {
    href: '/internal/paid-promotions/subjects',
    label: 'By release',
    hint: 'The same campaigns, grouped by what they promote',
    isActive: (pathname: string) => pathname.startsWith('/internal/paid-promotions/subjects'),
  },
];

export function PaidPromotionTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Paid promotions views" className="border-b border-border">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          const active = pathname !== null && tab.isActive(pathname);

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? 'page' : undefined}
                title={tab.hint}
                className={`-mb-px inline-flex border-b-2 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  active
                    ? 'border-domain font-semibold text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
