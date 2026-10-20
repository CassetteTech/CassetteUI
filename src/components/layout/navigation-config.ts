import {
  BadgeCheck,
  Compass,
  FileText,
  Home,
  Info,
  LayoutDashboard,
  Megaphone,
  Music,
  Newspaper,
  Shield,
  User,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { addMusicHref } from '@/components/features/curator/studio-routes';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';

export type NavUser = {
  username?: string | null;
  accountType?: string | number | null;
} | null | undefined;

export interface NavigationItemDefinition {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  href: string;
  authRequired?: boolean;
  internalOnly?: boolean;
  requiresPaidPromotionSales?: boolean;
  requiresPaidPromotionAccount?: boolean;
}

export const primaryNavItems: NavigationItemDefinition[] = [
  { key: 'home', label: 'Home', icon: Home, href: '/' },
  { key: 'feed', label: 'Feed', icon: Newspaper, href: '/feed', authRequired: true },
  { key: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { key: 'add-music', label: 'Add Music', icon: Music, href: '/studio/music/new', authRequired: true },
  { key: 'promote', label: 'Promote', icon: Megaphone, href: '/promote', requiresPaidPromotionSales: true },
];

export const accountNavItems: NavigationItemDefinition[] = [
  { key: 'profile', label: 'Profile', icon: User, href: '/profile', authRequired: true },
  { key: 'curator-studio', label: 'Curator Studio', icon: LayoutDashboard, href: '/studio', authRequired: true },
  { key: 'memberships', label: 'Memberships', icon: BadgeCheck, href: '/memberships', authRequired: true },
  { key: 'campaigns', label: 'Your Campaigns', icon: Megaphone, href: '/promote', authRequired: true, requiresPaidPromotionAccount: true },
  { key: 'internal', label: 'Internal', icon: Shield, href: '/internal', authRequired: true, internalOnly: true },
];

export const companyNavItems: NavigationItemDefinition[] = [
  { key: 'about', label: 'About', icon: Info, href: '/about' },
  { key: 'team', label: 'Team', icon: Users, href: '/team' },
  { key: 'release-notes', label: 'Release Notes', icon: FileText, href: '/release-notes' },
];

export const appNavOrder = ['curator-studio', 'feed', 'memberships', 'explore', 'internal'] as const;
export const promoteNavOrder = ['promote', 'campaigns'] as const;

const addMusicPath = '/studio/music/new';

export function addMusicHrefForPage(pathname: string | null) {
  return pathname && !pathname.startsWith(addMusicPath) ? addMusicHref(pathname) : addMusicPath;
}

export function getOrderedNavItems(
  order: readonly string[],
  user: NavUser,
  paidPromotion: { salesEnabled?: boolean; accountVisible?: boolean } = {},
) {
  const all = [...primaryNavItems, ...accountNavItems];
  const ordered = order
    .map((key) => all.find((item) => item.key === key))
    .filter((item): item is NavigationItemDefinition => Boolean(item));
  return getVisibleNavItems(ordered, user, paidPromotion);
}

export function getVisibleNavItems(
  items: NavigationItemDefinition[],
  user: NavUser,
  paidPromotion: { salesEnabled?: boolean; accountVisible?: boolean } = {},
) {
  const canSeeInternalDashboard = isCassetteInternalAccount(user?.accountType ?? null);

  return items.filter((item) => {
    if (item.authRequired && !user) return false;
    if (item.internalOnly && !canSeeInternalDashboard) return false;
    if (item.requiresPaidPromotionSales && !paidPromotion.salesEnabled) return false;
    if (item.requiresPaidPromotionAccount && !paidPromotion.accountVisible) return false;
    return true;
  });
}

export function resolveNavHref(item: NavigationItemDefinition, user: NavUser) {
  if (!user?.username) return item.href;

  if (item.key === 'profile') {
    return `/profile/${user.username}`;
  }

  return item.href;
}

export function isOwnProfilePath(pathname: string, user: NavUser) {
  if (!user?.username) return false;

  const ownProfilePath = `/profile/${user.username}`;
  const ownEditProfilePath = `${ownProfilePath}/edit`;

  return pathname === '/profile' || pathname === '/profile/edit' || pathname === ownProfilePath || pathname === ownEditProfilePath;
}

export function isNavItemActive(
  item: NavigationItemDefinition,
  pathname: string | null,
  user?: NavUser,
) {
  if (!pathname) return false;

  switch (item.key) {
    case 'home':
      return pathname === '/';
    case 'profile':
      return isOwnProfilePath(pathname, user);
    case 'curator-studio':
      return pathname.startsWith(item.href) || isOwnProfilePath(pathname, user);
    default:
      return pathname.startsWith(item.href);
  }
}
