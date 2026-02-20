'use client';

import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface EntitySkeletonProps {
  isDesktop?: boolean;
  /** Show progress overlay on artwork (for conversion flow) */
  showProgress?: boolean;
  /** Progress percentage (0-100) */
  progressPercent?: number;
  /** Current step name to display */
  progressStepName?: string;
  /** Callback when back button is clicked */
  onCancel?: () => void;
}

/**
 * EntitySkeleton - Unified loading skeleton for the post page
 *
 * Used for both direct post loading AND link conversion.
 * The progress overlay is shown during conversion, then fades out.
 * This ensures ONE skeleton throughout the entire loading flow.
 */
export const EntitySkeleton: React.FC<EntitySkeletonProps> = ({
  isDesktop,
  showProgress = false,
  progressPercent = 0,
  progressStepName,
  onCancel
}) => {
  // When isDesktop is undefined (e.g., SSR/Suspense), show both layouts and let CSS handle it
  const showDesktop = isDesktop === undefined ? true : isDesktop;
  const showMobile = isDesktop === undefined ? true : !isDesktop;

  return (
    <div className="min-h-screen relative">
      {/* Background with skeleton gradient */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />

      <div className="relative z-10 min-h-screen">
        {/* Desktop Layout - hidden on mobile via CSS */}
        {showDesktop && (
          <div className={`${isDesktop === undefined ? 'hidden lg:block' : ''}`}>
            <DesktopSkeleton
              showProgress={showProgress}
              progressPercent={progressPercent}
              progressStepName={progressStepName}
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
              onCancel={onCancel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

interface SkeletonLayoutProps {
  showProgress?: boolean;
  progressPercent?: number;
  progressStepName?: string;
  onCancel?: () => void;
}

/**
 * Progress overlay component for artwork
 */
const ProgressOverlay: React.FC<{
  show: boolean;
  percent: number;
  stepName?: string;
  size?: 'desktop' | 'mobile';
}> = ({ show, percent, stepName, size = 'desktop' }) => {
  const logoSize = size === 'desktop' ? 48 : 40;
  const barHeight = size === 'desktop' ? 'h-2' : 'h-1.5';
  const waveHeights = size === 'desktop' ? [12, 24, 32, 20, 16] : [10, 20, 26, 16, 12];

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm rounded-xl"
        >
          {/* Logo */}
          <Image
            src="/images/cassette_logo.png"
            alt="Cassette Logo"
            width={logoSize}
            height={logoSize}
            className="object-contain animate-pulse mb-4"
          />

          {/* Waveform */}
          <div className="flex items-center justify-center space-x-1 h-8 mb-4">
            {waveHeights.map((baseHeight, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full"
                style={{
                  height: `${baseHeight}px`,
                  animation: `waveform-pulse 1.5s ease-in-out infinite`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>

          {/* Progress Bar */}
          <div className="w-3/4 space-y-2">
            <div className={`${barHeight} rounded-full bg-muted/40 overflow-hidden`}>
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '6%' }}
                animate={{ width: `${Math.max(6, percent)}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' }}
              />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {stepName || 'Preparing...'}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Desktop skeleton layout - matches PostClientPage desktop track/artist layout exactly
 */
const DesktopSkeleton: React.FC<SkeletonLayoutProps> = ({
  showProgress,
  progressPercent,
  progressStepName,
  onCancel
}) => {
  return (
    <div className="mt-16">
      {/* Header Toolbar - matches PostClientPage desktop header position */}
      <div className="pt-4 pb-6 px-3 relative z-20 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
            onClick={onCancel}
          >
            <Image
              src="/images/ic_back.png"
              alt="Back"
              width={16}
              height={16}
              className="object-contain"
            />
          </button>
          <Skeleton className="h-9 w-28 rounded-full" />
        </div>
      </div>

      <div className="px-8 max-w-7xl mx-auto pb-8">
        <div className="flex gap-12">
          {/* Left Column - Artwork (flex: 2) - matches PostClientPage sticky layout */}
          <div className="flex-[2] sticky top-[120px] self-start">
            <div className="flex flex-col items-center min-w-0 h-[calc(100vh-140px)] justify-center">
              {/* Type Badge */}
              <Skeleton className="h-6 w-20 mb-6" />

              {/* Album Art with Shadow - matches PostClientPage 360x360 */}
              <div className="relative mb-6">
                <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
                <Skeleton className="relative w-[360px] h-[360px] rounded-xl" />

                {/* Progress Overlay */}
                <ProgressOverlay
                  show={showProgress || false}
                  percent={progressPercent || 0}
                  stepName={progressStepName}
                  size="desktop"
                />
              </div>
            </div>
          </div>

          {/* Right Column - Content (flex: 3) */}
          <div className="flex-[3]">
            <div className="py-8 pb-16 min-h-[calc(100vh-140px)] flex flex-col justify-center">
              <div className="space-y-6">
                {/* Track Information Card */}
                <div className="p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
                  <div className="space-y-3">
                    {/* Title */}
                    <Skeleton className="h-6 w-48 mx-auto" />

                    {/* Artist */}
                    <Skeleton className="h-4 w-32 mx-auto" />

                    {/* Separator */}
                    <div className="border-t border-border/30 mx-4" />

                    {/* Metadata - Duration and Album */}
                    <div className="flex flex-wrap justify-center items-center gap-x-4 gap-y-2 text-sm">
                      <Skeleton className="h-4 w-24" />
                      <span className="text-muted-foreground">•</span>
                      <Skeleton className="h-4 w-32" />
                    </div>

                    {/* Genres */}
                    <div className="border-t border-border/30 mx-4" />
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-6 w-16 rounded-full" />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Streaming Links Container */}
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

                {/* Report Button */}
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
 * Mobile skeleton layout - matches PostClientPage mobile layout exactly
 */
const MobileSkeleton: React.FC<SkeletonLayoutProps> = ({
  showProgress,
  progressPercent,
  progressStepName,
  onCancel
}) => {
  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 mt-16 max-w-lg mx-auto">
      {/* Header Toolbar - inside the main container, matching PostClientPage */}
      <div className="pt-4 pb-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center justify-between gap-3">
          <button
            className="flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity"
            onClick={onCancel}
          >
            <Image
              src="/images/ic_back.png"
              alt="Back"
              width={16}
              height={16}
              className="object-contain"
            />
          </button>
          <Skeleton className="h-9 w-20 rounded-full" />
        </div>
      </div>

      <div className="text-center space-y-4 sm:space-y-6">
        {/* Element Type - matches PostClientPage structure */}
        <div>
          <Skeleton className="h-5 w-16 mx-auto mb-4 sm:mb-6" />
        </div>

        {/* Album Art Container - matches PostClientPage dimensions */}
        <div>
          <div className="relative inline-block">
            <div className="absolute inset-0 translate-x-3 translate-y-3 bg-black/25 rounded-xl blur-lg" />
            <Skeleton className="relative w-[220px] h-[220px] sm:w-[280px] sm:h-[280px] rounded-xl" />

            {/* Progress Overlay */}
            <ProgressOverlay
              show={showProgress || false}
              percent={progressPercent || 0}
              stepName={progressStepName}
              size="mobile"
            />
          </div>
        </div>

        {/* Track Information Card - Mobile */}
        <div className="p-4 sm:p-5 bg-card/40 rounded-xl border border-border/50 backdrop-blur-sm">
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
        <div className="p-4 sm:p-5 bg-card/50 rounded-2xl border border-border/30 shadow-sm backdrop-blur-sm relative z-10">
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