import { useState, useEffect, useRef, useCallback } from 'react';

export type ContentType = 'track' | 'album' | 'artist' | 'playlist';

export interface SimulationConfig {
  contentType: ContentType;
  estimatedCount?: number;
  baseDelay?: number;
}

export interface ProgressState {
  currentStep: number;
  totalSteps: number;
  elapsedTime: number;
  showSteps: boolean;
  showTrackList: boolean;
  showTimer: boolean;
  showBackgroundOption: boolean;
  matchedCount: number;
  isComplete: boolean;
  currentStepName: string;
  statusMessage: string;
}

const STEP_CONFIGS = {
  track: [
    { name: 'Finding track', duration: 800 },
    { name: 'Verifying match', duration: 600 },
    { name: 'Adding to library', duration: 400 }
  ],
  album: [
    { name: 'Loading album', duration: 700 },
    { name: 'Matching tracks', duration: 1200 },
    { name: 'Adding to library', duration: 500 }
  ],
  artist: [
    { name: 'Finding artist', duration: 900 },
    { name: 'Loading catalog', duration: 1500 },
    { name: 'Setting up profile', duration: 800 }
  ],
  playlist: [
    { name: 'Analyzing playlist', duration: 800 },
    { name: 'Matching tracks', duration: 2000 },
    { name: 'Creating playlist', duration: 700 },
    { name: 'Finalizing', duration: 500 }
  ]
};

export const useSimulatedProgress = (
  config: SimulationConfig,
  onComplete?: () => void
) => {
  const { contentType, estimatedCount = 10, baseDelay = 400 } = config;
  
  const [state, setState] = useState<ProgressState>({
    currentStep: 0,
    totalSteps: STEP_CONFIGS[contentType].length,
    elapsedTime: 0,
    showSteps: false,
    showTrackList: false,
    showTimer: false,
    showBackgroundOption: false,
    matchedCount: 0,
    isComplete: false,
    currentStepName: '',
    statusMessage: `Converting ${contentType}...`
  });

  const startTimeRef = useRef<number>(Date.now());
  const stepTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const elapsedIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const trackMatchingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Calculate estimated total duration based on content type
  const getEstimatedDuration = useCallback(() => {
    const baseStepTime = STEP_CONFIGS[contentType].reduce((sum, step) => sum + step.duration, 0);
    
    if (contentType === 'playlist') {
      return baseStepTime + (estimatedCount * 150); // ~150ms per track
    }
    if (contentType === 'album') {
      return baseStepTime + (Math.min(estimatedCount, 15) * 100); // ~100ms per track, max 15
    }
    
    return baseStepTime;
  }, [contentType, estimatedCount]);

  // Simulate track matching progress for playlists/albums
  const simulateTrackMatching = useCallback(() => {
    if (contentType !== 'playlist' && contentType !== 'album') return;
    
    const matchingInterval = setInterval(() => {
      setState(prev => {
        if (prev.matchedCount >= estimatedCount || prev.currentStep >= prev.totalSteps - 1) {
          clearInterval(matchingInterval);
          return prev;
        }
        
        // Simulate realistic matching progress with some randomness
        const increment = Math.random() > 0.3 ? 1 : Math.random() > 0.7 ? 2 : 0;
        const newCount = Math.min(prev.matchedCount + increment, estimatedCount);
        
        return {
          ...prev,
          matchedCount: newCount,
          statusMessage: contentType === 'playlist' 
            ? `Matched ${newCount} / ${estimatedCount} tracks`
            : `Matching tracks (${newCount}/${estimatedCount})`
        };
      });
    }, 200 + Math.random() * 300); // 200-500ms per track
    
    trackMatchingIntervalRef.current = matchingInterval;
  }, [contentType, estimatedCount]);

  // Advance to next step
  const advanceStep = useCallback(() => {
    setState(prev => {
      const nextStep = prev.currentStep + 1;
      const steps = STEP_CONFIGS[contentType];
      
      if (nextStep >= steps.length) {
        // Simulation complete
        onComplete?.();
        return {
          ...prev,
          currentStep: nextStep,
          isComplete: true,
          statusMessage: 'Conversion complete!'
        };
      }
      
      const currentStepConfig = steps[nextStep];
      
      // Schedule next step advancement
      stepTimeoutRef.current = setTimeout(() => {
        advanceStep();
      }, currentStepConfig.duration);
      
      return {
        ...prev,
        currentStep: nextStep,
        currentStepName: currentStepConfig.name,
        statusMessage: currentStepConfig.name + '...'
      };
    });
  }, [contentType, onComplete]);

  // Start simulation
  useEffect(() => {
    startTimeRef.current = Date.now();
    
    // Update elapsed time every second
    const elapsedInterval = setInterval(() => {
      setState(prev => ({
        ...prev,
        elapsedTime: Math.floor((Date.now() - startTimeRef.current) / 1000)
      }));
    }, 1000);
    elapsedIntervalRef.current = elapsedInterval;

    // Progressive disclosure timeline
    const timeouts: NodeJS.Timeout[] = [];

    // 400ms: Show initial skeleton
    timeouts.push(setTimeout(() => {
      setState(prev => ({ ...prev, statusMessage: `Converting ${contentType}...` }));
    }, baseDelay));

    // 1s: Show step progress
    timeouts.push(setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        showSteps: true,
        currentStepName: STEP_CONFIGS[contentType][0].name,
        statusMessage: STEP_CONFIGS[contentType][0].name + '...'
      }));
      
      // Start first step
      stepTimeoutRef.current = setTimeout(() => {
        advanceStep();
      }, STEP_CONFIGS[contentType][0].duration);
      
    }, 1000));

    // 2s: Show track list for playlists/albums
    if (contentType === 'playlist' || contentType === 'album') {
      timeouts.push(setTimeout(() => {
        setState(prev => ({ ...prev, showTrackList: true }));
        simulateTrackMatching();
      }, 2000));
    }

    // 3s: Show timer
    timeouts.push(setTimeout(() => {
      setState(prev => ({ ...prev, showTimer: true }));
    }, 3000));

    // 5s: Show background option
    timeouts.push(setTimeout(() => {
      setState(prev => ({ ...prev, showBackgroundOption: true }));
    }, 5000));

    return () => {
      // Cleanup all timeouts and intervals
      timeouts.forEach(clearTimeout);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (elapsedIntervalRef.current) clearInterval(elapsedIntervalRef.current);
      if (trackMatchingIntervalRef.current) clearInterval(trackMatchingIntervalRef.current);
    };
  }, [contentType, baseDelay, advanceStep, simulateTrackMatching]);

  return {
    ...state,
    estimatedDuration: getEstimatedDuration(),
    steps: STEP_CONFIGS[contentType]
  };
};