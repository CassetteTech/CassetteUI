/** The visibility vocabulary an owner sees for their own post: one label, icon,
    and plain-language summary per setting. The post page's manage control and
    the owner panel both read it, so a locked post reads the same everywhere. */

import { EyeOff, Globe, LockKeyhole, type LucideIcon } from 'lucide-react';
import type { PostPrivacy } from '@/types';

/** The settings an owner can choose; a legacy value stays saved but has no entry here. */
export type OwnerVisibility = Extract<PostPrivacy, 'public' | 'subscriber' | 'private'>;

export const ownerVisibilities: readonly OwnerVisibility[] = ['public', 'subscriber', 'private'];

export const postVisibility = {
  public: {
    label: 'Public',
    icon: Globe,
    summary: 'Anyone can open it from your profile or the link.',
  },
  subscriber: {
    label: 'Members only',
    icon: LockKeyhole,
    summary: 'Only active members can open it. Everyone else sees it locked.',
  },
  private: {
    label: 'Private',
    icon: EyeOff,
    summary: 'Off your profile. Only you can open it.',
  },
} satisfies Record<OwnerVisibility, { label: string; icon: LucideIcon; summary: string }>;

export function visibilityOf(privacy: string | undefined) {
  const key = privacy?.toLowerCase();
  const known = ownerVisibilities.find((value) => value === key);
  return known === undefined ? undefined : postVisibility[known];
}
