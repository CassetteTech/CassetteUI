'use client';

/** Mobile/tablet profile identity card: a quiet panel with the warm wash
    behind the avatar, bio, genres, and links. Desktop uses SidebarProfileCard. */

import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus, Settings, Share2, Shield } from 'lucide-react';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CoralGlow } from '@/components/ui/coral-glow';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { AvatarPreviewDialog } from '@/components/features/profile/avatar-preview-dialog';
import { StudioChip } from '@/components/features/curator/studio-shell';
import { isCassetteInternalAccount } from '@/lib/analytics/internal-suppression';
import { getDisplayPlatformDefinition, isAppleMusicPlatform } from '@/lib/platforms';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { Badge } from '@/components/ui/badge';

/** Organic blob silhouette for the avatar; overrides the primitive's circle. */
const avatarBlob = { borderRadius: '60% 40% 55% 45% / 55% 45% 55% 45%' } as const;

const iconControl =
  'flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface ProfileHeaderProps {
  userBio: UserBio;
  isCurrentUser: boolean;
  onShare: () => void;
  onAddMusic?: () => void;
  curatorHeadline?: string | null;
  curatorGenres?: string[];
  curatorAbout?: string | null;
  curatorPlatforms?: string[];
}

export function ProfileHeader({
  userBio,
  isCurrentUser,
  onShare,
  onAddMusic,
  curatorHeadline,
  curatorGenres,
  curatorAbout,
  curatorPlatforms,
}: ProfileHeaderProps) {
  const reduceMotion = useReducedMotion();
  const totalLikesReceived = Number(userBio.totalLikesReceived ?? 0);
  const curatorInterests = [...new Set([
    ...(curatorGenres ?? []),
    ...(curatorPlatforms ?? []),
  ])];
  const showActions = isCurrentUser && (onAddMusic || isCassetteInternalAccount(userBio.accountType));

  return (
    <motion.header
      {...(reduceMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
      })}
      className="px-3 pt-3 sm:px-4 sm:pt-4"
    >
    {/* The identity card keeps the warm wash; the page around it stays plain. */}
    <CoralGlow vivid className="card-quiet flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
      {/* Identity row: avatar, name and handle, then the page controls at the end. */}
      <div className="flex items-start gap-4">
        <AvatarPreviewDialog
          avatarUrl={userBio.avatarUrl}
          username={userBio.username}
          displayName={userBio.displayName}
          isCurrentUser={isCurrentUser}
        >
          <button
            type="button"
            aria-label={`View ${userBio.displayName || userBio.username}'s profile picture`}
            className="flex-shrink-0 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={avatarBlob}
          >
            <Avatar className="h-[4.5rem] w-[4.5rem] border-2 border-foreground/80 sm:h-24 sm:w-24" style={avatarBlob}>
              <AvatarImage src={userBio.avatarUrl} alt={`@${userBio.username}`} />
              <AvatarFallback className="bg-muted text-xl text-muted-foreground">
                {userBio.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </AvatarPreviewDialog>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <span className="truncate font-teko text-3xl font-bold leading-none sm:text-4xl">
                  {userBio.displayName || userBio.username}
                </span>
                <VerificationBadge accountType={userBio.accountType} size="md" />
              </div>
              <span className="block truncate font-mono text-xs text-muted-foreground">@{userBio.username}</span>
            </div>
            {/* 40px targets with a visible focus ring; the icons stay 20px. */}
            <div className="-mr-2 -mt-1 flex shrink-0 items-center">
              <button type="button" onClick={onShare} aria-label="Share profile" className={iconControl}>
                <Share2 className="h-5 w-5" />
              </button>
              {isCurrentUser && (
                <Link href={`/profile/${userBio.username}/edit`} aria-label="Edit profile" className={iconControl}>
                  <Settings className="h-5 w-5" />
                </Link>
              )}
            </div>
          </div>
          {totalLikesReceived > 0 && (
            <p className="mt-1 flex items-baseline gap-1.5">
              <span className="font-teko text-3xl font-bold leading-none tabular-nums">
                {totalLikesReceived.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground">
                {totalLikesReceived === 1 ? 'like' : 'likes'}
              </span>
            </p>
          )}
        </div>
      </div>

      <ConnectedServices
        services={userBio.connectedServices}
        platformPreferences={userBio.platformPreferences}
      />

      {curatorHeadline && (
        <p className="text-pretty text-base font-semibold leading-snug sm:text-lg">
          {curatorHeadline}
        </p>
      )}

      {userBio.bio && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
          {userBio.bio}
        </p>
      )}
      {curatorAbout && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 sm:text-base">
          {curatorAbout}
        </p>
      )}

      {curatorInterests.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Curator interests">
          {curatorInterests.map((interest) => (
            <li key={interest}><Badge variant="outline">{interest}</Badge></li>
          ))}
        </ul>
      )}

      <ProfileLinksRow links={userBio.profileLinks} />

      {showActions && (
        <div className="flex flex-row gap-2 pt-1 sm:gap-3">
          {onAddMusic && (
            <Button type="button" variant="outline" size="sm" onClick={onAddMusic}>
              <Plus aria-hidden="true" />
              Add music
            </Button>
          )}
          {isCassetteInternalAccount(userBio.accountType) && (
            <Button asChild variant="outline" size="sm">
              <Link href="/internal">
                <Shield aria-hidden="true" />
                Internal
              </Link>
            </Button>
          )}
        </div>
      )}
    </CoralGlow>
    </motion.header>
  );
}

/** Connected platforms as live-state chips: platform mark, name, and a signal dot. */
function ConnectedServices({
  services,
  platformPreferences,
}: {
  services: ConnectedService[];
  platformPreferences?: PlatformPreferenceInfo[];
}) {
  const types = platformPreferences?.length
    ? platformPreferences.map((pref) => pref.platform)
    : (services ?? []).map((service) => service.serviceType);
  const platforms = [...new Set(types)].flatMap((type) => {
    const definition = getDisplayPlatformDefinition(type);
    return definition?.logoSrc ? [{ type, logoSrc: definition.logoSrc, name: definition.displayName }] : [];
  });

  if (platforms.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Connected services">
      {platforms.map(({ type, logoSrc, name }) => (
        <li key={type}>
          <StudioChip tone="positive">
            <Image
              src={logoSrc}
              alt=""
              width={14}
              height={14}
              className={isAppleMusicPlatform(type) ? 'size-3.5 object-contain dark:invert' : 'size-3.5 object-contain'}
            />
            {name}
          </StudioChip>
        </li>
      ))}
    </ul>
  );
}
