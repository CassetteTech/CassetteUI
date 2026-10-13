'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { ConversionBeam } from '@/components/features/conversion/conversion-beam';
import { cn } from '@/lib/utils';

interface EntitySkeletonProps {
  isDesktop?: boolean;
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
  /** Source of the converting link, such as "Spotify · track"; labels the blueprint */
  sourceLabel?: string;
  /** Callback when back button is clicked */
  onCancel?: () => void;
}

/**
 * EntitySkeleton - Unified loading skeleton for the post page
 *
 * Used for both direct post loading AND link conversion.
 * The progress overlay is shown during conversion, then fades out.
 * This ensures ONE skeleton throughout the entire loading flow.
 *
 * During a conversion the skeleton is a blueprint: dotted outlines on a dot
 * grid that resolve to the plain skeleton as the conversion steps finish,
 * while the conversion beam marks the section the current step builds.
 */
export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({
  isDesktop,
  showProgress = false,
  progressPercent = 0,
  progressStepName,
  progressStepIndex,
  progressTotalSteps,
  sourceLabel,
  onCancel
}) => {
  // When isDesktop is undefined (e.g., SSR/Suspense), show both layouts and let CSS handle it
  const showDesktop = isDesktop === undefined ? true : isDesktop;
  const showMobile = isDesktop === undefined ? true : !isDesktop;
  const blueprint = showProgress
    ? conversionBlueprint(progressStepIndex ?? 0, progressTotalSteps ?? 3, progressPercent >= 100)
    : null;

  return (
    <div className="min-h-svh relative">
      {/* Background with skeleton gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
      {blueprint && (
        <div
          aria-hidden
          className="blueprint-grid fixed inset-0 z-0 pointer-events-none"
          style={{ opacity: blueprint.finished ? 0 : 1 }}
        />
      )}

      <div className="relative z-10 min-h-svh">
        {/* Desktop Layout - hidden on mobile via CSS */}
        {showDesktop && (
          <div className={`${isDesktop === undefined ? 'hidden lg:block' : ''}`}>
            <DesktopSkeleton
              showProgress={showProgress}
              progressPercent={progressPercent}
              progressStepName={progressStepName}
              progressStepIndex={progressStepIndex}
              progressTotalSteps={progressTotalSteps}
              blueprint={blueprint}
              sourceLabel={sourceLabel}
              onCancel={onCancel}
            />
          </div>
        )}

        {/* Mobile Layout - hidden on desktop via CSS */}
        {showMobile && (
          <div className={`${isDesktop === undefined ? 'lg:hidden' : ''}`}>
            <MobileSkeleton
              showProgress={showProgress}
              progressPercent={progressPercent}
              progressStepName={progressStepName}
              progressStepIndex={progressStepIndex}
              progressTotalSteps={progressTotalSteps}
              blueprint={blueprint}
              sourceLabel={sourceLabel}
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

type BlueprintSection = 'artwork' | 'links' | 'details';

interface Blueprint {
  /**
   * Parts that resolve when the first step ends: the badge, artwork, title,
   * and artist read from the source link, and the streaming links, which
   * resolve one at a time while the matching step runs.
   */
  early: boolean;
  /** Parts that resolve when the last step ends: metadata, genres, and post actions. */
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

/** Hands out draw-in positions in document order. */
function drawOrder() {
  let position = 0;
  return () => position++;
}

/**
 * Blueprint attributes for a part. Outside a conversion (`draft` undefined)
 * the part keeps its plain classes; during one it is a dotted outline while
 * `draft` is true and fades to its fill after `delay` ms once it is false.
 */
function draftProps(draft: boolean | undefined, order: number, delay: number, className: string) {
  if (draft === undefined) return { className };
  return {
    className: cn('blueprint-part', className),
    'data-drafting': draft || undefined,
    // SAFETY: CSSProperties has no custom-property keys; the value is a plain number.
    style: { '--blueprint-order': order, transitionDelay: `${delay}ms` } as React.CSSProperties,
  };
}

const Part: React.FC<{
  draft?: boolean;
  order: number;
  delay?: number;
  /** Draw a text bar as a dotted rule instead of a dotted box. */
  line?: boolean;
  className: string;
}> = ({ draft, order, delay = 0, line, className }) => (
  <Skeleton
    {...draftProps(draft, order, delay, className)}
    data-text-rule={(draft !== undefined && line) || undefined}
  />
);

/** Wraps a section in the conversion beam during a conversion; renders it bare otherwise. */
const SectionBeam: React.FC<{
  blueprint: Blueprint | null;
  section: BlueprintSection;
  children: React.ReactNode;
}> = ({ blueprint, section, children }) =>
  blueprint ? (
    <ConversionBeam active={blueprint.beam === section}>{children}</ConversionBeam>
  ) : (
    <>{children}</>
  );

/** Crop marks and the source label around the drafting artwork frame. */
const ArtworkMarks: React.FC<{ blueprint: Blueprint | null; sourceLabel?: string }> = ({
  blueprint,
  sourceLabel,
}) => {
  if (!blueprint) return null;
  return (
    <>
      <span aria-hidden className="blueprint-crop" data-drafting={blueprint.early || undefined} />
      {sourceLabel && (
        <span className="absolute -top-[19px] left-4 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/80">
          {sourceLabel}
        </span>
      )}
    </>
  );
};

/** Drop shadow under the artwork; hidden while the artwork frame is a transparent draft. */
const ArtworkShadow: React.FC<{ blueprint: Blueprint | null }> = ({ blueprint }) => (
  <div
    className={cn(
      'absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg',
      blueprint && 'transition-opacity duration-400 ease-in-out motion-reduce:transition-none',
      blueprint?.early && 'opacity-0'
    )}
  />
);

interface SkeletonLayoutProps {
  showProgress?: boolean;
  progressPercent?: number;
  progressStepName?: string;
  progressStepIndex?: number;
  progressTotalSteps?: number;
  blueprint: Blueprint | null;
  sourceLabel?: string;
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
 * bar hugging the card's bottom border.
 */
const ProgressOverlay: React.FC<{
  show: boolean;
  percent: number;
  stepName?: string;
  stepIndex?: number;
  totalSteps?: number;
  size?: 'desktop' | 'mobile';
  /** The artwork under the overlay is a dotted draft; drop the scrim so its outline stays crisp. */
  drafting?: boolean;
}> = ({ show, percent, stepName, stepIndex, totalSteps, size = 'desktop', drafting }) => {
  const isDesktop = size === 'desktop';
  const logoSize = isDesktop ? 40 : 32;
  const safePercent = Math.max(6, Math.min(100, Math.round(percent)));
  const showCounter = isDesktop && stepIndex != null && totalSteps != null && totalSteps > 0;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 rounded-xl overflow-hidden"
        >
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

            {/* Hairline progress bar on the card's bottom edge */}
            <div className="h-[3px] bg-muted/50">
              <motion.div
                className="h-full w-full origin-left bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.45)]"
                initial={{ scaleX: 0.06 }}
                animate={{ scaleX: safePercent / 100 }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/** Resolve delay of the first streaming link tile, and the gap between tiles. */
const LINK_TILE_DELAY_MS = 300;
const LINK_TILE_GAP_MS = 180;

/**
 * Desktop skeleton layout - matches PostClientPage desktop track/artist layout exactly
 */
const DesktopSkeleton: React.FC<SkeletonLayoutProps> = ({
  showProgress,
  progressPercent,
  progressStepName,
  progressStepIndex,
  progressTotalSteps,
  blueprint,
  sourceLabel,
  onCancel
}) => {
  const next = drawOrder();
  const early = blueprint?.early;
  const late = blueprint?.late;

  return (
    <div className="pt-16">
      {/* Header Toolbar - matches PostClientPage desktop header position */}
      <div className="pt-4 pb-6 px-3 relative z-20 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={onCancel} fallbackRoute="/explore" />
          <Part draft={late} order={next()} className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="px-8 max-w-7xl mx-auto">
        <div className="flex gap-12">
          {/* Left Column - Artwork (flex: 2) - matches PostClientPage sticky layout */}
          <div className="flex-[2] sticky top-[120px] self-start">
            <div className="flex flex-col items-center min-w-0 h-[calc(100svh-144px)] justify-center">
              {/* Type Badge */}
              <Part draft={early} order={next()} line className="h-6 w-20 mb-6" />

              {/* Album Art with Shadow - matches PostClientPage 360x360 */}
              <div className="relative mb-6">
                <ArtworkShadow blueprint={blueprint} />
                <ArtworkMarks blueprint={blueprint} sourceLabel={sourceLabel} />
                <ConversionBeam active={blueprint?.beam === 'artwork'} borderRadius={12}>
                  <div className="relative">
                    <Part draft={early} order={next()} delay={60} className="relative w-[360px] h-[360px] rounded-xl" />

                    {/* Progress Overlay */}
                    <ProgressOverlay
                      show={showProgress || false}
                      percent={progressPercent || 0}
                      stepName={progressStepName}
                      stepIndex={progressStepIndex}
                      totalSteps={progressTotalSteps}
                      size="desktop"
                      drafting={blueprint?.early}
                    />
                  </div>
                </ConversionBeam>
              </div>
            </div>
          </div>

          {/* Right Column - Content (flex: 3) */}
          <div className="flex-[3]">
            <div className="py-8 pb-16 min-h-[calc(100svh-144px)] flex flex-col justify-center">
              <div className="space-y-6">
                {/* Track Information Card */}
                <SectionBeam blueprint={blueprint} section="details">
                  <div {...draftProps(early, next(), 120, 'p-5 card-quiet')}>
                    <div className="space-y-3">
                      {/* Title */}
                      <Part draft={early} order={next()} delay={180} line className="h-6 w-48 mx-auto" />

                      {/* Artist */}
                      <Part draft={early} order={next()} delay={240} line className="h-4 w-32 mx-auto" />

                      {/* Separator */}
                      <div className="border-t border-border/30 mx-4" />

                      {/* Metadata - Duration and Album */}
                      <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
                        <Part draft={late} order={next()} line className="h-4 w-24" />
                        <span className="text-muted-foreground">•</span>
                        <Part draft={late} order={next()} delay={50} line className="h-4 w-32" />
                      </div>

                      {/* Genres */}
                      <div className="border-t border-border/30 mx-4" />
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[0, 1, 2].map((i) => (
                          <Part key={i} draft={late} order={next()} delay={100 + i * 40} className="h-6 w-16 rounded-full" />
                        ))}
                      </div>
                    </div>
                  </div>
                </SectionBeam>

                {/* Streaming Links Container */}
                <SectionBeam blueprint={blueprint} section="links">
                  <div {...draftProps(early, next(), 0, 'p-5 card-ink relative z-10')}>
                    <Part draft={early} order={next()} delay={150} line className="h-5 w-24 mb-4" />
                    <div className="grid grid-cols-3 gap-4">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <Part
                          key={i}
                          draft={early}
                          order={next()}
                          delay={LINK_TILE_DELAY_MS + i * LINK_TILE_GAP_MS}
                          className="h-12 rounded-lg"
                        />
                      ))}
                    </div>
                  </div>
                </SectionBeam>

                {/* Support Us placeholder */}
                <div className="flex items-center justify-between gap-4">
                  <Part draft={late} order={next()} delay={220} line className="h-4 w-48" />
                  <Part draft={late} order={next()} delay={260} className="h-9 w-20 rounded-lg" />
                </div>

                {/* Report Button */}
                <div className="flex justify-center">
                  <Part draft={late} order={next()} delay={300} className="w-40 h-10 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Mobile skeleton layout - matches PostClientPage mobile layout exactly
 */
const MobileSkeleton: React.FC<SkeletonLayoutProps> = ({
  showProgress,
  progressPercent,
  progressStepName,
  progressStepIndex,
  progressTotalSteps,
  blueprint,
  sourceLabel,
  onCancel
}) => {
  const next = drawOrder();
  const early = blueprint?.early;
  const late = blueprint?.late;

  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 pt-16 max-w-lg mx-auto">
      {/* Header Toolbar - inside the main container, matching PostClientPage */}
      <div className="pt-4 pb-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={onCancel} fallbackRoute="/explore" />
          <Part draft={late} order={next()} className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="text-center space-y-4 sm:space-y-6">
        {/* Element Type - matches PostClientPage structure */}
        <div>
          <Part draft={early} order={next()} line className="h-5 w-16 mx-auto mb-4 sm:mb-6" />
        </div>

        {/* Album Art Container - matches PostClientPage dimensions */}
        <div>
          <div className="relative inline-block">
            <ArtworkShadow blueprint={blueprint} />
            <ArtworkMarks blueprint={blueprint} sourceLabel={sourceLabel} />
            <ConversionBeam active={blueprint?.beam === 'artwork'} borderRadius={12}>
              <div className="relative">
                <Part
                  draft={early}
                  order={next()}
                  delay={60}
                  className="relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] rounded-xl"
                />

                {/* Progress Overlay */}
                <ProgressOverlay
                  show={showProgress || false}
                  percent={progressPercent || 0}
                  stepName={progressStepName}
                  stepIndex={progressStepIndex}
                  totalSteps={progressTotalSteps}
                  size="mobile"
                  drafting={blueprint?.early}
                />
              </div>
            </ConversionBeam>
          </div>
        </div>

        {/* Track Information Card - Mobile */}
        <SectionBeam blueprint={blueprint} section="details">
          <div {...draftProps(early, next(), 120, 'p-4 sm:p-5 card-quiet')}>
            <div className="space-y-4">
              {/* Title */}
              <Part draft={early} order={next()} delay={180} line className="h-7 w-48 mx-auto" />

              {/* Artist */}
              <Part draft={early} order={next()} delay={240} line className="h-4 w-32 mx-auto" />

              {/* Separator */}
              <div className="border-t border-border/30" />

              {/* Metadata */}
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap justify-center gap-3">
                  <Part draft={late} order={next()} line className="h-4 w-24" />
                  <span className="text-muted-foreground">•</span>
                  <Part draft={late} order={next()} delay={50} line className="h-4 w-28" />
                </div>
              </div>

              {/* Genres */}
              <div className="border-t border-border/30" />
              <div className="flex flex-wrap gap-2 justify-center">
                {[0, 1, 2].map((i) => (
                  <Part key={i} draft={late} order={next()} delay={100 + i * 40} className="h-7 w-16 rounded-full" />
                ))}
              </div>
            </div>
          </div>
        </SectionBeam>

        {/* Streaming Links Container */}
        <SectionBeam blueprint={blueprint} section="links">
          <div {...draftProps(early, next(), 0, 'p-4 sm:p-5 card-ink relative z-10')}>
            <Part draft={early} order={next()} delay={150} line className="h-5 w-24 mx-auto mb-4" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Part
                  key={i}
                  draft={early}
                  order={next()}
                  delay={LINK_TILE_DELAY_MS + i * LINK_TILE_GAP_MS}
                  className="h-10 rounded-lg"
                />
              ))}
            </div>
          </div>
        </SectionBeam>

        {/* Support Us placeholder */}
        <div className="flex items-center justify-between gap-4">
          <Part draft={late} order={next()} delay={220} line className="h-4 w-40" />
          <Part draft={late} order={next()} delay={260} className="h-9 w-20 rounded-lg" />
        </div>

        {/* Report Button */}
        <div>
          <Part draft={late} order={next()} delay={300} className="w-40 h-12 rounded-lg mx-auto" />
        </div>
      </div>
    </div>
  );
};
