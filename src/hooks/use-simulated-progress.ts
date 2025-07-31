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
  showSteps: boolean;
  showTrackList: boolean;
  matchedCount: number;
  isComplete: boolean;
  currentStepName: string;
  statusMessage: string;
  isWaitingForApi: boolean;
}

const STEP_CONFIGS = {
  track: [
    { name: 'Finding track', duration: 800 },
    { name: 'Matching Platforms', duration: 600 },
    { name: 'Generating Smart Link', duration: 400 }
  ],
  album: [
    { name: 'Loading album', duration: 700 },
    { name: 'Matching Platforms', duration: 800 },
    { name: 'Generating Smart Link', duration: 500 }
  ],
  artist: [
    { name: 'Finding artist', duration: 900 },
    { name: 'Matching Platforms', duration: 1500 },
    { name: 'Generating Smart Link', duration: 800 }
  ],
  playlist: [
    { name: 'Analyzing playlist', duration: 800 },
    { name: 'Matching tracks', duration: 2000 },
    { name: 'Generating Smart Link', duration: 700 },
    { name: 'Finalizing', duration: 500 }
  ]
};

export const useSimulatedProgress = (
  config: SimulationConfig,
  onComplete?: () => void,
  apiComplete?: boolean
) => {
  const { contentType, estimatedCount = 10, baseDelay = 100 } = config;
  
  const [state, setState] = useState<ProgressState>({
    currentStep: 0,
    totalSteps: STEP_CONFIGS[contentType].length,
    showSteps: true, // Show steps immediately
    showTrackList: false,
    matchedCount: 0,
    isComplete: false,
    currentStepName: STEP_CONFIGS[contentType][0].name,
    statusMessage: `Converting ${contentType}...`,
    isWaitingForApi: true
  });

  const stepTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const trackMatchingIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const rapidCompletionRef = useRef<boolean>(false);

  // Smart step timing logic
  const getStepDelay = useCallback((isLastStep: boolean, apiComplete: boolean) => {
    if (apiComplete) return Math.random() * 900 + 100; // Random 0.1-1s when API is done
    if (isLastStep && !apiComplete) return null; // Pause on last step without API
    return Math.random() * 2500 + 500; // Random 0.5-3s otherwise
  }, []);

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
          statusMessage: 'Conversion complete!',
          isWaitingForApi: false
        };
      }
      
      const currentStepConfig = steps[nextStep];
      const isLastStep = nextStep === steps.length - 1;
      
      // Don't schedule next step if in rapid completion mode
      if (!rapidCompletionRef.current) {
        const delay = getStepDelay(isLastStep, apiComplete || false);
        
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
        statusMessage: isLastStep && !apiComplete ? 
          'Taking longer than usual...' : 
          currentStepConfig.name + '...',
        isWaitingForApi: !apiComplete
      };
    });
  }, [contentType, onComplete, getStepDelay, apiComplete]);

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

  // Start simulation
  useEffect(() => {
    // Progressive disclosure timeline
    const timeouts: NodeJS.Timeout[] = [];

    // Start first step immediately (after base delay)
    timeouts.push(setTimeout(() => {
      setState(prev => ({ 
        ...prev, 
        statusMessage: STEP_CONFIGS[contentType][0].name + '...'
      }));
      
      // Start first step with smart timing
      const delay = getStepDelay(false, apiComplete || false);
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
    };
  }, [contentType, baseDelay, advanceStep, simulateTrackMatching, getStepDelay, apiComplete]);

  return {
    ...state,
    steps: STEP_CONFIGS[contentType]
  };
};