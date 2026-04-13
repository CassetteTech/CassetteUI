import {
  Compass,
  Edit,
  FileText,
  Heart,
  Home,
  Info,
  Music,
  Shield,
  User,
  Users,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { KOFI_SUPPORT_URL } from '@/lib/ko-fi';
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
  external?: boolean;
}

export const primaryNavItems: NavigationItemDefinition[] = [
  { key: 'home', label: 'Home', icon: Home, href: '/' },
  { key: 'explore', label: 'Explore', icon: Compass, href: '/explore' },
  { key: 'add-music', label: 'Add Music', icon: Music, href: '/add-music', authRequired: true },
];

export const accountNavItems: NavigationItemDefinition[] = [
  { key: 'profile', label: 'Profile', icon: User, href: '/profile', authRequired: true },
  { key: 'edit-profile', label: 'Edit Profile', icon: Edit, href: '/profile/edit', authRequired: true },
  { key: 'internal', label: 'Internal', icon: Shield, href: '/internal', authRequired: true, internalOnly: true },
];

export const companyNavItems: NavigationItemDefinition[] = [
  { key: 'about', label: 'About', icon: Info, href: '/about' },
  { key: 'team', label: 'Team', icon: Users, href: '/team' },
  { key: 'release-notes', label: 'Release Notes', icon: FileText, href: '/release-notes' },
  { key: 'support-us', label: 'Support Us', icon: Heart, href: KOFI_SUPPORT_URL, external: true },
];

export function getVisibleNavItems(
  items: NavigationItemDefinition[],
  user: NavUser,
) {
  const canSeeInternalDashboard = isCassetteInternalAccount(user?.accountType ?? null);

  return items.filter((item) => {
    if (item.authRequired && !user) return false;
    if (item.internalOnly && !canSeeInternalDashboard) return false;
    return true;
  });
}

export function resolveNavHref(item: NavigationItemDefinition, user: NavUser) {
  if (!user?.username) return item.href;

  if (item.key === 'profile') {
    return `/profile/${user.username}`;
  }

  if (item.key === 'edit-profile') {
    return `/profile/${user.username}/edit`;
  }

  return item.href;
}

export function isNavItemActive(item: NavigationItemDefinition, pathname: string | null) {
  if (!pathname) return false;

  switch (item.key) {
    case 'home':
      return pathname === '/';
    case 'profile':
      return pathname.startsWith('/profile') && !pathname.includes('/edit');
    case 'edit-profile':
      return pathname.startsWith('/profile') && pathname.includes('/edit');
    default:
      return pathname.startsWith(item.href);
  }
}
