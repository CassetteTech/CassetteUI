import React from 'react';

interface BackgroundOptionProps {
  onContinueWaiting: () => void;
  onRunInBackground: () => void;
  onCancel?: () => void;
  elapsedTime: number;
  className?: string;
}

export const BackgroundOption: React.FC<BackgroundOptionProps> = ({
  onContinueWaiting,
  onCancel,
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
          Large playlists and rate limits can cause delays.
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
    </div>
  );
};