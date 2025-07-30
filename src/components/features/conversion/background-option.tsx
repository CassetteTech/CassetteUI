import React from 'react';
import { AnimatedButton } from '@/components/ui/animated-button';

interface BackgroundOptionProps {
  onContinueWaiting: () => void;
  onRunInBackground: () => void;
  onCancel?: () => void;
  elapsedTime: number;
  className?: string;
}

export const BackgroundOption: React.FC<BackgroundOptionProps> = ({
  onContinueWaiting,
  onRunInBackground,
  onCancel,
  elapsedTime,
  className = ''
}) => {
  return (
    <div className={`text-center space-y-4 p-4 bg-muted/5 rounded-lg border border-border ${className}`}>
      {/* Message */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-foreground">
          This is taking longer than expected
        </h4>
        <p className="text-xs text-muted-foreground">
          {elapsedTime > 10 
            ? 'The music service might be experiencing delays. You can continue waiting or run this in the background.'
            : 'Large playlists and rate limits can cause delays. You have options:'
          }
        </p>
      </div>

      {/* Options */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
        {/* Continue waiting */}
        <button
          onClick={onContinueWaiting}
          className="px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-md hover:bg-muted/50 transition-colors"
        >
          Keep waiting
        </button>

        {/* Run in background */}
        <AnimatedButton
          text="Run in background"
          onClick={onRunInBackground}
          height={36}
          width={160}
          initialPos={3}
          colorTop="#1F2327"
          colorBottom="#595C5E"
          borderColorTop="#1F2327"
          borderColorBottom="#1F2327"
          textStyle="text-sm font-medium text-white"
          className="flex-shrink-0"
        />

        {/* Cancel option */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Additional info */}
      <div className="text-xs text-muted-foreground">
        <p>
          💡 Background conversions will notify you when complete
        </p>
      </div>
    </div>
  );
};