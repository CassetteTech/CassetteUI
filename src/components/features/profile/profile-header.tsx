'use client';

import { useId, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, Share2 } from 'lucide-react';
import { UserBio, ConnectedService, PlatformPreferenceInfo } from '@/types';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { VerificationBadge } from '@/components/ui/verification-badge';
import { AvatarPreviewDialog } from '@/components/features/profile/avatar-preview-dialog';
import { StudioChip } from '@/components/features/curator/studio-shell';
import { CuratorFollowAction } from '@/components/features/curator/curator-follow-action';
import { getDisplayPlatformDefinition, isAppleMusicPlatform } from '@/lib/platforms';
import { ProfileLinksRow } from '@/components/features/profile/profile-links';
import { parseProfileLink } from '@/lib/profile-links';
import { useShowMore } from '@/components/ui/interior/show-more';

const avatarBlob = { borderRadius: '60% 40% 55% 45% / 55% 45% 55% 45%' } as const;

const iconControl =
  'flex size-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

interface ProfileHeaderProps {
  userBio: UserBio;
  onShare: () => void;
  shareCopied?: boolean;
}

export function ProfileHeader({ userBio, onShare, shareCopied = false }: ProfileHeaderProps) {
  const reduceMotion = useReducedMotion();
  const name = userBio.displayName || userBio.username;

  return (
    <motion.header
      {...(reduceMotion ? {} : {
        initial: { opacity: 0, y: 10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
      })}
      className="flex flex-col gap-3 px-4 pt-4 sm:px-6"
    >
      <div className="flex items-center gap-3">
        <AvatarPreviewDialog
          avatarUrl={userBio.avatarUrl}
          username={userBio.username}
          displayName={userBio.displayName}
          isCurrentUser={false}
        >
          <button
            type="button"
            aria-label={`View ${name}'s profile picture`}
            className="flex-shrink-0 transition-opacity hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            style={avatarBlob}
          >
            <Avatar className="size-14 border-2 border-foreground/80" style={avatarBlob}>
              <AvatarImage src={userBio.avatarUrl} alt={`@${userBio.username}`} />
              <AvatarFallback className="bg-muted text-lg text-muted-foreground">
                {userBio.username.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
        </AvatarPreviewDialog>

        {/* Follow and Share stay on the name's row; a wide Following and Unfollow pair wraps under the name. */}
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2">
          <div className="min-w-[8rem] flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-xl font-semibold leading-tight">{name}</span>
              <VerificationBadge accountType={userBio.accountType} size="md" />
            </div>
            <span className="block truncate font-mono text-xs text-muted-foreground">@{userBio.username}</span>
          </div>
          <div className="-mr-2 flex shrink-0 items-center gap-1">
            <CuratorFollowAction compact />
            <button type="button" onClick={onShare} aria-label="Share profile" className={iconControl}>
              {shareCopied ? (
                <Check className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Share2 className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
            <output aria-live="polite" className="sr-only">
              {shareCopied ? 'Profile link copied' : ''}
            </output>
          </div>
        </div>
      </div>

      <ProfileAbout userBio={userBio} />
    </motion.header>
  );
}

/** Two lines of bio; "Show more" opens the rest with the services and links. Without a bio they show at once. */
function ProfileAbout({ userBio }: { userBio: UserBio }) {
  const reduced = useReducedMotion();
  const regionId = useId();
  const [expanded, setExpanded] = useState(false);
  const { contentRef, height, expandable } = useShowMore({ lines: 2 });
  const hasExtras = connectedPlatforms(userBio.connectedServices, userBio.platformPreferences).length > 0 ||
    (userBio.profileLinks ?? []).some((link) => parseProfileLink(link) !== null);
  const extras = (
    <div className="mt-3 flex flex-col gap-2">
      <ConnectedServices services={userBio.connectedServices} platformPreferences={userBio.platformPreferences} />
      <ProfileLinksRow links={userBio.profileLinks} />
    </div>
  );

  if (!userBio.bio) return hasExtras ? extras : null;

  const open = expanded && (expandable || hasExtras);
  return (
    <div className="min-w-0">
      <motion.div
        id={regionId}
        initial={false}
        animate={open ? { height: 'auto' } : height === null ? {} : { height }}
        transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 190, damping: 30, mass: 1 }}
        style={{ maxHeight: height === null ? '2lh' : undefined }}
        className="overflow-hidden text-sm leading-relaxed"
      >
        <div ref={contentRef} className="whitespace-pre-wrap text-foreground/90">{userBio.bio}</div>
        {open && extras}
      </motion.div>
      {(expandable || hasExtras) && (
        <button
          type="button"
          onClick={() => setExpanded(!open)}
          aria-expanded={open}
          aria-controls={regionId}
          className="mt-1 block rounded-sm font-mono text-[10px] font-bold uppercase leading-[0.9375rem] tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

function connectedPlatforms(services: ConnectedService[], platformPreferences?: PlatformPreferenceInfo[]) {
  const types = platformPreferences?.length
    ? platformPreferences.map((pref) => pref.platform)
    : (services ?? []).map((service) => service.serviceType);
  return [...new Set(types)].flatMap((type) => {
    const definition = getDisplayPlatformDefinition(type);
    return definition?.logoSrc ? [{ type, logoSrc: definition.logoSrc, name: definition.displayName }] : [];
  });
}

export function ConnectedServices({
  services,
  platformPreferences,
}: {
  services: ConnectedService[];
  platformPreferences?: PlatformPreferenceInfo[];
}) {
  const platforms = connectedPlatforms(services, platformPreferences);

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
