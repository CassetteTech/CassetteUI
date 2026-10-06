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
    summary: 'Anyone can open this post from your profile or the link.',
    rule: 'Visible to everyone.',
  },
  subscriber: {
    label: 'Members only',
    icon: LockKeyhole,
    summary: 'Only fans with an active membership can open this post. Everyone else sees it locked on your curator page.',
    rule: 'Only active members can open it.',
  },
  private: {
    label: 'Private',
    icon: EyeOff,
    summary: 'Hidden from your profile. Only people with the link can open this post.',
    rule: 'Off your profile. The link still works.',
  },
} satisfies Record<OwnerVisibility, { label: string; icon: LucideIcon; summary: string; rule: string }>;

export function visibilityOf(privacy: string | undefined) {
  const key = privacy?.toLowerCase();
  const known = ownerVisibilities.find((value) => value === key);
  return known === undefined ? undefined : postVisibility[known];
}
