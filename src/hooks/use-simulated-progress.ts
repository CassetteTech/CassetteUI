import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { appLogger } from '@/lib/observability/logger';

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
    showSteps: true,
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
  const rapidCompletionTimeoutsRef = useRef<NodeJS.Timeout[]>([]);
  const progressIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const startTimeRef = useRef<number | null>(null);
  const hasShownLongWaitMessageRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const stateRef = useRef(state);
  // The current step, updated as it advances; the state copy lags by a render.
  const stepRef = useRef(0);

  // Use ref for apiComplete to avoid stale closure issues in scheduled timeouts
  const apiCompleteRef = useRef(apiComplete);
  useEffect(() => {
    apiCompleteRef.current = apiComplete;
  }, [apiComplete]);

  // Callers pass inline callbacks. Read onComplete through a ref so a new
  // callback each render does not restart the step timers.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const clearRapidCompletionTimeouts = useCallback(() => {
    rapidCompletionTimeoutsRef.current.forEach(clearTimeout);
    rapidCompletionTimeoutsRef.current = [];
  }, []);

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

        if (apiDone) {
          return {
            ...prev,
            elapsedMs: elapsed,
            progress: 100
          };
        }

        const CEILING = 92;
        const DECAY_FACTOR = 0.0004;

        const rawProgress = CEILING * (1 - Math.exp(-DECAY_FACTOR * elapsed));

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
    if (state.isComplete) {
      clearRapidCompletionTimeouts();
    }
  }, [state.isComplete, clearRapidCompletionTimeouts]);

  // Smart step timing logic - reads from ref to avoid stale closure
  const getStepDelay = useCallback((stepIndex: number, isLastStep: boolean) => {
    const step = STEP_CONFIGS[contentType][stepIndex];
    if (!step) return 0;

    // Read from ref to get latest API status
    const apiDone = apiCompleteRef.current;

    if (apiDone) {
      return Math.max(120, Math.min(step.duration * 0.35, 240));
    }

    if (isLastStep && !apiDone) {
      return null;
    }

    const jitter = Math.min(400, step.duration * 0.25);
    const offset = (Math.random() - 0.5) * 2 * jitter;
    const candidate = step.duration + offset;

    return Math.max(320, candidate);
  }, [contentType]);

  const simulateTrackMatching = useCallback(() => {
    if (contentType !== 'playlist') return;
    
    const matchingInterval = setInterval(() => {
      setState(prev => {
        if (prev.matchedCount >= estimatedCount || prev.currentStep >= prev.totalSteps - 1) {
          clearInterval(matchingInterval);
          return prev;
        }
        
        const increment = Math.random() > 0.3 ? 1 : Math.random() > 0.7 ? 2 : 0;
        const newCount = Math.min(prev.matchedCount + increment, estimatedCount);
        
        return {
          ...prev,
          matchedCount: newCount,
          statusMessage: `Matched ${newCount} / ${estimatedCount} tracks`
        };
      });
    }, 200 + Math.random() * 300);
    
    trackMatchingIntervalRef.current = matchingInterval;
  }, [contentType, estimatedCount]);

  const advanceStep = useCallback(() => {
    const steps = STEP_CONFIGS[contentType];
    if (stepRef.current >= steps.length) {
      return;
    }

    const nextStep = stepRef.current + 1;
    stepRef.current = nextStep;

    if (nextStep >= steps.length) {
      onCompleteRef.current?.();
      setState(prev => ({
        ...prev,
        currentStep: nextStep,
        isComplete: true,
        statusMessage: 'Conversion complete!',
        isWaitingForApi: false
      }));
      return;
    }

    const currentStepConfig = steps[nextStep];
    const isLastStep = nextStep === steps.length - 1;

    // Read from ref to get latest API status
    const apiDone = apiCompleteRef.current;

    if (!rapidCompletionRef.current) {
      const delay = getStepDelay(nextStep, isLastStep);

      if (delay !== null) {
        stepTimeoutRef.current = setTimeout(() => {
          advanceStep();
        }, delay);
      } else {
        appLogger.debug('conversion_progress_waiting_for_api');
      }
    }

    setState(prev => ({
      ...prev,
      currentStep: nextStep,
      currentStepName: currentStepConfig.name,
      statusMessage: `${currentStepConfig.name}...`,
      isWaitingForApi: !apiDone
    }));
  }, [contentType, getStepDelay]);

  const enterRapidCompletionMode = useCallback(() => {
    appLogger.debug('conversion_progress_rapid_completion_started');
    rapidCompletionRef.current = true;
    clearRapidCompletionTimeouts();
    
    if (stepTimeoutRef.current) {
      clearTimeout(stepTimeoutRef.current);
      stepTimeoutRef.current = undefined;
      appLogger.debug('conversion_progress_step_timeout_cleared');
    }

    const remainingSteps = stateRef.current.totalSteps - stepRef.current;
    appLogger.debug('conversion_progress_remaining_steps', { remaining_steps: remainingSteps });

    for (let i = 1; i <= remainingSteps; i++) {
      const timeout = setTimeout(() => {
        appLogger.debug('conversion_progress_step_advanced', { step: i, remaining_steps: remainingSteps });
        advanceStep();
      }, 100 * i);
      rapidCompletionTimeoutsRef.current.push(timeout);
    }
  }, [advanceStep, clearRapidCompletionTimeouts]);

  useEffect(() => {
    if (apiComplete && !state.isComplete) {
      setState(prev => (
        prev.isWaitingForApi
          ? { ...prev, isWaitingForApi: false }
          : prev
      ));
      
      if (state.currentStep === state.totalSteps - 1 && !rapidCompletionRef.current) {
        appLogger.debug('conversion_progress_api_completed_on_last_step');
        setTimeout(() => {
          advanceStep();
        }, 100);
      } else if (!rapidCompletionRef.current) {
        appLogger.debug('conversion_progress_api_completed');
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

  useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    const timeouts: NodeJS.Timeout[] = [];

    timeouts.push(setTimeout(() => {
      setState(prev => ({
        ...prev,
        statusMessage: STEP_CONFIGS[contentType][0].name + '...'
      }));

      const delay = getStepDelay(0, STEP_CONFIGS[contentType].length === 1);
      if (delay !== null) {
        stepTimeoutRef.current = setTimeout(() => {
          advanceStep();
        }, delay);
      }

    }, baseDelay));

    if (contentType === 'playlist') {
      timeouts.push(setTimeout(() => {
        setState(prev => ({ ...prev, showTrackList: true }));
        simulateTrackMatching();
      }, 2000));
    }

    return () => {
      timeouts.forEach(clearTimeout);
      if (stepTimeoutRef.current) clearTimeout(stepTimeoutRef.current);
      if (trackMatchingIntervalRef.current) clearInterval(trackMatchingIntervalRef.current);
      clearRapidCompletionTimeouts();
      // Reset initialization flag so StrictMode second run works correctly
      hasInitializedRef.current = false;
    };
  }, [contentType, baseDelay, advanceStep, simulateTrackMatching, getStepDelay, clearRapidCompletionTimeouts]);

  return {
    ...state,
    steps: STEP_CONFIGS[contentType]
  };
};
