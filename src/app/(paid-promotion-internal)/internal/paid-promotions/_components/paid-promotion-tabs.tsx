'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * The console holds one dataset viewed two ways: the campaign queue is the
 * work list, and the release view is the same campaigns grouped by the music
 * they promote. They used to be a page and an unexplained "Subjects" button,
 * which read as two unrelated features. Tabs make the pivot obvious and keep
 * the answer to "have we promoted this before?" one click from the queue.
 */
const TABS = [
  {
    href: '/internal/paid-promotions',
    label: 'Campaigns',
    hint: 'Every booking, newest activity first',
  },
  {
    href: '/internal/paid-promotions/subjects',
    label: 'By release',
    hint: 'The same campaigns, grouped by what they promote',
  },
];

export function PaidPromotionTabs() {
  const pathname = usePathname();

  return (
    <nav aria-label="Paid promotions views" className="border-b border-border">
      <ul className="flex gap-1">
        {TABS.map((tab) => {
          // The campaign detail route lives under the queue, so exact-match the
          // list and prefix-match everything that is not the release view.
          const active = tab.href === '/internal/paid-promotions'
            ? !pathname?.startsWith('/internal/paid-promotions/subjects')
            : pathname?.startsWith(tab.href);

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
