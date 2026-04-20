'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { BackButton } from '@/components/ui/back-button';
import { Skeleton } from '@/components/ui/skeleton';
import { useSimulatedProgress } from '@/hooks/use-simulated-progress';
import { detectContentType } from '@/utils/content-type-detection';
import { ConversionSteps } from './conversion-steps';

interface UnifiedConversionSkeletonProps {
  url: string;
  metadata?: Record<string, unknown> | null;
  onComplete: () => void;
  onCancel?: () => void;
  isDesktop: boolean;
  apiComplete: boolean;
}

/**
 * UnifiedConversionSkeleton - Loading skeleton with progress overlay for link conversion
 *
 * Layout matches EntitySkeleton exactly to ensure seamless transitions.
 * The progress overlay is shown on top of the artwork during conversion.
 */
export const UnifiedConversionSkeleton: React.FC<UnifiedConversionSkeletonProps> = ({
  url,
  metadata,
  onComplete,
  onCancel,
  isDesktop,
  apiComplete
}) => {
  const contentInfo = detectContentType(url, metadata);
  const simulationConfig = {
    contentType: contentInfo.type,
    estimatedCount: contentInfo.estimatedCount
  };

  const progressState = useSimulatedProgress(simulationConfig, onComplete, apiComplete);
  const progressPercent = Math.max(6, Math.min(100, Math.round(progressState.progress)));

  return (
    <div className="min-h-screen relative">
      {/* Background matching EntitySkeleton */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />

      <div className="relative z-10 min-h-screen">
        {isDesktop ? (
          <DesktopLayout
            progressState={progressState}
            progressPercent={progressPercent}
            contentInfo={contentInfo}
            showProgress={!apiComplete}
            onCancel={onCancel}
          />
        ) : (
          <MobileLayout
            progressState={progressState}
            progressPercent={progressPercent}
            contentInfo={contentInfo}
            showProgress={!apiComplete}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  );
};

interface LayoutProps {
  progressState: ReturnType<typeof useSimulatedProgress>;
  progressPercent: number;
  contentInfo: ReturnType<typeof detectContentType>;
  showProgress: boolean;
  onCancel?: () => void;
}

/**
 * The inner overlay shown on top of the artwork skeleton while the conversion
 * API is in flight. Desktop uses a circular SVG progress ring around the logo;
 * mobile falls back to a compact linear bar to keep vertical space usable.
 *
 * All animation work is visual — the percentage and step name are driven by
 * useSimulatedProgress, which is untouched.
 */
interface ConversionOverlayProps {
  progressPercent: number;
  currentStepName: string;
  variant: 'desktop' | 'mobile';
}

const ConversionOverlay: React.FC<ConversionOverlayProps> = ({
  progressPercent,
  currentStepName,
  variant
}) => {
  const isDesktop = variant === 'desktop';
  const eqBarCount = isDesktop ? 9 : 7;
  const eqMaxHeight = isDesktop ? 28 : 20;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center backdrop-blur-md">
      {/* Layered radial glow background — matches the glass surface treatment elsewhere */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, hsl(var(--background) / 0.55) 0%, hsl(var(--background) / 0.82) 60%, hsl(var(--background) / 0.92) 100%)'
        }}
      />
      {/* Slow-rotating conic primary ring — sits on the overlay, not outside the artwork */}
      <div
        aria-hidden
        className="absolute inset-4 rounded-full opacity-40 animate-ring-rotate"
        style={{
          background:
            'conic-gradient(from 0deg, hsl(var(--primary) / 0) 0deg, hsl(var(--primary) / 0.35) 90deg, hsl(var(--primary) / 0) 220deg, hsl(var(--primary) / 0.25) 330deg, hsl(var(--primary) / 0) 360deg)',
          WebkitMaskImage:
            'radial-gradient(circle, transparent 58%, black 60%, black 66%, transparent 68%)',
          maskImage:
            'radial-gradient(circle, transparent 58%, black 60%, black 66%, transparent 68%)'
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full px-6">
        {isDesktop ? (
          <CircularProgress percent={progressPercent} />
        ) : (
          <Image
            src="/images/cassette_logo.png"
            alt="Cassette Logo"
            width={40}
            height={40}
            className="object-contain animate-pulse mb-3"
          />
        )}

        {/* Equalizer bars */}
        <div
          className="flex items-end justify-center gap-[3px] mt-4"
          style={{ height: eqMaxHeight + 4 }}
        >
          {Array.from({ length: eqBarCount }).map((_, i) => {
            const baseScale = 0.35 + ((i * 37) % 55) / 100;
            return (
              <span
                key={i}
                className="w-[3px] rounded-full bg-gradient-to-t from-primary/70 to-primary animate-eq-dance"
                style={{
                  height: `${Math.round(eqMaxHeight * baseScale + 6)}px`,
                  animationDelay: `${i * 0.08}s`,
                  animationDuration: `${1.1 + (i % 3) * 0.15}s`
                }}
              />
            );
          })}
        </div>

        {/* Step label — crossfades when currentStepName changes */}
        <div className="h-6 w-full flex items-center justify-center mt-3 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.p
              key={currentStepName}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="text-xs font-medium text-foreground/90 text-center truncate px-3"
            >
              {currentStepName || 'Preparing...'}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Percent readout */}
        <p className="text-[10px] font-mono tabular-nums tracking-widest text-muted-foreground/80 mt-1">
          {progressPercent}%
        </p>

        {/* Mobile linear bar fallback */}
        {!isDesktop && (
          <div className="w-3/4 mt-3 h-1.5 rounded-full bg-muted/50 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: '6%' }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * SVG circular progress ring wrapped around the Cassette logo.
 *
 * strokeDasharray / strokeDashoffset technique: we set dasharray to the
 * circumference and animate dashoffset from full-circumference (empty) to
 * zero (full). Framer-motion animates the offset value numerically.
 */
const CircularProgress: React.FC<{ percent: number }> = ({ percent }) => {
  const size = 120;
  const stroke = 4;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted) / 0.5)"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={false}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src="/images/cassette_logo.png"
          alt="Cassette Logo"
          width={44}
          height={44}
          className="object-contain animate-pulse"
        />
      </div>
    </div>
  );
};

/**
 * Desktop layout - matches EntitySkeleton desktop layout exactly
 * Layout structure mirrors PostClientPage desktop track/artist layout
 */
const DesktopLayout: React.FC<LayoutProps> = ({ progressState, progressPercent, contentInfo, showProgress, onCancel }) => {
  return (
    <div className="mt-16">
      {/* Header Toolbar - matches EntitySkeleton desktop header position */}
      <div className="pt-4 pb-6 px-3 relative z-20 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={onCancel} fallbackRoute="/explore" />
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="px-8 max-w-7xl mx-auto pb-8">
        <div className="flex gap-12">
          {/* Left Column - Artwork (flex: 2) - matches EntitySkeleton sticky layout */}
          <div className="flex-[2] sticky top-[120px] self-start">
            <div className="flex flex-col items-center min-w-0 h-[calc(100vh-140px)] justify-center">
              {/* Type Badge */}
              <Skeleton className="h-6 w-20 mb-6" />

              {/* Artwork Area with Progress Overlay - matches EntitySkeleton 360x360 */}
              <div className="relative mb-6">
                <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />

                <Skeleton className="relative w-[360px] h-[360px] rounded-xl" />

                {/* Progress Overlay - fades out when API completes */}
                <AnimatePresence>
                  {showProgress && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="absolute inset-0 rounded-xl overflow-hidden"
                    >
                      <ConversionOverlay
                        progressPercent={progressPercent}
                        currentStepName={progressState.currentStepName}
                        variant="desktop"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column - Content (flex: 3) */}
          <div className="flex-[3]">
            <div className="py-8 pb-16 min-h-[calc(100vh-140px)] flex flex-col justify-center">
              <div className="space-y-6">
                {/* Steps Progress - only show while converting */}
                <AnimatePresence>
                  {showProgress && progressState.showSteps && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <ConversionSteps
                        steps={progressState.steps}
                        currentStep={progressState.currentStep}
                        contentType={contentInfo.type}
                        className="mb-6"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Track Information Card Skeleton */}
                <div className="p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48 mx-auto" />
                    <Skeleton className="h-4 w-32 mx-auto" />
                    <div className="border-t border-border/30 mx-4" />
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
                      <Skeleton className="h-4 w-24" />
                      <span className="text-muted-foreground">•</span>
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <div className="border-t border-border/30 mx-4" />
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-6 w-16 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Streaming Links Skeleton */}
                <div className="p-5 bg-card/50 rounded-2xl border border-border shadow-sm backdrop-blur-sm relative z-10">
                  <Skeleton className="h-5 w-24 mb-4" />
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <Skeleton key={i} className="h-12 rounded-lg" />
                    ))}
                  </div>
                </div>

                {/* Support Us placeholder */}
                <div className="flex items-center justify-between gap-4">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-20 rounded-lg" />
                </div>

                {/* Report Button Skeleton */}
                <div className="flex justify-center">
                  <Skeleton className="w-40 h-10 rounded-lg" />
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
 * Mobile layout - matches EntitySkeleton mobile layout exactly
 * Layout structure mirrors PostClientPage mobile layout
 */
const MobileLayout: React.FC<LayoutProps> = ({ progressState, progressPercent, contentInfo, showProgress, onCancel }) => {
  return (
    <div className="px-4 sm:px-8 md:px-12 pb-8 mt-16 max-w-lg mx-auto">
      {/* Header Toolbar - inside the main container, matching EntitySkeleton */}
      <div className="pt-4 pb-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <BackButton onClick={onCancel} fallbackRoute="/explore" />
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="text-center space-y-6">
        {/* Element Type - matches EntitySkeleton structure */}
        <div>
          <Skeleton className="h-5 w-16 mx-auto mb-8" />
        </div>

        {/* Artwork Area with Progress Overlay */}
        <div>
          <div className="relative inline-block">
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />

            {/* Skeleton - matches EntitySkeleton 280px/320px */}
            <Skeleton className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] rounded-xl" />

            {/* Progress Overlay - fades out when API completes */}
            <AnimatePresence>
              {showProgress && (
                <motion.div
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0 rounded-xl overflow-hidden"
                >
                  <ConversionOverlay
                    progressPercent={progressPercent}
                    currentStepName={progressState.currentStepName}
                    variant="mobile"
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Steps Progress - only show while converting */}
        <AnimatePresence>
          {showProgress && progressState.showSteps && (
            <motion.div
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ConversionSteps
                steps={progressState.steps}
                currentStep={progressState.currentStep}
                contentType={contentInfo.type}
                className="mb-6"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Track Information Card - Mobile */}
        <div className="p-6 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
          <div className="space-y-4">
            {/* Title */}
            <Skeleton className="h-7 w-48 mx-auto" />

            {/* Artist */}
            <Skeleton className="h-4 w-32 mx-auto" />

            {/* Separator */}
            <div className="border-t border-border/30" />

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap justify-center gap-3">
                <Skeleton className="h-4 w-24" />
                <span className="text-muted-foreground">•</span>
                <Skeleton className="h-4 w-28" />
              </div>
            </div>

            {/* Genres */}
            <div className="border-t border-border/30" />
            <div className="flex flex-wrap gap-2 justify-center">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-7 w-16 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        {/* Streaming Links Container */}
        <div className="p-6 bg-card/50 rounded-2xl border border-border/30 shadow-sm backdrop-blur-sm relative z-10">
          <Skeleton className="h-5 w-24 mx-auto mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Support Us placeholder */}
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-9 w-20 rounded-lg" />
        </div>

        {/* Report Button */}
        <div>
          <Skeleton className="w-40 h-12 rounded-lg mx-auto" />
        </div>
      </div>
    </div>
  );
};
