import {
  Users,
  AlertCircle,
  Link2,
  AlertTriangle,
  Layers,
  ChartNoAxesCombined,
  Mail,
  UserRoundCog,
  Megaphone,
  type LucideIcon,
} from 'lucide-react';

export type ConsoleDomain = 'eng' | 'growth';

export interface ConsoleNavItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  blurb: string;
}

export interface ConsoleNavSection {
  domain: ConsoleDomain;
  domainClass: 'domain-eng' | 'domain-growth';
  label: string;
  caption: string;
  items: ConsoleNavItem[];
}

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
        key: 'conversion-quality',
        label: 'Conversion Quality',
        href: '/internal/conversion-quality',
        icon: ChartNoAxesCombined,
        blurb: 'Versioned match decisions, adjudicated accuracy, and fixture baselines.',
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
        key: 'marketing',
        label: 'Marketing',
        href: '/internal/marketing',
        icon: Megaphone,
        blurb: 'Manage marketing automations and review scheduled content.',
      },
      {
        key: 'users',
        label: 'Users',
        href: '/internal/users',
        icon: Users,
        blurb: 'Search accounts, manage roles, and export data.',
      },
      {
        key: 'curators',
        label: 'Curators',
        href: '/internal/curators',
        icon: UserRoundCog,
        blurb: 'Manage pricing policies, operational status, and payout exceptions.',
      },
      {
        key: 'attribution',
        label: 'Attribution',
        href: '/internal/attribution',
        icon: Link2,
        blurb: 'Signup sources, campaign reporting, and link templates.',
      },
      {
        key: 'paid-promotions',
        label: 'Paid Promotions',
        href: '/internal/paid-promotions',
        icon: Megaphone,
        blurb: 'Review, fulfill, and resolve paid-promotion campaigns.',
      },
      {
        key: 'email',
        label: 'Email',
        href: '/internal/email',
        icon: Mail,
        blurb: 'Delivery health, template previews, and controlled sends.',
      },
    ],
  },
];

export const CONSOLE_NAV_ITEMS: ConsoleNavItem[] = CONSOLE_NAV.flatMap((s) => s.items);
