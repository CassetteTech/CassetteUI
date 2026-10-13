'use client';

import React, { useEffect, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { DitherEdge } from '@/components/features/marketing/dither-edge';
import { bandColor } from '@/components/features/post/post-label-head';
import { cn } from '@/lib/utils';

interface EntitySkeletonProps {
  /** Show progress overlay on artwork (for conversion flow) */
  showProgress?: boolean;
  /** Progress percentage (0-100) */
  progressPercent?: number;
  /** Current step name to display */
  progressStepName?: string;
  /** Zero-based index of the current conversion step */
  progressStepIndex?: number;
  /** Total number of conversion steps */
  progressTotalSteps?: number;
  /** Labels the blueprint, such as "Spotify · track" during a conversion */
  sourceLabel?: string;
  /**
   * Post type when known ("track", "album", ...); albums and playlists reserve
   * the tracklist. Unknown: the skeleton this one continues decides.
   */
  contentType?: string;
  /**
   * The post shows who shared it; anonymous conversions have no author row.
   * Unknown: the skeleton this one continues decides, else true.
   */
  showAuthor?: boolean;
  /** Callback when back button is clicked */
  onCancel?: () => void;
}

/**
 * EntitySkeleton - the loading state of the post page, drawn as a blueprint
 *
 * Used for the route loading boundary, the client fetch, and link conversion.
 * Its layouts copy the post page's (one card: the artwork pane beside the
 * printed label and the listen links), so the post lands where its outline was.
 *
 * The blueprint is dotted outlines on a dot grid. A plain load keeps it until
 * the post arrives; a conversion resolves the parts step by step while the
 * conversion beam marks the section the current step builds.
 */
export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({
  showProgress = false,
  progressPercent = 0,
  progressStepName,
  progressStepIndex,
  progressTotalSteps,
  sourceLabel,
  contentType,
  showAuthor,
  onCancel
}) => {
  const continued = useContinuation();
  const post = {
    contentType: contentType ?? continued?.contentType,
    showAuthor: showAuthor ?? continued?.showAuthor ?? true,
  };
  const blueprint = showProgress
    ? conversionBlueprint(progressStepIndex ?? 0, progressTotalSteps ?? 3, progressPercent >= 100)
    : loadBlueprint(continued?.resolved ?? false);
  useRegistration(blueprint.finished, post);
  const progress = showProgress
    ? { percent: progressPercent, stepName: progressStepName, stepIndex: progressStepIndex, totalSteps: progressTotalSteps }
    : null;
  const layout: SkeletonLayoutProps = {
    blueprint,
    progress,
    sourceLabel,
    showTracklist: post.contentType === 'album' || post.contentType === 'playlist',
    showAuthor: post.showAuthor,
    onCancel,
  };

  return (
    <div className="min-h-svh relative" data-continued={continued ? '' : undefined}>
      {/* Background with skeleton gradient */}
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
    </div>
  );
};

/**
 * A post skeleton often replaces another one: the route loading boundary hands
 * off to the client fetch, and a finished conversion hands off to its post.
 * The next skeleton renders before the one it replaces unmounts, so each
 * skeleton registers while mounted and stamps the time it leaves. A skeleton
 * that finds one mounted, or one that left moments ago, continues its state
 * instead of drawing the blueprint again.
 */
interface SkeletonEntry {
  resolved: boolean;
  contentType?: string;
  showAuthor: boolean;
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

/**
 * Registers this skeleton for the one that replaces it. A finished conversion
 * hands off to its post, so that skeleton starts resolved.
 */
function useRegistration(resolved: boolean, post: { contentType?: string; showAuthor: boolean }) {
  const { contentType, showAuthor } = post;
  useEffect(() => {
    const entry: SkeletonEntry = { resolved, contentType, showAuthor, leftAt: null };
    lastSkeleton = entry;
    return () => {
      entry.leftAt = Date.now();
    };
  }, [resolved, contentType, showAuthor]);
}

type BlueprintSection = 'artwork' | 'links' | 'details';

interface Blueprint {
  /**
   * Parts that resolve when the first conversion step ends: the card, artwork,
   * and label, and the listen links, which resolve one at a time while the
   * matching step runs.
   */
  early: boolean;
  /** Parts that resolve when the last step ends: the author row, toolbar, and foot. */
  late: boolean;
  /** The section the conversion beam marks as being built now. */
  beam: BlueprintSection | null;
  /** The conversion response arrived; the remaining steps sprint to the end. */
  finished: boolean;
}

/**
 * Maps the conversion step to the blueprint. The first step reads the source
 * (artwork section), the middle steps match the streaming links (links
 * section), and the last step builds the remaining details (details section).
 */
function conversionBlueprint(step: number, totalSteps: number, finished: boolean): Blueprint {
  const last = totalSteps - 1;
  let beam: BlueprintSection | null = null;
  if (!finished && step <= last) {
    beam = step === 0 ? 'artwork' : step < last ? 'links' : 'details';
  }
  return { early: step < 1, late: step <= last, beam, finished };
}

/** A plain post load stays a blueprint until the post replaces it. */
function loadBlueprint(resolved: boolean): Blueprint {
  return { early: !resolved, late: !resolved, beam: null, finished: resolved };
}

/** Hands out draw-in positions in document order. */
function drawOrder() {
  let position = 0;
  return () => position++;
}

/**
 * Blueprint attributes for a part: a dotted outline while `draft` is true,
 * fading to its fill after `delay` ms once it is false.
 */
function draftProps(draft: boolean, order: number, delay: number, className: string) {
  return {
    className: cn('blueprint-part', className),
    'data-drafting': draft || undefined,
    // SAFETY: CSSProperties has no custom-property keys; the value is a plain number.
    style: { '--blueprint-order': order, transitionDelay: `${delay}ms` } as React.CSSProperties,
  };
}

const Part: React.FC<{
  draft: boolean;
  order: number;
  delay?: number;
  /** Draw a text bar as a dotted rule instead of a dotted box. */
  line?: boolean;
  className: string;
}> = ({ draft, order, delay = 0, line, className }) => (
  <Skeleton {...draftProps(draft, order, delay, className)} data-text-rule={line || undefined} />
);

/** One line of text: a bar centered in the line box the real text occupies. */
const TextLine: React.FC<{
  draft: boolean;
  order: number;
  delay?: number;
  /** Classes for the line box: its height and margins. */
  box: string;
  /** Classes for the bar: its height, width, and fill. */
  bar: string;
}> = ({ box, bar, ...part }) => (
  <div className={cn('flex items-center', box)}>
    <Part {...part} line className={bar} />
  </div>
);

/** Print crop marks around a drafting frame, with the blueprint's label above its top-left corner. */
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

interface Progress {
  percent: number;
  stepName?: string;
  stepIndex?: number;
  totalSteps?: number;
}

interface SkeletonLayoutProps {
  blueprint: Blueprint;
  progress: Progress | null;
  sourceLabel?: string;
  showTracklist: boolean;
  showAuthor: boolean;
  onCancel?: () => void;
}

/**
 * Conversion overlay sitting on top of the artwork skeleton.
 *
 * The artwork skeleton stays visible under a light scrim — the post reads
 * as "under assembly" rather than blocked. A traveling border beam
 * (ConversionBeam, which the layouts move to the section being built) carries
 * the activity signal, so the overlay itself stays quiet: centered logo with a
 * breathing halo, and an editorial readout strip pinned to the bottom edge
 * (step counter, crossfading step name, percent) over a hairline progress
 * bar hugging the artwork's bottom edge.
 */
const ProgressOverlay: React.FC<{
  progress: Progress;
  size?: 'desktop' | 'mobile';
  /** The artwork under the overlay is a dotted draft; drop the scrim so its outline stays crisp. */
  drafting?: boolean;
}> = ({ progress, size = 'desktop', drafting }) => {
  const { percent, stepName, stepIndex, totalSteps } = progress;
  const isDesktop = size === 'desktop';
  const logoSize = isDesktop ? 40 : 32;
  const safePercent = Math.max(6, Math.min(100, Math.round(percent)));
  const showCounter = stepIndex != null && totalSteps != null && totalSteps > 0;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Light scrim: keep the skeleton shimmer visible underneath */}
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

      {/* Center emblem */}
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

      {/* Bottom readout strip */}
      <div className="absolute inset-x-0 bottom-0">
        <div
          className={`bg-gradient-to-t from-card/95 via-card/70 to-transparent ${
            isDesktop ? 'px-4 pt-8 pb-2.5' : 'px-3 pt-6 pb-2'
          }`}
        >
          <div className="flex items-baseline gap-2 overflow-hidden">
            {showCounter && (
              <span className="text-[10px] font-mono tabular-nums text-muted-foreground/70 shrink-0">
                {String((stepIndex ?? 0) + 1).padStart(2, '0')}
                <span className="text-muted-foreground/40">
                  {' / '}
                  {String(totalSteps).padStart(2, '0')}
                </span>
              </span>
            )}
            <AnimatePresence mode="wait">
              <motion.p
                key={stepName || 'prep'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="flex-1 text-xs text-foreground/80 truncate"
              >
                {stepName || 'Preparing...'}
              </motion.p>
            </AnimatePresence>
            <span className="text-[10px] font-mono tabular-nums text-muted-foreground/70 shrink-0">
              {safePercent}%
            </span>
          </div>
        </div>

        {/* Hairline progress bar on the artwork's bottom edge */}
        <div className="h-[3px] bg-muted/50">
          <motion.div
            className="h-full w-full origin-left bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
            initial={{ scaleX: 0.06 }}
            animate={{ scaleX: safePercent / 100 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
};

/** Resolve delay of the first listen link, and the gap between links. */
const LINK_DELAY_MS = 300;
const LINK_GAP_MS = 180;
/** Listen links reserved: most posts list Spotify, Apple Music, and Deezer. */
const LINK_COUNT = 3;
const TRACK_ROW_COUNT = 6;

/**
 * The printed label at the top of the post card (PostLabelHead): the band in
 * the brand color the post starts with, its text as bars in the band's ink.
 */
const LabelHead: React.FC<{
  blueprint: Blueprint;
  next: () => number;
  compact?: boolean;
}> = ({ blueprint, next, compact }) => {
  const { early } = blueprint;
  const ink = 'bg-white/25';
  return (
    // SAFETY: CSSProperties has no custom-property keys; the value is a CSS color.
    <div className="relative" style={{ '--band': bandColor() } as React.CSSProperties}>
      <ConversionBeam active={blueprint.beam === 'details'} borderRadius={0}>
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
          <TextLine
            draft={early}
            order={next()}
            delay={240}
            box={compact ? 'mt-2 h-5' : 'mt-2 h-6'}
            bar={cn('h-3.5 w-28', ink)}
          />
        </div>
      </ConversionBeam>
      <DitherEdge
        color="var(--band)"
        side="bottom"
        className={cn('transition-opacity duration-400 ease-in-out motion-reduce:transition-none', early && 'opacity-0')}
      />
    </div>
  );
};

/** The listen links (StreamingLinks): one row per service. */
const ListenLinks: React.FC<{ blueprint: Blueprint; next: () => number; className: string }> = ({
  blueprint,
  next,
  className,
}) => (
  <ConversionBeam active={blueprint.beam === 'links'} borderRadius={0} className="flex flex-1 flex-col">
    <div className={className}>
      <div className="grid gap-2.5">
        {Array.from({ length: LINK_COUNT }, (_, i) => (
          <Part
            key={i}
            draft={blueprint.early}
            order={next()}
            delay={LINK_DELAY_MS + i * LINK_GAP_MS}
            className="h-[38.5px] rounded-md sm:h-[42px]"
          />
        ))}
      </div>
    </div>
  </ConversionBeam>
);

/** Who shared the post (PostAuthorHeader and PostEngagementBar). */
const AuthorRow: React.FC<{ blueprint: Blueprint; next: () => number }> = ({ blueprint, next }) => {
  const { late } = blueprint;
  return (
    <>
      <div className="flex items-start gap-2.5">
        <Part draft={late} order={next()} delay={200} className="h-8 w-8 shrink-0 rounded-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <TextLine draft={late} order={next()} delay={220} box="h-5" bar="h-3 w-40" />
          <TextLine draft={late} order={next()} delay={240} box="h-5" bar="h-3 w-48" />
        </div>
      </div>
      <Part draft={late} order={next()} delay={260} className="h-7 w-28 self-start rounded-full" />
    </>
  );
};

/** Album and playlist tracks, in a second card under the post. */
const TracklistCard: React.FC<{ blueprint: Blueprint; next: () => number }> = ({ blueprint, next }) => {
  const { late } = blueprint;
  return (
    <div {...draftProps(late, next(), 120, 'card-ink overflow-hidden')}>
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <TextLine draft={late} order={next()} delay={160} box="h-5" bar="h-3.5 w-20" />
        <TextLine draft={late} order={next()} delay={180} box="h-5" bar="h-3 w-24" />
      </div>
      <div className="space-y-1 px-5 pb-4">
        {Array.from({ length: TRACK_ROW_COUNT }, (_, i) => (
          <TextLine key={i} draft={late} order={next()} delay={200 + i * 40} box="h-12" bar="h-3.5 w-2/3" />
        ))}
      </div>
    </div>
  );
};

/** The post foot: one account action and the support and report links. */
const Foot: React.FC<{ blueprint: Blueprint; next: () => number; className?: string }> = ({
  blueprint,
  next,
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
      <div className="flex items-center justify-between gap-4">
        <TextLine draft={late} order={next()} delay={220} box="h-5" bar="h-3 w-64 max-w-full" />
        <Part draft={late} order={next()} delay={260} className="h-9 w-28 shrink-0 rounded-md" />
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <TextLine draft={late} order={next()} delay={280} box="h-5" bar="h-3 w-44" />
        <TextLine draft={late} order={next()} delay={300} box="h-5" bar="h-3 w-32" />
      </div>
    </footer>
  );
};

/**
 * Desktop skeleton layout - copies PostClientPage's desktop layout: the toolbar
 * and the post card in one container, centered under the navbar when short.
 */
const DesktopSkeleton: React.FC<SkeletonLayoutProps> = ({
  blueprint,
  progress,
  sourceLabel,
  showTracklist,
  showAuthor,
  onCancel
}) => {
  const next = drawOrder();
  const { early, late } = blueprint;

  return (
    <div className="flex min-h-svh flex-col pt-16 before:flex-1 after:min-h-20 after:flex-1">
      <div className="mx-auto w-full max-w-[68rem] px-8 pb-4">
        <div className="relative z-20 pb-6 pt-4">
          <div className="flex items-center justify-between gap-3">
            <BackButton onClick={onCancel} fallbackRoute="/explore" />
            <Part draft={late} order={next()} className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="space-y-6">
          <div className="relative">
            <CropMarks drafting={early} label={sourceLabel} />
            <div {...draftProps(early, next(), 0, 'card-ink grid grid-cols-[minmax(16rem,22rem)_minmax(0,1fr)] overflow-hidden')}>
              {/* The sleeve pane: the artwork flush to the card's edges, the author beneath. */}
              <div
                className={cn(
                  'flex flex-col transition-colors duration-400 ease-in-out motion-reduce:transition-none',
                  !early && 'bg-muted/40'
                )}
              >
                <ConversionBeam active={blueprint.beam === 'artwork'} borderRadius={0}>
                  <div className="relative">
                    <Part draft={early} order={next()} delay={60} className="aspect-square w-full rounded-none" />
                    {progress && <ProgressOverlay progress={progress} size="desktop" drafting={early} />}
                  </div>
                </ConversionBeam>
                {showAuthor && (
                  <div className="flex flex-1 flex-col gap-2.5 p-5">
                    <AuthorRow blueprint={blueprint} next={next} />
                  </div>
                )}
              </div>
              <div
                className={cn(
                  'flex min-w-0 flex-col border-l transition-colors duration-400 ease-in-out motion-reduce:transition-none',
                  early ? 'border-dotted border-foreground/30' : 'border-border/70'
                )}
              >
                <LabelHead blueprint={blueprint} next={next} />
                <ListenLinks
                  blueprint={blueprint}
                  next={next}
                  className="flex flex-1 flex-col justify-center px-6 pb-6 pt-10"
                />
              </div>
            </div>
          </div>
          {showTracklist && <TracklistCard blueprint={blueprint} next={next} />}
          <Foot blueprint={blueprint} next={next} />
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
  progress,
  sourceLabel,
  showTracklist,
  showAuthor,
  onCancel
}) => {
  const next = drawOrder();
  const { early, late } = blueprint;

  return (
    <div className="mx-auto max-w-lg px-4 pb-2 pt-16 sm:px-6 sm:pb-8 md:px-8">
      <section className="flex min-h-[calc(100svh-6.5rem)] flex-col">
        <div className="w-full shrink-0 pb-2 pt-2.5 sm:pb-4 sm:pt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="justify-self-start">
              <BackButton onClick={onCancel} fallbackRoute="/explore" />
            </div>
            <Part draft={late} order={next()} className="h-9 w-24 rounded-md" />
          </div>
        </div>
        <div className="flex flex-1 flex-col gap-1.5 sm:gap-6">
          <div className="flex flex-1 items-center justify-center">
            <div className="relative">
              <CropMarks drafting={early} label={sourceLabel} />
              <ConversionBeam active={blueprint.beam === 'artwork'} borderRadius={6}>
                <div {...draftProps(early, next(), 0, 'rounded-md bg-card p-2 elev-3 ring-1 ring-foreground/10')}>
                  <div className="relative overflow-hidden rounded-sm">
                    <Part
                      draft={early}
                      order={next()}
                      delay={60}
                      className="h-[260px] w-[260px] rounded-sm sm:h-[340px] sm:w-[340px]"
                    />
                    {progress && <ProgressOverlay progress={progress} size="mobile" drafting={early} />}
                  </div>
                </div>
              </ConversionBeam>
            </div>
          </div>

          <div {...draftProps(early, next(), 0, 'card-ink overflow-hidden')}>
            <LabelHead blueprint={blueprint} next={next} compact />
            <ListenLinks blueprint={blueprint} next={next} className="px-3 pb-3 pt-9 sm:px-5 sm:pb-5" />
          </div>

          {showAuthor && (
            <div {...draftProps(late, next(), 180, 'card-ink flex flex-col gap-1.5 px-3 py-2.5 sm:gap-2.5 sm:p-4')}>
              <AuthorRow blueprint={blueprint} next={next} />
            </div>
          )}
        </div>
      </section>

      <div className="mt-2 space-y-2 sm:mt-6 sm:space-y-6">
        {showTracklist && <TracklistCard blueprint={blueprint} next={next} />}
        <Foot blueprint={blueprint} next={next} />
      </div>
    </div>
  );
};
