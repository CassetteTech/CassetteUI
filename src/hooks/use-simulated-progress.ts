import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export type ContentType = 'track' | 'album' | 'artist' | 'playlist';

export interface SimulationConfig {
  contentType: ContentType;
  estimatedCount?: number;
  baseDelay?: number;
}

export interface ProgressState {
  currentStep: number;
  totalSteps: number;
  showSteps: boolean;
  showTrackList: boolean;
  matchedCount: number;
  isComplete: boolean;
  currentStepName: string;
  statusMessage: string;
  isWaitingForApi: boolean;
  progress: number;
  elapsedMs: number;
  estimatedTotalMs: number;
}

const STEP_CONFIGS: Record<ContentType, Array<{ name: string; duration: number }>> = {
  track: [
    { name: 'Analyzing your link', duration: 1000 },
    { name: 'Matching streaming services', duration: 1700 },
    { name: 'Building your smart link', duration: 1200 }
  ],
  album: [
    { name: 'Analyzing album details', duration: 1100 },
    { name: 'Matching streaming services', duration: 1900 },
    { name: 'Arranging track list', duration: 1400 }
  ],
  artist: [
    { name: 'Finding artist profile', duration: 1000 },
    { name: 'Collecting releases', duration: 1900 },
    { name: 'Building your smart link', duration: 1300 }
  ],
  playlist: [
    { name: 'Analyzing playlist', duration: 1300 },
    { name: 'Matching tracks', duration: 2400 },
    { name: 'Syncing artwork', duration: 1500 },
    { name: 'Getting things ready', duration: 1300 }
  ]
};

export const useSimulatedProgress = (
  config: SimulationConfig,
  onComplete?: () => void,
  apiComplete?: boolean
) => {
  const { contentType, estimatedCount = 10, baseDelay = 100 } = config;
  const totalPlannedDuration = useMemo(
    () => STEP_CONFIGS[contentType].reduce((total, step) => total + step.duration, 0),
    [contentType]
  );
  const firstStep = STEP_CONFIGS[contentType][0];

  const [state, setState] = useState<ProgressState>({
    currentStep: 0,
    totalSteps: STEP_CONFIGS[contentType].length,
    showSteps: true, // Show steps immediately
    showTrackList: false,
    matchedCount: 0,
    isComplete: false,
    currentStepName: firstStep.name,
    statusMessage: `${firstStep.name}...`,
    isWaitingForApi: true,
    progress: 6,
    elapsedMs: 0,
    estimatedTotalMs: totalPlannedDuration
  });

  const stepTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const trackMatchingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const rapidCompletionRef = useRef<boolean>(false);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null);
  const hasShownLongWaitMessageRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Use ref for apiComplete to avoid stale closure issues in scheduled timeouts
  const apiCompleteRef = useRef(apiComplete);
  useEffect(() => {
    apiCompleteRef.current = apiComplete;
  }, [apiComplete]);

  // Track elapsed time and keep the progress bar feeling alive
  useEffect(() => {
    startTimeRef.current = performance.now();
    setState(prev => (
      prev.estimatedTotalMs === totalPlannedDuration
        ? prev
        : { ...prev, estimatedTotalMs: totalPlannedDuration }
    ));

    const updateProgress = () => {
      const start = startTimeRef.current ?? performance.now();
      const elapsed = performance.now() - start;

      setState(prev => {
        if (prev.isComplete) {
          return { ...prev, elapsedMs: elapsed };
        }

        // Read from ref to get latest value
        const apiDone = apiCompleteRef.current;

        // If API is done, jump to 100%
        if (apiDone) {
          return {
            ...prev,
            elapsedMs: elapsed,
            progress: 100
          };
        }

        // Asymptotic slowdown - progress approaches CEILING but decelerates
        const CEILING = 92;
        const DECAY_FACTOR = 0.0004; // How quickly we slow down

        // Exponential decay: progress = CEILING * (1 - e^(-k*t))
        // This naturally slows down as it approaches the ceiling
        const rawProgress = CEILING * (1 - Math.exp(-DECAY_FACTOR * elapsed));

        // Add micro-variations to keep it feeling alive (subtle oscillation)
        const wobble = Math.sin(elapsed / 500) * 0.3;
        const nextProgress = Math.min(CEILING - 0.5, rawProgress + wobble);

        return {
          ...prev,
          elapsedMs: elapsed,
          progress: nextProgress > prev.progress ? nextProgress : prev.progress
        };
      });
    };

    updateProgress();

    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }

    progressIntervalRef.current = setInterval(updateProgress, 150);

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = undefined;
      }
    };
  }, [totalPlannedDuration]);

  useEffect(() => {
    if (state.isComplete && progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = undefined;
    }
  }, [state.isComplete]);

  // Smart step timing logic - reads from ref to avoid stale closure
  const getStepDelay = useCallback((stepIndex: number, isLastStep: boolean) => {
    const step = STEP_CONFIGS[contentType][stepIndex];
    if (!step) return 0;

    // Read from ref to get latest API status
    const apiDone = apiCompleteRef.current;

    if (apiDone) {
      // When the API is already done we sprint through remaining steps for snappy completion
      return Math.max(120, Math.min(step.duration * 0.35, 240));
    }

    if (isLastStep && !apiDone) {
      // Hold on the final step until the API call finishes
      return null;
    }

    const jitter = Math.min(400, step.duration * 0.25);
    const offset = (Math.random() - 0.5) * 2 * jitter;
    const candidate = step.duration + offset;

    // Never let a step feel too short, even with a negative jitter
    return Math.max(320, candidate);
  }, [contentType]);

  // Simulate track matching progress for playlists only
  const simulateTrackMatching = useCallback(() => {
    if (contentType !== 'playlist') return;
    
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
          statusMessage: `Matched ${newCount} / ${estimatedCount} tracks`
        };
      });
    }, 200 + Math.random() * 300); // 200-500ms per track
    
    trackMatchingIntervalRef.current = matchingInterval;
  }, [contentType, estimatedCount]);

  // Advance to next step - uses refs to avoid stale closures
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
          statusMessage: 'Conversion complete!',
          isWaitingForApi: false
        };
      }

      const currentStepConfig = steps[nextStep];
      const isLastStep = nextStep === steps.length - 1;

      // Read from ref to get latest API status
      const apiDone = apiCompleteRef.current;

      // Don't schedule next step if in rapid completion mode
      if (!rapidCompletionRef.current) {
        const delay = getStepDelay(nextStep, isLastStep);

        if (delay !== null) {
          // Schedule next step advancement
          stepTimeoutRef.current = setTimeout(() => {
            advanceStep();
          }, delay);
        } else {
          // We're on the last step without API response - wait
          console.log('⏸️ Pausing on last step - waiting for API response');
        }
      }

      return {
        ...prev,
        currentStep: nextStep,
        currentStepName: currentStepConfig.name,
        statusMessage: `${currentStepConfig.name}...`,
        isWaitingForApi: !apiDone
      };
    });
  }, [contentType, onComplete, getStepDelay]);

  // Rapid completion when API finishes first
  const enterRapidCompletionMode = useCallback(() => {
    console.log('🏃 Entering rapid completion mode');
    rapidCompletionRef.current = true;
    
    // Clear any existing step timeout
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      console.log('🔄 Cleared existing step timeout');
    }
    
    // Complete remaining steps with 100ms delay each
    setState(prev => {
      const remainingSteps = prev.totalSteps - prev.currentStep;
      console.log(`⚡ Remaining steps to complete: ${remainingSteps}`);
      
      for (let i = 1; i <= remainingSteps; i++) {
        setTimeout(() => {
          console.log(`📝 Advancing step ${i}/${remainingSteps}`);
          advanceStep();
        }, 100 * i); // 0.1 second delay for each step
      }
      
      return prev;
    });
  }, [advanceStep]);

  // Handle API completion
  useEffect(() => {
    if (apiComplete && !state.isComplete) {
      setState(prev => ({ ...prev, isWaitingForApi: false }));
      
      // If we're paused on the last step, complete it now
      if (state.currentStep === state.totalSteps - 1 && !rapidCompletionRef.current) {
        console.log('🎯 API completed on last step - completing in 0.1s');
        setTimeout(() => {
          advanceStep();
        }, 100);
      } else if (!rapidCompletionRef.current) {
        console.log('🚀 API completed, entering rapid completion mode');
        enterRapidCompletionMode();
      }
    }
  }, [apiComplete, state.isComplete, state.currentStep, state.totalSteps, enterRapidCompletionMode, advanceStep]);

  useEffect(() => {
    if (apiComplete) {
      setState(prev => ({
        ...prev,
        progress: 100,
        isWaitingForApi: false,
        statusMessage: prev.isComplete ? prev.statusMessage : 'Finishing up your post...'
      }));
    }
  }, [apiComplete]);

  useEffect(() => {
    if (
      !apiComplete &&
      !state.isComplete &&
      !hasShownLongWaitMessageRef.current &&
      state.elapsedMs > 5000 &&
      (contentType !== 'playlist' || state.matchedCount >= estimatedCount)
    ) {
      hasShownLongWaitMessageRef.current = true;
      setState(prev => ({
        ...prev,
        statusMessage: 'Still working, streaming services are taking a little longer than usual...'
      }));
    }
  }, [apiComplete, state.isComplete, state.elapsedMs, state.matchedCount, contentType, estimatedCount]);

  // Start simulation - runs once on mount, uses refs for mutable state
  useEffect(() => {
    // Prevent re-initialization if already started
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    // Progressive disclosure timeline
    const timeouts: NodeJS.Timeout[] = [];

    // Start first step immediately (after base delay)
    timeouts.push(setTimeout(() => {
      setState(prev => ({
        ...prev,
        statusMessage: STEP_CONFIGS[contentType][0].name + '...'
      }));

      // Start first step with smart timing
      const delay = getStepDelay(0, STEP_CONFIGS[contentType].length === 1);
      if (delay !== null) {
        stepTimeoutRef.current = setTimeout(() => {
          advanceStep();
        }, delay);
      }

    }, baseDelay));

    // 2s: Show track list for playlists only
    if (contentType === 'playlist') {
      timeouts.push(setTimeout(() => {
        setState(prev => ({ ...prev, showTrackList: true }));
        simulateTrackMatching();
      }, 2000));
    }

    return () => {
      // Cleanup all timeouts and intervals
      timeouts.forEach(clearTimeout);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (trackMatchingIntervalRef.current) clearInterval(trackMatchingIntervalRef.current);
      // Reset initialization flag so StrictMode second run works correctly
      hasInitializedRef.current = false;
    };
  }, [contentType, baseDelay, advanceStep, simulateTrackMatching, getStepDelay]);

  return {
    ...state,
    steps: STEP_CONFIGS[contentType]
  };
};
