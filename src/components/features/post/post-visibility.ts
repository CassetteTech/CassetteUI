import { EyeOff, Globe, LockKeyhole, type LucideIcon } from 'lucide-react';
import type { MemberPostAccessState } from '@/hooks/use-curator';
import type { PostPrivacy } from '@/types';

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

export function membersOptionOf(access: MemberPostAccessState, privacy: string | undefined) {
  const canLock = access === 'ready' || privacy === 'subscriber';
  return {
    canLock,
    needsPlan: !canLock && access === 'needs-plan',
    waiting: !canLock && access !== 'needs-plan',
  };
}
