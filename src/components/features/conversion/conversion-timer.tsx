import React from 'react';
import { ContentType } from '@/hooks/use-simulated-progress';

interface ConversionTimerProps {
  elapsedTime: number;
  estimatedDuration: number;
  contentType: ContentType;
  className?: string;
}

export const ConversionTimer: React.FC<ConversionTimerProps> = ({
  elapsedTime,
  estimatedDuration,
  contentType,
  className = ''
}) => {
  const remainingTime = Math.max(0, Math.floor(estimatedDuration / 1000) - elapsedTime);
  const progress = Math.min(100, (elapsedTime / (estimatedDuration / 1000)) * 100);
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getEstimateText = () => {
    if (elapsedTime > estimatedDuration / 1000) {
      return 'Taking longer than usual...';
    }
    
    if (remainingTime <= 1) {
      return 'Almost done...';
    }
    
    return `About ${formatTime(remainingTime)} remaining`;
  };

  const getContextMessage = () => {
    switch (contentType) {
      case 'playlist':
        return 'Large playlists may take longer';
      case 'album':
        return 'Matching album tracks';
      case 'artist':
        return 'Loading artist catalog';
      case 'track':
        return 'Verifying track match';
      default:
        return 'Processing content';
    }
  };

  return (
    <div className={`text-center space-y-2 ${className}`}>
      {/* Elapsed time */}
      <div className="text-sm text-muted-foreground">
        Elapsed: {formatTime(elapsedTime)}
      </div>
      
      {/* Progress indicator */}
      <div className="w-full max-w-xs mx-auto">
        <div className="h-1 bg-border rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary transition-all duration-1000 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      {/* Estimate */}
      <div className="text-xs font-medium text-foreground">
        {getEstimateText()}
      </div>
      
      {/* Context message */}
      <div className="text-xs text-muted-foreground">
        {getContextMessage()}
      </div>
      
      {/* Long wait message */}
      {elapsedTime > 8 && (
        <div className="text-xs text-warning mt-2 p-2 bg-warning/10 rounded-md border border-warning/20">
          Waiting on music service rate limits
        </div>
      )}
    </div>
  );
};