'use client';

import React from 'react';
import Image from 'next/image';
import { useSimulatedProgress } from '@/hooks/use-simulated-progress';
import { detectContentType } from '@/utils/content-type-detection';
import { ConversionSteps } from './conversion-steps';
import { TrackMatchingList } from './track-matching-list';

interface ConversionProgressProps {
  url: string;
  metadata?: Record<string, unknown> | null;
  onComplete: () => void;
  onCancel?: () => void;
  isDesktop?: boolean;
  apiComplete?: boolean;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  url,
  metadata,
  onComplete,
  onCancel,
  isDesktop = false,
  apiComplete = false
}) => {
  // Detect content type and get simulation config
  const contentInfo = detectContentType(url, metadata);
  const simulationConfig = {
    contentType: contentInfo.type,
    estimatedCount: contentInfo.estimatedCount
  };

  // Run simulation with API completion tracking
  const progressState = useSimulatedProgress(simulationConfig, onComplete, apiComplete);

  const typeLabel = contentInfo.type.charAt(0).toUpperCase() + contentInfo.type.slice(1);
  const progressPercent = Math.max(6, Math.min(100, Math.round(progressState.progress)));
  const onFinalStep = progressState.currentStep >= progressState.totalSteps - 1;
  const hasExceededEstimate = progressState.elapsedMs > progressState.estimatedTotalMs + 750;
  const stepLabel = `Step ${Math.min(progressState.currentStep + 1, progressState.totalSteps)} of ${progressState.totalSteps}`;
  const rightLabel = progressState.isComplete
    ? 'Ready to share'
    : progressState.isWaitingForApi && onFinalStep && hasExceededEstimate
      ? 'Waiting for streaming services...'
      : stepLabel;
  const leftLabel = progressState.isComplete
    ? 'Conversion complete'
    : progressState.currentStepName || 'Working on it';



  return (
    <div className="fixed inset-0 z-50">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-muted/20 via-muted/10 to-background/80" />
      
      {/* Header Toolbar */}
      <div className="absolute top-0 left-0 right-0 z-10 pt-4 pb-6 px-3">
        <div className="flex items-center justify-between">
          <button 
            className="flex items-center gap-2 text-foreground"
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
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6 space-y-8">
        
        {/* Logo and Title */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Image
              src="/images/cassette_logo.png"
              alt="Cassette Logo"
              width={isDesktop ? 48 : 40}
              height={isDesktop ? 48 : 40}
              className="object-contain animate-pulse"
            />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-foreground font-atkinson">
              Converting {typeLabel}
            </h1>
            <p className="text-sm text-muted-foreground">
              {progressState.statusMessage}
            </p>
          </div>
        </div>

        {/* Waveform Animation */}
        <div className="flex items-center justify-center space-x-1 h-8">
          {[12, 24, 32, 20, 16].map((baseHeight, i) => (
            <div
              key={i}
              className="w-1 bg-primary rounded-full"
              style={{
                height: `${baseHeight}px`,
                animation: `waveform-pulse 1.5s ease-in-out infinite`,
                animationDelay: `${i * 0.1}s`,
                transformOrigin: 'center'
              }}
            />
          ))}
        </div>

        {/* Progress Bar */}
        <div className="w-full max-w-xl space-y-2">
          <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
            <div
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="h-full bg-primary transition-[width] duration-300 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>{leftLabel}</span>
            <span>{rightLabel}</span>
          </div>
          {!apiComplete && (
            <div className="text-xs text-muted-foreground/80 text-center">
              Most conversions finish in about 1-6 seconds.
            </div>
          )}
        </div>

        {/* Step Progress */}
        {progressState.showSteps && (
          <ConversionSteps
            steps={progressState.steps}
            currentStep={progressState.currentStep}
            contentType={contentInfo.type}
            className="w-full max-w-2xl"
          />
        )}

        {/* Track Matching List - Only for playlists */}
        {progressState.showTrackList && contentInfo.type === 'playlist' && (
          <TrackMatchingList
            matchedCount={progressState.matchedCount}
            totalCount={contentInfo.estimatedCount}
            contentType={contentInfo.type}
            className="w-full"
          />
        )}



        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded border">
            <div>Type: {contentInfo.type}</div>
            <div>Count: {contentInfo.estimatedCount}</div>
            <div>Step: {progressState.currentStep}/{progressState.totalSteps}</div>
            <div>Matched: {progressState.matchedCount}</div>
            <div>Waiting for API: {progressState.isWaitingForApi ? 'Yes' : 'No'}</div>
          </div>
        )}
      </div>
    </div>
  );
};
