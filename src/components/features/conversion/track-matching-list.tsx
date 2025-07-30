import React from 'react';
import { ContentType } from '@/hooks/use-simulated-progress';

interface TrackMatchingListProps {
  matchedCount: number;
  totalCount: number;
  contentType: ContentType;
  className?: string;
}

export const TrackMatchingList: React.FC<TrackMatchingListProps> = ({
  matchedCount,
  totalCount,
  contentType,
  className = ''
}) => {
  // Generate fake track names for visual appeal
  const generateTrackName = (index: number) => {
    const trackNames = [
      'Untitled Track', 'New Song', 'Track', 'Unnamed', 'Song',
      'Music Piece', 'Audio Track', 'Recording', 'Melody', 'Tune'
    ];
    return `${trackNames[index % trackNames.length]} ${Math.floor(index / trackNames.length) + 1}`;
  };

  const getTrackStatus = (index: number) => {
    if (index < matchedCount) {
      return 'matched';
    } else if (index === matchedCount && matchedCount < totalCount) {
      return 'searching';
    } else {
      return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'matched':
        return (
          <div className="flex items-center justify-center w-4 h-4 bg-success rounded-full">
            <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
        );
      case 'searching':
        return (
          <div className="flex items-center justify-center w-4 h-4 bg-warning rounded-full">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
          </div>
        );
      default:
        return (
          <div className="w-4 h-4 bg-muted rounded-full"></div>
        );
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'matched':
        return 'Matched ✓';
      case 'searching':
        return 'Searching...';
      default:
        return 'Waiting...';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'matched':
        return 'text-success';
      case 'searching':
        return 'text-warning';
      default:
        return 'text-muted-foreground';
    }
  };

  if (contentType !== 'playlist' && contentType !== 'album') {
    return null;
  }

  return (
    <div className={`w-full max-w-md mx-auto ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-foreground">
          {contentType === 'playlist' ? 'Playlist Tracks' : 'Album Tracks'}
        </h4>
        <span className="text-xs text-muted-foreground">
          {matchedCount} / {totalCount}
        </span>
      </div>

      {/* Track list */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {Array.from({ length: Math.min(totalCount, 8) }, (_, index) => {
          const status = getTrackStatus(index);
          
          return (
            <div
              key={index}
              className={`
                flex items-center gap-3 p-2 rounded-md border transition-all duration-300
                ${status === 'matched' 
                  ? 'bg-success/5 border-success/20' 
                  : status === 'searching'
                    ? 'bg-warning/5 border-warning/20 animate-pulse'
                    : 'bg-muted/5 border-border'
                }
              `}
            >
              {/* Status icon */}
              {getStatusIcon(status)}
              
              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm truncate ${
                    status === 'matched' ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {status === 'pending' ? '•••' : generateTrackName(index)}
                  </span>
                </div>
              </div>
              
              {/* Status text */}
              <span className={`text-xs font-medium ${getStatusColor(status)}`}>
                {getStatusText(status)}
              </span>
            </div>
          );
        })}
        
        {/* Show "and X more" if there are more tracks */}
        {totalCount > 8 && (
          <div className="text-center py-2">
            <span className="text-xs text-muted-foreground">
              and {totalCount - 8} more tracks...
            </span>
          </div>
        )}
      </div>

      {/* Progress summary */}
      <div className="mt-3 text-center">
        <div className="text-sm font-medium text-foreground mb-1">
          {matchedCount === totalCount 
            ? `All ${totalCount} tracks matched!`
            : `Matching ${contentType} tracks...`
          }
        </div>
        <div className="w-full bg-border rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${(matchedCount / totalCount) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};