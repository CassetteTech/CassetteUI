import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { theme } from '../theme';
import { springConfigs } from './shared/springs';

// Demo tracks for the playlist conversion animation
export const DEMO_TRACKS = [
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  { title: 'Hotel California', artist: 'Eagles' },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
  { title: 'Come Together', artist: 'The Beatles' },
  { title: 'Here Comes the Sun', artist: 'The Beatles' },
  { title: 'Sweet Child O Mine', artist: "Guns N' Roses" },
];

type TrackStatus = 'waiting' | 'searching' | 'matched';

interface TrackRowProps {
  title: string;
  artist: string;
  index: number;
  status: TrackStatus;
  frame: number;
  fps: number;
  entranceDelay: number;
}

const TrackRow: React.FC<TrackRowProps> = ({
  title,
  artist,
  index,
  status,
  frame,
  fps,
  entranceDelay,
}) => {
  // Row slides in from right with stagger
  const entranceProgress = spring({
    frame: frame - entranceDelay - index * springConfigs.stagger.fast,
    fps,
    config: springConfigs.smooth,
  });

  const slideX = interpolate(entranceProgress, [0, 1], [60, 0]);
  const opacity = interpolate(entranceProgress, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Status icon animation
  const getStatusIcon = () => {
    switch (status) {
      case 'matched':
        return (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: theme.colors.success,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12L10 17L19 8"
                stroke={theme.colors.white}
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        );
      case 'searching':
        // Pulsing animation for searching
        const pulse = Math.sin(frame * 0.2) * 0.3 + 0.7;
        return (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              backgroundColor: theme.colors.info,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: pulse,
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              style={{
                animation: 'none',
                transform: `rotate(${frame * 8}deg)`,
              }}
            >
              <path
                d="M12 2V6M12 18V22M6 12H2M22 12H18M19.07 4.93L16.24 7.76M7.76 16.24L4.93 19.07M19.07 19.07L16.24 16.24M7.76 7.76L4.93 4.93"
                stroke={theme.colors.white}
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        );
      case 'waiting':
      default:
        return (
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: `2px solid ${theme.colors.gray600}`,
              backgroundColor: 'transparent',
            }}
          />
        );
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'matched':
        return 'Matched';
      case 'searching':
        return 'Searching...';
      case 'waiting':
      default:
        return 'Waiting';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'matched':
        return theme.colors.success;
      case 'searching':
        return theme.colors.info;
      case 'waiting':
      default:
        return theme.colors.gray500;
    }
  };

  // Subtle green tint for matched rows
  const rowBackground =
    status === 'matched'
      ? `${theme.colors.success}10`
      : 'transparent';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '14px 20px',
        borderRadius: 12,
        backgroundColor: rowBackground,
        border: `1px solid ${status === 'matched' ? theme.colors.success + '30' : theme.colors.gray700}`,
        transform: `translateX(${slideX}px)`,
        opacity,
      }}
    >
      {/* Status icon */}
      {getStatusIcon()}

      {/* Track info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 18,
            fontWeight: theme.fontWeights.semibold,
            color: theme.colors.white,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 14,
            color: theme.colors.gray400,
          }}
        >
          {artist}
        </div>
      </div>

      {/* Status text */}
      <div
        style={{
          fontFamily: theme.fonts.atkinson,
          fontSize: 14,
          fontWeight: theme.fontWeights.medium,
          color: getStatusColor(),
          minWidth: 90,
          textAlign: 'right',
        }}
      >
        {getStatusText()}
      </div>
    </div>
  );
};

interface TrackMatchingListProps {
  startFrame?: number;
  totalTracks?: number;
  matchedCount?: number;
}

export const TrackMatchingList: React.FC<TrackMatchingListProps> = ({
  startFrame = 0,
  totalTracks = 47,
  matchedCount: externalMatchedCount,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Calculate which tracks are in which state based on timing
  // Each track takes about 40 frames to transition: wait -> search -> match
  const getTrackStatus = (index: number): TrackStatus => {
    const trackStartFrame = index * 25; // Stagger when each track starts processing
    const trackProgress = adjustedFrame - trackStartFrame;

    if (trackProgress < 0) return 'waiting';
    if (trackProgress < 20) return 'searching';
    return 'matched';
  };

  // Count matched tracks
  const matchedCount = externalMatchedCount ?? DEMO_TRACKS.filter((_, i) => getTrackStatus(i) === 'matched').length;

  // "... and X more tracks" text
  const remainingTracks = totalTracks - DEMO_TRACKS.length;
  const moreTracksOpacity = interpolate(
    adjustedFrame,
    [DEMO_TRACKS.length * springConfigs.stagger.fast + 30, DEMO_TRACKS.length * springConfigs.stagger.fast + 50],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        width: '100%',
        maxWidth: 600,
      }}
    >
      {/* Track rows */}
      {DEMO_TRACKS.map((track, i) => (
        <TrackRow
          key={i}
          title={track.title}
          artist={track.artist}
          index={i}
          status={getTrackStatus(i)}
          frame={adjustedFrame}
          fps={fps}
          entranceDelay={10}
        />
      ))}

      {/* "... and X more tracks" indicator */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          padding: '16px 20px',
          opacity: moreTracksOpacity,
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 4,
          }}
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: theme.colors.gray500,
              }}
            />
          ))}
        </div>
        <span
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 16,
            color: theme.colors.gray400,
          }}
        >
          and {remainingTracks} more tracks
        </span>
      </div>
    </div>
  );
};
