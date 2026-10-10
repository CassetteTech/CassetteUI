'use client';

/** The viewed profile's identity for the desktop rail: the summary that prints inside
    a membership pass, and a pass-shaped card for profiles that sell no membership. */

import { useRef } from 'react';
import { ConnectedServices } from '@/components/features/profile/profile-header';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { CuratorFollowAction } from '@/components/features/curator/curator-follow-action';
import { useSharedPosition } from '@/hooks/use-shared-position';
import type { UserBio } from '@/types';

/** Bio, connected services, and links: everything about the person except the name.
    Each row decides its own presence, so a profile with none of them prints nothing. */
export function ProfileSummary({ user }: { user: UserBio }) {
  return (
    <div className="space-y-3 empty:hidden">
      {user.bio && <p className="text-sm leading-relaxed text-muted-foreground">{user.bio}</p>}
      <ConnectedServices services={user.connectedServices} platformPreferences={user.platformPreferences} />
      <ProfileLinksRow links={user.profileLinks} />
    </div>
  );
}

/** A profile with no membership still gets one pass in the rail, on muted paper, with Follow
    for a curator that sells nothing. */
export function ProfileIdentityPass({ user, className }: { user: UserBio; className?: string }) {
  const likes = Number(user.totalLikesReceived ?? 0);
  // The membership pass key: this pass holds the same rail spot, so it slides (and turns
  // brand red) into Curator Studio's plan pass, and back.
  const passRef = useRef<HTMLDivElement>(null);
  useSharedPosition(passRef, 'membership-pass');
  return (
    <WalletPass
      ref={passRef}
      data-testid="profile-identity-pass"
      className={className}
      product="Profile"
      tier={likes > 0 ? `${likes.toLocaleString()} ${likes === 1 ? 'like' : 'likes'}` : ''}
      holderName={user.displayName || user.username}
      holderHandle={user.username}
      avatarUrl={user.avatarUrl}
      active={false}
      summary={<ProfileSummary user={user} />}
    >
      {/* The children slot keeps the pass's bottom padding when Follow renders nothing. */}
      <CuratorFollowAction className="mt-4" />
    </WalletPass>
  );
}
