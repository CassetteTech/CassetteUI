'use client';

import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { BackButton } from '@/components/ui/back-button';
import { ArtworkImage } from '@/components/ui/artwork-image';
import { Spinner } from '@/components/ui/spinner';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { PostLabelHead, bandColor, postLabelMeta, type PostLabelDetails } from '@/components/features/post/post-label-head';
import { StreamingLinks, streamingServices } from '@/components/features/entity/streaming-links';
import { COLLAPSED_MAX_HEIGHT_PX, TrackList, formatTrackListStats, type TrackListItem } from '@/components/features/entity/track-list';
import { ACTIVE_PLATFORM_UI_KEYS, type PlatformUiKey } from '@/lib/platforms';
import {
  CASSETTE_SPOTIFY_COPY_CAPTION,
  curatorLinkCaption,
  curatorListenRows,
  playlistCopyTargets,
  sharesCassetteSpotifyCopy,
} from '@/lib/playlist-copy-placement';
import { cn } from '@/lib/utils';
import type { PublicPostPageMetadata } from '@/types';
import { ColorExtractor, type ColorPalette } from '@/services/color-extractor';

export interface StagedConversion {
  stageLabel: string;
  source?: {
    elementType?: string;
    title?: string;
    artists: string[];
    artworkUrl?: string | null;
    tracks?: TrackListItem[];
    /** The label's meta line, once the finished post is read. */
    details?: PostLabelDetails;
  };
  sourceLink?: { platform: PlatformUiKey; url: string };
  /** Add music: the owner's own playlist links, which open as listen rows as on the post. */
  curatorLinks?: { handle: string | null; links: Partial<Record<PlatformUiKey, string>> };
  links: Partial<Record<PlatformUiKey, string>>;
  /** The finished post is read: `links` is the post's own set, so no row waits for a match. */
  linksFinal?: boolean;
  /** A playlist's shared Spotify copy, from the finished post. */
  cassetteSpotifyCopyUrl?: string | null;
  ready: boolean;
  postId?: string;
}

export interface ViewportBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** The post's author card as the public metadata describes it; absent from an older Bridge. */
export interface SkeletonAuthor {
  hasCuratorPage: boolean;
  hasLivePlan: boolean;
  caption: string | null;
}

export const skeletonAuthorOf = (metadata: PublicPostPageMetadata | null | undefined): SkeletonAuthor | undefined =>
  metadata?.author
    ? {
        hasCuratorPage: metadata.author.hasCuratorPage,
        hasLivePlan: metadata.author.hasLivePlan,
        caption: metadata.author.hasCaption ? metadata.description : null,
      }
    : undefined;

interface EntitySkeletonProps {
  author?: SkeletonAuthor;
  conversion?: StagedConversion;
  growFrom?: ViewportBox | null;
  sourceLabel?: string;
  contentType?: string;
  showAuthor?: boolean;
  ownPost?: boolean;
  onCancel?: () => void;
}

export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({
  author,
  conversion,
  growFrom,
  sourceLabel,
  contentType,
  showAuthor,
  ownPost,
  onCancel
}) => {
  const continued = useContinuation();
  const pathname = usePathname();
  const builtPostId = continued?.conversion?.postId;
  const carried = builtPostId && pathname === `/post/${builtPostId}` ? continued?.conversion : undefined;
  const staged = conversion ?? carried;
  const settled = !conversion && Boolean(carried);
  const post = {
    // Bridge's element type, once read, wins over the link's guess (a short link reads as a track).
    contentType: staged?.source?.elementType ?? contentType ?? continued?.contentType,
    showAuthor: showAuthor ?? continued?.showAuthor ?? true,
    ownPost: ownPost ?? continued?.ownPost ?? false,
  };
  const blueprint = staged ? stagedBlueprint(staged) : loadBlueprint(continued?.resolved ?? false);
  const band = useArtworkBand(staged?.source?.artworkUrl);
  useRegistration({ resolved: blueprint.finished, conversion: staged, ...post });

  const [growing, setGrowing] = useState(() => Boolean(growFrom) && !prefersReducedMotion());
  const handleLanded = useCallback(() => setGrowing(false), []);
  const layout: SkeletonLayoutProps = {
    blueprint,
    staged,
    settled,
    band,
    growing,
    sourceLabel,
    showTracklist: post.contentType === 'album' || post.contentType === 'playlist',
    perServiceLinks: post.contentType !== 'playlist',
    showReleaseLines: post.contentType !== 'playlist' && post.contentType !== 'artist',
    showAuthor: post.showAuthor,
    ownPost: post.ownPost,
    author,
    onCancel,
  };

  return (
    <div className="min-h-svh relative" data-continued={continued ? '' : undefined}>
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
      <div
        aria-hidden
        className="blueprint-grid fixed inset-0 z-0 pointer-events-none"
        style={{ opacity: blueprint.finished ? 0 : 1 }}
      />

      {/* The post page switches layouts above 900px; CSS matches it so the server HTML is already right. */}
      <div className="relative z-10 min-h-svh">
        <div className="max-[900px]:hidden">
          <DesktopSkeleton {...layout} />
        </div>
        <div className="min-[901px]:hidden">
          <MobileSkeleton {...layout} />
        </div>
      </div>
      {growing && growFrom && <BarGrowth from={growFrom} onLanded={handleLanded} />}
    </div>
  );
};

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A post skeleton often replaces another one: the route loading boundary hands
 * off to the client fetch, and a finished conversion hands off to its post.
 * The next skeleton renders before the one it replaces unmounts, so each
 * skeleton registers while mounted and stamps the time it leaves. A skeleton
 * that finds one mounted, or one that left moments ago, continues its state
 * (and a conversion's staged content) instead of drawing the blueprint again.
 */
interface SkeletonEntry {
  resolved: boolean;
  conversion?: StagedConversion;
  contentType?: string;
  showAuthor: boolean;
  ownPost: boolean;
  leftAt: number | null;
}
let lastSkeleton: SkeletonEntry | null = null;
const CONTINUATION_WINDOW_MS = 1000;

/** The skeleton this one replaces, if any. */
function useContinuation() {
  const [continued] = useState(() =>
    lastSkeleton && (lastSkeleton.leftAt === null || Date.now() - lastSkeleton.leftAt < CONTINUATION_WINDOW_MS)
      ? lastSkeleton
      : null
  );
  return continued;
}

/** Registers this skeleton for the one that replaces it. */
function useRegistration(state: Omit<SkeletonEntry, 'leftAt'>) {
  const { resolved, conversion, contentType, showAuthor, ownPost } = state;
  useEffect(() => {
    const entry: SkeletonEntry = { resolved, conversion, contentType, showAuthor, ownPost, leftAt: null };
    lastSkeleton = entry;
    return () => {
      entry.leftAt = Date.now();
    };
  }, [resolved, conversion, contentType, showAuthor, ownPost]);
}

const PALETTE_WAIT_MS = 1200;
/**
 * The band color each artwork's label printed in (undefined: the brand color, when the
 * palette failed or took too long), so a skeleton that continues another starts there.
 */
const printedBands = new Map<string, string | undefined>();

interface ArtworkBand {
  ready: boolean;
  tint?: string;
}

function useArtworkBand(artworkUrl: string | null | undefined): ArtworkBand {
  const [extracted, setExtracted] = useState<{ url: string; palette: ColorPalette } | null>(null);
  const [waitedFor, setWaitedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!artworkUrl || ColorExtractor.cachedPalette(artworkUrl) || printedBands.has(artworkUrl)) return;
    let cancelled = false;
    void ColorExtractor.extractPalette(artworkUrl).then((palette) => {
      if (!cancelled) setExtracted({ url: artworkUrl, palette });
    });
    const timer = window.setTimeout(() => setWaitedFor(artworkUrl), PALETTE_WAIT_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [artworkUrl]);
  const palette = artworkUrl
    ? ColorExtractor.cachedPalette(artworkUrl) ?? (extracted?.url === artworkUrl ? extracted.palette : undefined)
    : undefined;
  const printed = artworkUrl ? printedBand(artworkUrl) : null;
  const ready = !artworkUrl || Boolean(printed) || Boolean(palette) || waitedFor === artworkUrl;
  // Once printed, the band keeps its color, even if the palette arrives after the wait.
  const tint = printed ? printed.tint : palette?.vibrant;
  useEffect(() => {
    if (artworkUrl && ready && !printedBands.has(artworkUrl)) printedBands.set(artworkUrl, tint);
  }, [artworkUrl, ready, tint]);
  return { ready, tint };
}

/** The band a conversion's label printed for this artwork, if it printed one in this tab. */
export function printedBand(artworkUrl: string): { tint?: string } | null {
  return printedBands.has(artworkUrl) ? { tint: printedBands.get(artworkUrl) } : null;
}

type BlueprintSection = 'artwork' | 'links' | 'tracks';

interface Blueprint {
  early: boolean;
  late: boolean;
  beam: BlueprintSection | null;
  finished: boolean;
}

function stagedBlueprint(conversion: StagedConversion): Blueprint {
  const sourceRead = Boolean(conversion.source) || conversion.ready;
  const matching: BlueprintSection = conversion.source?.tracks ? 'tracks' : 'links';
  const beam: BlueprintSection | null = conversion.ready ? null : sourceRead ? matching : 'artwork';
  return { early: !sourceRead, late: !conversion.ready, beam, finished: conversion.ready };
}

function loadBlueprint(resolved: boolean): Blueprint {
  return { early: !resolved, late: !resolved, beam: null, finished: resolved };
}

function drawOrder() {
  let position = 0;
  return () => position++;
}

function draftProps(draft: boolean, order: number, delay: number, className: string) {
  return {
    className: cn('blueprint-part', className),
    'data-drafting': draft || undefined,
    style: { '--blueprint-order': order, transitionDelay: `${delay}ms` },
  };
}

const Part: React.FC<{
  draft: boolean;
  order: number;
  delay?: number;
  line?: boolean;
  className: string;
  children?: React.ReactNode;
}> = ({ draft, order, delay = 0, line, className, children }) => (
  <Skeleton {...draftProps(draft, order, delay, className)} data-text-rule={line || undefined}>
    {children}
  </Skeleton>
);

const TextLine: React.FC<{
  draft: boolean;
  order: number;
  delay?: number;
  box: string;
  bar: string;
}> = ({ box, bar, ...part }) => (
  <div className={cn('flex items-center', box)}>
    <Part {...part} line className={bar} />
  </div>
);

const CropMarks: React.FC<{ drafting: boolean; label?: string }> = ({ drafting, label }) => (
  <>
    <span aria-hidden className="blueprint-crop" data-drafting={drafting || undefined} />
    {label && (
      <span
        className={cn(
          'absolute -top-[19px] left-4 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80 transition-opacity duration-400 ease-in-out motion-reduce:transition-none',
          !drafting && 'opacity-0'
        )}
      >
        {label}
      </span>
    )}
  </>
);

const BarGrowth: React.FC<{ from: ViewportBox; onLanded: () => void }> = ({ from, onLanded }) => {
  const [to, setTo] = useState<ViewportBox | null>(null);
  const [landed, setLanded] = useState(false);
  const [gone, setGone] = useState(false);

  useLayoutEffect(() => {
    const target = Array.from(document.querySelectorAll<HTMLElement>('[data-grow-target]')).find(
      (element) => element.getClientRects().length > 0
    );
    if (!target) {
      onLanded();
      setGone(true);
      return;
    }
    const box = target.getBoundingClientRect();
    setTo({ left: box.left, top: box.top, width: box.width, height: box.height });
  }, [onLanded]);

  if (gone) return null;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-20"
      initial={{ ...from, opacity: 1, borderRadius: 16 }}
      animate={to ? { ...to, opacity: landed ? 0 : 1, borderRadius: 8 } : undefined}
      transition={landed ? { duration: 0.25, ease: 'easeOut' } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (!to) return;
        if (landed) {
          setGone(true);
          return;
        }
        setLanded(true);
        onLanded();
      }}
    >
      <ConversionBeam active className="h-full w-full">
        <div className="relative h-full w-full rounded-[inherit] border border-border/70">
          <motion.div
            className="force-light absolute inset-0 rounded-[inherit] bg-field shadow-[0_2px_6px_rgba(0,0,0,0.05),0_4px_42px_rgba(0,0,0,0.06)]"
            animate={{ opacity: to ? 0 : 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          />
        </div>
      </ConversionBeam>
    </motion.div>
  );
};

interface SkeletonLayoutProps {
  blueprint: Blueprint;
  staged?: StagedConversion;
  band: ArtworkBand;
  settled: boolean;
  growing: boolean;
  perServiceLinks: boolean;
  /** The post's label head names the artist and the release details (track duration and album, album release date) for tracks and albums only. */
  showReleaseLines: boolean;
  sourceLabel?: string;
  showTracklist: boolean;
  showAuthor: boolean;
  ownPost: boolean;
  author?: SkeletonAuthor;
  onCancel?: () => void;
}

const ProgressOverlay: React.FC<{
  label: string;
  emblem: boolean;
  size?: 'desktop' | 'mobile';
  drafting?: boolean;
}> = ({ label, emblem, size = 'desktop', drafting }) => {
  const isDesktop = size === 'desktop';
  const logoSize = isDesktop ? 40 : 32;

  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-400 ease-in-out motion-reduce:transition-none',
          !emblem && 'opacity-0'
        )}
      >
        <div
          className={cn(
            'absolute inset-0 bg-card/35 backdrop-blur-[2px] transition-opacity duration-400 ease-in-out motion-reduce:transition-none',
            drafting && 'opacity-0'
          )}
        />
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 50% 42%, hsl(var(--primary) / 0.08), transparent 62%)'
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            <span
              aria-hidden
              className="absolute inset-0 -m-2 rounded-full bg-primary/10 blur-md animate-progress-breath"
            />
            <Image
              src="/images/cassette_logo.svg"
              alt="Cassette Logo"
              width={logoSize}
              height={logoSize}
              className="object-contain relative"
            />
          </div>
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <div
          className={`bg-gradient-to-t from-card/95 via-card/70 to-transparent ${
            isDesktop ? 'px-4 pt-8 pb-3' : 'px-3 pt-6 pb-2.5'
          }`}
        >
          <output className="block overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={label}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="truncate text-xs text-foreground/80"
              >
                {label}
              </motion.p>
            </AnimatePresence>
          </output>
        </div>
      </div>
    </div>
  );
};

const Artwork: React.FC<{
  blueprint: Blueprint;
  staged?: StagedConversion;
  order: number;
  className: string;
  size: 'desktop' | 'mobile';
}> = ({ blueprint, staged, order, className, size }) => {
  const artworkUrl = staged?.source?.artworkUrl;
  return (
    <div className="relative">
      <Part draft={blueprint.early} order={order} delay={60} className={className} />
      {artworkUrl && (
        <ArtworkImage
          src={artworkUrl}
          alt=""
          fill
          sizes={size === 'desktop' ? '352px' : '(max-width: 639px) calc(100vw - 48px), 340px'}
          className="object-cover"
          unoptimized
          priority
          decoding="sync"
        />
      )}
      {staged && !staged.ready && (
        <ProgressOverlay label={staged.stageLabel} emblem={!artworkUrl} size={size} drafting={blueprint.early} />
      )}
    </div>
  );
};

const LINK_DELAY_MS = 300;
const LINK_GAP_MS = 180;
const LINK_COUNT = 3;
const TRACK_ROW_COUNT = 6;

const LabelHead: React.FC<{
  blueprint: Blueprint;
  staged?: StagedConversion;
  settled: boolean;
  band: ArtworkBand;
  next: () => number;
  showReleaseLines: boolean;
  compact?: boolean;
}> = ({ blueprint, staged, settled, band, next, showReleaseLines, compact }) => {
  const source = staged?.source;
  if (source?.title && band.ready) {
    const typeLabel = source.elementType
      ? source.elementType.charAt(0).toUpperCase() + source.elementType.slice(1)
      : undefined;
    return (
      <div className={cn(!settled && 'motion-safe:animate-focus-in')}>
        <PostLabelHead
          compact={compact}
          kicker={typeLabel && <span>{typeLabel}</span>}
          title={source.title}
          artist={source.artists.length > 0 && source.elementType !== 'artist' ? source.artists.join(', ') : undefined}
          meta={
            source.details
              ? postLabelMeta(source.elementType, source.details)
              // Holds the post's meta line until the post is read, so the rows below do not move.
              : showReleaseLines && (
                <span aria-hidden className="flex h-5 items-center">
                  <span className="h-3 w-36 rounded-sm bg-current opacity-25" />
                </span>
              )
          }
          tint={band.tint}
        />
      </div>
    );
  }

  const early = blueprint.early || Boolean(source?.title);
  const ink = 'bg-white/25';
  return (
    <div className="relative" style={{ '--band': bandColor() }}>
      <div {...draftProps(early, next(), 120, cn('bg-[var(--band)] text-left', compact ? 'px-4 pb-4 pt-4' : 'px-6 pb-6 pt-5'))}>
        <TextLine
          draft={early}
          order={next()}
          delay={160}
          box={compact ? 'mb-3 h-[15px]' : 'mb-5 h-[16.5px]'}
          bar={cn('h-2.5', compact ? 'w-28' : 'w-36', ink)}
        />
        <TextLine
          draft={early}
          order={next()}
          delay={200}
          box={compact ? 'h-8' : 'h-10'}
          bar={cn(compact ? 'h-5 w-40' : 'h-7 w-3/5', ink)}
        />
        {showReleaseLines && (
          <>
            <TextLine
              draft={early}
              order={next()}
              delay={240}
              box={compact ? 'mt-2 h-5' : 'mt-2 h-6'}
              bar={cn('h-3.5 w-28', ink)}
            />
            <TextLine draft={early} order={next()} delay={280} box="mt-3 h-5" bar={cn('h-3 w-36', ink)} />
          </>
        )}
      </div>
      <DitherEdge
        color="var(--band)"
        side="bottom"
        className={cn('transition-opacity duration-400 ease-in-out motion-reduce:transition-none', early && 'opacity-0')}
      />
    </div>
  );
};

const LINK_ROW = 'h-[38.5px] rounded-md sm:h-[42px]';
/** A listen link with a caption under the service name (StreamingLinks `captions`). */
const CAPTIONED_LINK_ROW = 'h-[54.5px] rounded-md sm:h-[54px]';

/** A service row still waiting for its link. The spinner sits where the link's arrow lands. */
const PendingLink: React.FC<{ platform: PlatformUiKey; order: number; delay: number }> = ({
  platform,
  order,
  delay,
}) => {
  const service = streamingServices[platform];
  return (
    <Part draft order={order} delay={delay} className={cn(LINK_ROW, 'flex items-center gap-2.5 px-3 sm:gap-3 sm:px-4')}>
      {service && (
        <>
          <Image src={service.icon} alt="" width={20} height={20} loading="eager" decoding="sync" className="h-4 w-4 object-contain opacity-40 grayscale sm:h-5 sm:w-5" />
          <span className="whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70 sm:text-xs">
            {service.name}
          </span>
          <span data-testid="pending-link-indicator" className="ml-auto flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Matching
            <Spinner aria-hidden size="xs" variant="muted" className="size-3.5 motion-reduce:hidden" />
          </span>
        </>
      )}
    </Part>
  );
};

const ListenLinks: React.FC<{
  blueprint: Blueprint;
  staged?: StagedConversion;
  settled: boolean;
  perService: boolean;
  next: () => number;
  className: string;
}> = ({ blueprint, staged, settled, perService, next, className }) => {
  // A playlist's rows follow the post's rules, in its order: the post's own links (once it is
  // read), the original, Cassette's shared Spotify copy, then the owner's own links.
  const playlistLinks: Partial<Record<PlatformUiKey, string>> = {};
  const playlistCaptions: Partial<Record<PlatformUiKey, string>> = {};
  const source = staged?.sourceLink;
  if (source) {
    Object.assign(playlistLinks, staged.links);
    playlistLinks[source.platform] = source.url;
    playlistCaptions[source.platform] = 'Original playlist';
    const ownLinks = staged.curatorLinks?.links ?? {};
    if (staged.cassetteSpotifyCopyUrl && sharesCassetteSpotifyCopy(source.platform) && !staged.links.spotify && !ownLinks.spotify) {
      playlistLinks.spotify = staged.cassetteSpotifyCopyUrl;
      playlistCaptions.spotify = CASSETTE_SPOTIFY_COPY_CAPTION;
    }
    for (const [platform, url] of curatorListenRows(source.platform, ownLinks)) {
      playlistLinks[platform] = url;
      playlistCaptions[platform] = curatorLinkCaption(staged.curatorLinks?.handle);
    }
  }
  return (
  <ConversionBeam active={blueprint.beam === 'links'} borderRadius={0} className="flex flex-1 flex-col">
    <div className={className}>
      <div className="grid gap-2.5" aria-busy={(perService && staged && !staged.linksFinal) || undefined}>
        {perService ? (
          staged
            ? ACTIVE_PLATFORM_UI_KEYS.filter((platform) => !staged.linksFinal || staged.links[platform]).map((platform, i) => {
                const url = staged.links[platform];
                return url ? (
                  <StreamingLinks
                    key={platform}
                    links={{ [platform]: url }}
                    className={cn(!settled && 'motion-safe:animate-focus-in')}
                  />
                ) : (
                  <PendingLink
                    key={platform}
                    platform={platform}
                    order={next()}
                    delay={LINK_DELAY_MS + i * LINK_GAP_MS}
                  />
                );
              })
            : Array.from({ length: LINK_COUNT }, (_, i) => (
                <Part
                  key={i}
                  draft={blueprint.early}
                  order={next()}
                  delay={LINK_DELAY_MS + i * LINK_GAP_MS}
                  className={LINK_ROW}
                />
              ))
        ) : staged?.sourceLink ? (
          <StreamingLinks
            links={playlistLinks}
            captions={playlistCaptions}
            className={cn(!settled && 'motion-safe:animate-focus-in')}
          />
        ) : (
          <Part draft={blueprint.early} order={next()} delay={LINK_DELAY_MS} className={CAPTIONED_LINK_ROW} />
        )}
      </div>
      {!perService && (
        // PlaylistCopyActions: a heading, one line, and a button for each service the playlist is not on.
        <div className="mt-6">
          <TextLine draft={blueprint.early} order={next()} delay={LINK_DELAY_MS + LINK_GAP_MS} box="h-5" bar="h-3 w-36" />
          <TextLine draft={blueprint.early} order={next()} delay={LINK_DELAY_MS + LINK_GAP_MS} box="mt-0.5 h-4" bar="h-2.5 w-3/5" />
          <div className="mt-3 grid gap-2.5">
            {playlistCopyTargets(playlistLinks).map((platform, i) => (
                <Part
                  key={platform}
                  draft={blueprint.early}
                  order={next()}
                  delay={LINK_DELAY_MS + (i + 2) * LINK_GAP_MS}
                  className={LINK_ROW}
                />
              ))}
          </div>
        </div>
      )}
    </div>
  </ConversionBeam>
  );
};

/**
 * Copies PostAuthorHeader, PostEngagementBar, and PostCuratorJoin. With the metadata's author hint,
 * a visitor's row ends in Follow, which puts the name and "shared this" on lines of their own; the
 * caption takes its real text, invisible, so it wraps as the loaded caption does; and a live plan
 * adds the join line. Without the hint (an older Bridge), it draws a one-line caption and no Follow.
 */
const AuthorRow: React.FC<{
  blueprint: Blueprint;
  next: () => number;
  author?: SkeletonAuthor;
  ownPost: boolean;
  compact?: boolean;
}> = ({ blueprint, next, author, ownPost, compact }) => {
  const { late } = blueprint;
  const visitor = Boolean(author?.hasCuratorPage) && !ownPost;
  const caption = author ? author.caption : undefined;
  return (
    <>
      <div className={cn('flex gap-2.5', caption === null ? 'items-center' : 'items-start')}>
        <Part draft={late} order={next()} delay={200} className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <TextLine draft={late} order={next()} delay={220} box="h-5" bar="h-3 w-40 max-w-full" />
          {visitor && <TextLine draft={late} order={next()} delay={230} box="h-4" bar="h-2.5 w-24" />}
          {caption === undefined && <TextLine draft={late} order={next()} delay={240} box="h-5" bar="h-3 w-48 max-w-full" />}
          {caption && (
            <div className={cn('relative font-atkinson leading-relaxed tracking-wide', compact ? 'text-sm' : 'text-sm sm:text-[15px]')}>
              <p aria-hidden className="invisible whitespace-pre-wrap break-words">
                {caption}
              </p>
              {/* A blueprint part is position: relative, so the wrapper places the first line's rule. */}
              <div className="absolute inset-x-0 top-0">
                <TextLine draft={late} order={next()} delay={240} box="h-[1.625em]" bar="h-3 w-48 max-w-full" />
              </div>
            </div>
          )}
        </div>
        {visitor && <Part draft={late} order={next()} delay={250} className="h-8 w-[87px] shrink-0 rounded-md" />}
      </div>
      {/* PostEngagementBar: a pill of two buttons, taller from the sm breakpoint. */}
      <Part draft={late} order={next()} delay={260} className="h-[26px] w-28 self-start rounded-full sm:h-[34px]" />
      {visitor && author?.hasLivePlan && (
        <div className={cn('border-t pt-3', late ? 'border-dotted border-foreground/30' : 'border-border/70')}>
          <div className="flex min-h-9 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <TextLine draft={late} order={next()} delay={270} box="h-5" bar="h-3 w-24" />
              <TextLine draft={late} order={next()} delay={280} box="h-4" bar="h-2.5 w-44 max-w-full" />
            </div>
            <Part draft={late} order={next()} delay={290} className="h-8 w-[52px] shrink-0 rounded-md" />
          </div>
        </div>
      )}
    </>
  );
};

const TracklistCard: React.FC<{
  blueprint: Blueprint;
  staged?: StagedConversion;
  settled: boolean;
  next: () => number;
  compact?: boolean;
}> = ({ blueprint, staged, settled, next, compact }) => {
  const { late } = blueprint;
  const tracks = staged?.source?.tracks;
  if (tracks && tracks.length > 0) {
    return (
      // The beam renders a style element beside its child; the wrapper keeps it out of the parent's spacing.
      <div>
        <ConversionBeam active={blueprint.beam === 'tracks'}>
          <div className={cn('card-ink overflow-hidden', !settled && 'motion-safe:animate-focus-in')} inert>
            <div className={cn('flex items-baseline justify-between gap-3 border-b border-border', compact ? 'px-4 py-3' : 'px-5 py-4')}>
              <h3 className="text-sm font-semibold text-foreground">Tracklist</h3>
              <span className="text-sm tabular-nums text-muted-foreground">{formatTrackListStats(tracks)}</span>
            </div>
            <TrackList
              items={tracks}
              compact={compact}
              className="!border-0 !bg-transparent !shadow-none"
            />
          </div>
        </ConversionBeam>
      </div>
    );
  }
  const rule = late ? 'border-dotted border-foreground/30' : 'border-border/70';
  // Copies the loaded card: most playlists and albums are long enough for TrackList to collapse
  // to COLLAPSED_MAX_HEIGHT_PX of two-line rows above its Show all row.
  return (
    <div {...draftProps(late, next(), 120, 'card-ink overflow-hidden')}>
      <div className={cn('flex items-center justify-between gap-3 border-b', compact ? 'px-4 py-3' : 'px-5 py-4', rule)}>
        <TextLine draft={late} order={next()} delay={160} box="h-5" bar="h-3.5 w-20" />
        <TextLine draft={late} order={next()} delay={180} box="h-5" bar="h-3 w-24" />
      </div>
      <div className="overflow-hidden" style={{ height: COLLAPSED_MAX_HEIGHT_PX }}>
        {Array.from({ length: TRACK_ROW_COUNT }, (_, i) => (
          <div key={i} className={cn('flex items-center gap-3 border-b px-3 sm:px-4', compact ? 'py-2' : 'py-2.5', rule)}>
            <div className="flex w-7 justify-end pr-1">
              <Part draft={late} order={next()} delay={200 + i * 40} className="h-2.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1 pl-1">
              <TextLine draft={late} order={next()} delay={200 + i * 40} box="h-5" bar="h-3 w-2/5" />
              <TextLine draft={late} order={next()} delay={220 + i * 40} box="mt-0.5 h-[19.5px]" bar="h-2.5 w-1/4" />
            </div>
            <TextLine draft={late} order={next()} delay={220 + i * 40} box="h-[16.5px] max-sm:hidden" bar="h-2.5 w-7" />
          </div>
        ))}
      </div>
      <div className={cn('flex justify-center border-t py-2.5', rule)}>
        <TextLine draft={late} order={next()} delay={460} box="h-[19.5px]" bar="h-3 w-28" />
      </div>
    </div>
  );
};

const Foot: React.FC<{ blueprint: Blueprint; next: () => number; offer: boolean; className?: string }> = ({
  blueprint,
  next,
  offer,
  className,
}) => {
  const { late } = blueprint;
  return (
    <footer
      className={cn(
        'space-y-4 border-t pt-5 transition-colors duration-400 ease-in-out motion-reduce:transition-none',
        late ? 'border-dotted border-foreground/30' : 'border-border/70',
        className
      )}
    >
      {offer && (
        <div className="flex items-center justify-between gap-4">
          <TextLine draft={late} order={next()} delay={220} box="h-5" bar="h-3 w-64 max-w-full" />
          <Part draft={late} order={next()} delay={260} className="h-9 w-28 shrink-0 rounded-md" />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextLine draft={late} order={next()} delay={280} box="h-5" bar="h-3 w-44" />
        <TextLine draft={late} order={next()} delay={300} box="h-5" bar="h-3 w-32" />
      </div>
    </footer>
  );
};

const OwnerColumn: React.FC<{ blueprint: Blueprint; next: () => number; className?: string }> = ({
  blueprint,
  next,
  className,
}) => {
  const { late } = blueprint;
  const rule = late ? 'border-dotted border-foreground/30' : 'border-border/70';
  return (
    <div {...draftProps(late, next(), 160, cn('card-quiet overflow-hidden', className))}>
      <div className={cn('border-b px-6 pb-5 pt-5', rule)}>
        <TextLine draft={late} order={next()} delay={180} box="h-4" bar="h-2.5 w-20" />
        <Part draft={late} order={next()} delay={200} className="mt-5 h-7 w-28 rounded-sm" />
      </div>
      <div className="px-6 pb-6 pt-5">
        <TextLine draft={late} order={next()} delay={220} box="h-5" bar="h-3 w-28" />
        <Part draft={late} order={next()} delay={240} className="mt-3 h-9 w-full rounded-md" />
        <TextLine draft={late} order={next()} delay={260} box="mt-3 h-10" bar="h-3 w-56" />
        <div className={cn('mt-8 border-t pt-6', rule)}>
          <TextLine draft={late} order={next()} delay={280} box="h-5" bar="h-3 w-20" />
          <TextLine draft={late} order={next()} delay={300} box="mt-3 h-10" bar="h-3 w-48" />
        </div>
      </div>
    </div>
  );
};

const growTargetClass = (growing: boolean) =>
  cn('transition-opacity duration-300 ease-out motion-reduce:transition-none', growing && 'opacity-0');

/**
 * Desktop skeleton layout - copies PostClientPage's desktop layout: the toolbar
 * and the post card in one container, centered under the navbar when short.
 */
const DesktopSkeleton: React.FC<SkeletonLayoutProps> = ({
  blueprint,
  staged,
  settled,
  band,
  growing,
  sourceLabel,
  showTracklist,
  showAuthor,
  ownPost,
  author,
  perServiceLinks,
  showReleaseLines,
  onCancel
}) => {
  const next = drawOrder();
  const { early, late } = blueprint;

  return (
    <div className="flex min-h-svh flex-col pt-16 before:flex-1 after:min-h-20 after:flex-1">
      {/* The owner column widens the container from 1280px, as on the post page. */}
      <div className={cn('mx-auto w-full max-w-[68rem] px-8 pb-4', ownPost && 'min-[1280px]:max-w-7xl')}>
        <div className="relative z-20 pb-6 pt-4">
          <div className="flex items-center justify-between gap-3">
            <BackButton onClick={onCancel} fallbackRoute="/explore" />
            <Part draft={late} order={next()} className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div
          className={cn(
            'grid grid-cols-1 gap-y-6',
            ownPost && 'min-[1280px]:grid-cols-[minmax(0,1fr)_20rem] min-[1280px]:gap-x-8'
          )}
        >
          <div className={cn('relative min-w-0', growTargetClass(growing))} inert={growing || undefined}>
            <CropMarks drafting={early} label={sourceLabel} />
            <div
              data-grow-target
              {...draftProps(early, next(), 0, 'card-ink grid grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] overflow-hidden')}
            >
              <div
                className={cn(
                  'flex flex-col transition-colors duration-400 ease-in-out motion-reduce:transition-none',
                  !early && 'bg-muted/40'
                )}
              >
                <ConversionBeam active={blueprint.beam === 'artwork'} borderRadius={0}>
                  <Artwork
                    blueprint={blueprint}
                    staged={staged}
                    order={next()}
                    size="desktop"
                    className="aspect-square w-full rounded-none"
                  />
                </ConversionBeam>
                {showAuthor && (
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <AuthorRow blueprint={blueprint} next={next} author={author} ownPost={ownPost} compact />
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'flex min-w-0 flex-col border-l transition-colors duration-400 ease-in-out motion-reduce:transition-none',
                  early ? 'border-dotted border-foreground/30' : 'border-border/70'
                )}
              >
                <LabelHead
                  blueprint={blueprint}
                  staged={staged}
                  settled={settled}
                  band={band}
                  next={next}
                  showReleaseLines={showReleaseLines}
                />
                <ListenLinks
                  blueprint={blueprint}
                  staged={staged}
                  settled={settled}
                  perService={perServiceLinks}
                  next={next}
                  className="flex flex-1 flex-col justify-center px-6 pb-6 pt-10"
                />
              </div>
            </div>
          </div>
          {/* Centered on the card beside it, as PostStudioColumn is. */}
          {ownPost && <OwnerColumn blueprint={blueprint} next={next} className="self-center max-[1279px]:hidden" />}
          <div className="min-w-0 space-y-6 min-[1280px]:col-start-1">
            {showTracklist && <TracklistCard blueprint={blueprint} staged={staged} settled={settled} next={next} />}
            <Foot blueprint={blueprint} next={next} offer={!ownPost && !author?.hasCuratorPage} />
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile skeleton layout - copies PostClientPage's mobile layout: the toolbar,
 * the framed artwork centered in the space left, the post card, the author card.
 */
const MobileSkeleton: React.FC<SkeletonLayoutProps> = ({
  blueprint,
  staged,
  settled,
  band,
  growing,
  sourceLabel,
  showTracklist,
  showAuthor,
  ownPost,
  author,
  perServiceLinks,
  showReleaseLines,
  onCancel
}) => {
  const next = drawOrder();
  const { early, late } = blueprint;

  return (
    <div className="mx-auto max-w-lg px-4 pb-6 pt-16 sm:px-6 sm:pb-8 md:px-8">
      <section className="flex min-h-[calc(100svh-6.5rem)] flex-col">
        <div className="w-full shrink-0 pb-3 pt-2.5 sm:pb-4 sm:pt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="justify-self-start">
              <BackButton onClick={onCancel} fallbackRoute="/explore" />
            </div>
            <Part draft={late} order={next()} className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-3 sm:gap-6">
          <div className="flex flex-1 items-center justify-center">
            <div className={cn('relative w-full sm:w-auto', growTargetClass(growing))} inert={growing || undefined}>
              <CropMarks drafting={early} label={sourceLabel} />
              <ConversionBeam active={blueprint.beam === 'artwork'} borderRadius={6}>
                <div
                  data-grow-target
                  {...draftProps(early, next(), 0, 'rounded-md bg-card p-2 elev-3 ring-1 ring-foreground/10')}
                >
                  <div className="relative overflow-hidden rounded-sm">
                    <Artwork
                      blueprint={blueprint}
                      staged={staged}
                      order={next()}
                      size="mobile"
                      className="aspect-square w-full rounded-sm sm:h-[340px] sm:w-[340px]"
                    />
                  </div>
                </div>
              </ConversionBeam>
            </div>
          </div>

          <div {...draftProps(early, next(), 0, 'card-ink overflow-hidden')}>
            <LabelHead
              blueprint={blueprint}
              staged={staged}
              settled={settled}
              band={band}
              next={next}
              showReleaseLines={showReleaseLines}
              compact
            />
            <ListenLinks
              blueprint={blueprint}
              staged={staged}
              settled={settled}
              perService={perServiceLinks}
              next={next}
              className="px-3 pb-3 pt-9 sm:px-5 sm:pb-5"
            />
          </div>

          {showAuthor && (
            <div {...draftProps(late, next(), 180, 'card-ink flex flex-col gap-1.5 px-3 py-2.5 sm:gap-2.5 sm:p-4')}>
              <AuthorRow blueprint={blueprint} next={next} author={author} ownPost={ownPost} />
            </div>
          )}
        </div>
      </section>

      <div className="mt-3 space-y-3 text-center sm:mt-6 sm:space-y-6">
        {showTracklist && <TracklistCard blueprint={blueprint} staged={staged} settled={settled} next={next} compact />}
        <Foot blueprint={blueprint} next={next} offer={!ownPost && !author?.hasCuratorPage} />
      </div>
    </div>
  );
};
