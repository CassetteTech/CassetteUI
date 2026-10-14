'use client';

import { useContext, useRef } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ConnectedServices } from '@/components/features/profile/profile-header';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { WalletPass } from '@/components/features/curator/wallet-pass';
import { CuratorFollowAction } from '@/components/features/curator/curator-follow-action';
import { studioHref } from '@/components/features/curator/studio-routes';
import { StudioStepsContext } from '@/components/features/curator/studio-shell';
import { Button } from '@/components/ui/button';
import { useSharedPosition } from '@/hooks/use-shared-position';
import type { UserBio } from '@/types';

export function ProfileSummary({ user }: { user: UserBio }) {
  return (
    <div className="space-y-3 empty:hidden">
      {user.bio && <p className="text-sm leading-relaxed text-muted-foreground">{user.bio}</p>}
      <ConnectedServices services={user.connectedServices} platformPreferences={user.platformPreferences} />
      <ProfileLinksRow links={user.profileLinks} />
    </div>
  );
}

function MembershipSetupLink() {
  const steps = useContext(StudioStepsContext);
  return (
    <Button asChild variant="outline" className="mt-4 w-full">
      <Link
        href={studioHref('studio-plan')}
        onNavigate={(event) => {
          if (!steps) return;
          event.preventDefault();
          steps.open('studio-plan');
        }}
      >
        Start earning from your music
        <ArrowRight aria-hidden />
      </Link>
    </Button>
  );
}

export function ProfileIdentityPass({ user, offersMembershipSetup = false, className }: {
  user: UserBio;
  offersMembershipSetup?: boolean;
  className?: string;
}) {
  const likes = Number(user.totalLikesReceived ?? 0);
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
      {offersMembershipSetup ? <MembershipSetupLink /> : <CuratorFollowAction className="mt-4" />}
    </WalletPass>
  );
}
