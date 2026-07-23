import { Users, AlertCircle, Link2, AlertTriangle, Layers, type LucideIcon } from 'lucide-react';

export type ConsoleDomain = 'eng' | 'growth';

export interface ConsoleNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** Short blurb used on the overview landing cards. */
  blurb: string;
}

export interface ConsoleNavSection {
  domain: ConsoleDomain;
  /** Wrapper class that remaps the --domain token for this section. */
  domainClass: 'domain-eng' | 'domain-growth';
  label: string;
  caption: string;
  items: ConsoleNavItem[];
}

/**
 * Single source of truth for the console's sectioned navigation. The rail, the
 * mobile pill scroller, the overview racks, and per-route domain theming all
 * read from this. Engineering = systems/telemetry; Product & Growth = the
 * operational + marketing surface.
 */
export const CONSOLE_NAV: ConsoleNavSection[] = [
  {
    domain: 'eng',
    domainClass: 'domain-eng',
    label: 'Engineering',
    caption: 'Systems integrity & ranking telemetry',
    items: [
      {
        key: 'sentinel',
        label: 'Sentinel',
        href: '/internal/sentinel',
        icon: AlertTriangle,
        blurb: 'Runtime health, conversion jobs, findings, and audit runs.',
      },
      {
        key: 'snapshots',
        label: 'Explore Snapshots',
        href: '/internal/snapshots',
        icon: Layers,
        blurb: 'Recommendation snapshots and ranked-item inspection.',
      },
      {
        key: 'issues',
        label: 'Issues',
        href: '/internal/issues',
        icon: AlertCircle,
        blurb: 'In-app reports and feedback inbox.',
      },
    ],
  },
  {
    domain: 'growth',
    domainClass: 'domain-growth',
    label: 'Product & Growth',
    caption: 'Accounts & acquisition',
    items: [
      {
        key: 'users',
        label: 'Users',
        href: '/internal/users',
        icon: Users,
        blurb: 'Search accounts, manage roles, and export data.',
      },
      {
        key: 'attribution',
        label: 'Attribution',
        href: '/internal/attribution',
        icon: Link2,
        blurb: 'Signup sources, campaign reporting, and link templates.',
      },
    ],
  },
];

/** Flattened lookup of every nav item, e.g. for active-route resolution. */
export const CONSOLE_NAV_ITEMS: ConsoleNavItem[] = CONSOLE_NAV.flatMap((s) => s.items);
