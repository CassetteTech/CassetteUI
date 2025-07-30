'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useSimulatedProgress } from '@/hooks/use-simulated-progress';
import { detectContentType } from '@/utils/content-type-detection';
import { ConversionSteps } from './conversion-steps';
import { TrackMatchingList } from './track-matching-list';
import { ConversionTimer } from './conversion-timer';
import { BackgroundOption } from './background-option';

interface ConversionProgressProps {
  url: string;
  metadata?: Record<string, unknown> | null;
  onComplete: () => void;
  onBackgroundMode?: () => void;
  onCancel?: () => void;
  isDesktop?: boolean;
}

export const ConversionProgress: React.FC<ConversionProgressProps> = ({
  url,
  metadata,
  onComplete,
  onBackgroundMode,
  onCancel,
  isDesktop = false
}) => {
  const [backgroundMode, setBackgroundMode] = useState(false);
  const [showWaveform, setShowWaveform] = useState(false);
  
  // Detect content type and get simulation config
  const contentInfo = detectContentType(url, metadata);
  const simulationConfig = {
    contentType: contentInfo.type,
    estimatedCount: contentInfo.estimatedCount,
    baseDelay: 400
  };

  // Run simulation
  const progressState = useSimulatedProgress(simulationConfig, onComplete);

  // Show waveform animation after 1.5s
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWaveform(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleBackgroundMode = () => {
    setBackgroundMode(true);
    onBackgroundMode?.();
  };

  const handleContinueWaiting = () => {
    // Just close the background option for now
  };

  // If in background mode, show minimal UI
  if (backgroundMode) {
    return (
      <div className="fixed top-4 right-4 z-50 bg-background border border-border rounded-lg p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
          <span className="text-xs text-muted-foreground">
            Converting in background...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-muted/50 via-muted/30 to-background" />
      
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
              className="object-contain"
            />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-lg font-bold text-foreground font-atkinson">
              Converting
            </h1>
            <p className="text-sm text-muted-foreground">
              {progressState.statusMessage}
            </p>
          </div>
        </div>

        {/* Waveform Animation */}
        {showWaveform && (
          <div className="flex items-center justify-center space-x-1">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className="w-1 bg-primary rounded-full animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: `${0.5 + Math.random() * 0.5}s`
                }}
              />
            ))}
          </div>
        )}

        {/* Step Progress */}
        {progressState.showSteps && (
          <ConversionSteps
            steps={progressState.steps}
            currentStep={progressState.currentStep}
            contentType={contentInfo.type}
            className="w-full max-w-2xl"
          />
        )}

        {/* Track Matching List */}
        {progressState.showTrackList && (
          <TrackMatchingList
            matchedCount={progressState.matchedCount}
            totalCount={contentInfo.estimatedCount}
            contentType={contentInfo.type}
            className="w-full"
          />
        )}

        {/* Timer */}
        {progressState.showTimer && (
          <ConversionTimer
            elapsedTime={progressState.elapsedTime}
            estimatedDuration={progressState.estimatedDuration}
            contentType={contentInfo.type}
            className="w-full max-w-xs"
          />
        )}

        {/* Background Option */}
        {progressState.showBackgroundOption && !progressState.isComplete && (
          <BackgroundOption
            onContinueWaiting={handleContinueWaiting}
            onRunInBackground={handleBackgroundMode}
            onCancel={onCancel}
            elapsedTime={progressState.elapsedTime}
            className="w-full max-w-md"
          />
        )}

        {/* Debug info in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 p-2 rounded border">
            <div>Type: {contentInfo.type}</div>
            <div>Count: {contentInfo.estimatedCount}</div>
            <div>Step: {progressState.currentStep}/{progressState.totalSteps}</div>
            <div>Matched: {progressState.matchedCount}</div>
            <div>Elapsed: {progressState.elapsedTime}s</div>
          </div>
        )}
      </div>
    </div>
  );
};