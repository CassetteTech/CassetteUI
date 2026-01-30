import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';
import { springConfigs } from './shared/springs';

interface PlaylistPostSceneProps {
  startFrame?: number;
}

// Playlist data matching what was converted
const PLAYLIST_DATA = {
  title: 'Summer Vibes 2024',
  trackCount: 47,
  artwork: '#FF6B6B', // Color placeholder - we'll use a gradient
  sourcePlatform: 'Spotify',
};

// Sample tracks to show in the list
const SAMPLE_TRACKS = [
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  { title: 'Hotel California', artist: 'Eagles' },
  { title: 'Stairway to Heaven', artist: 'Led Zeppelin' },
  { title: 'Come Together', artist: 'The Beatles' },
];

export const PlaylistPostScene: React.FC<PlaylistPostSceneProps> = ({
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Card entrance animation
  const cardEntrance = spring({
    frame: adjustedFrame,
    fps,
    config: springConfigs.smooth,
  });

  const cardScale = interpolate(cardEntrance, [0, 1], [0.9, 1]);
  const cardOpacity = interpolate(cardEntrance, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  // Title animation
  const titleOpacity = interpolate(adjustedFrame, [0, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Artwork entrance
  const artworkEntrance = spring({
    frame: adjustedFrame - 15,
    fps,
    config: springConfigs.smooth,
  });

  // Info card entrance
  const infoEntrance = spring({
    frame: adjustedFrame - 30,
    fps,
    config: springConfigs.smooth,
  });

  // Platform buttons staggered entrance
  const platformsStartFrame = 50;

  // Track list entrance
  const tracksStartFrame = 70;

  // Callout entrance
  const calloutEntrance = spring({
    frame: adjustedFrame - 100,
    fps,
    config: springConfigs.smooth,
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 60,
      }}
    >
      {/* Section title */}
      <div
        style={{
          position: 'absolute',
          top: 50,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: titleOpacity,
        }}
      >
        <h2
          style={{
            fontFamily: theme.fonts.teko,
            fontSize: 52,
            fontWeight: theme.fontWeights.bold,
            color: theme.colors.white,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          PLAYLIST CONVERTED
        </h2>
        <p
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 22,
            color: theme.colors.gray400,
            margin: '8px 0 0 0',
          }}
        >
          Ready to share on any platform
        </p>
      </div>

      {/* Main content card */}
      <div
        style={{
          display: 'flex',
          gap: 60,
          alignItems: 'flex-start',
          transform: `scale(${cardScale})`,
          opacity: cardOpacity,
          marginTop: 40,
        }}
      >
        {/* Left side - Artwork and info */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
          }}
        >
          {/* Type label */}
          <div
            style={{
              fontFamily: theme.fonts.teko,
              fontSize: 18,
              fontWeight: theme.fontWeights.bold,
              color: theme.colors.white,
              letterSpacing: 3,
              opacity: interpolate(artworkEntrance, [0, 1], [0, 1]),
            }}
          >
            PLAYLIST
          </div>

          {/* Artwork with shadow */}
          <div
            style={{
              position: 'relative',
              transform: `scale(${interpolate(artworkEntrance, [0, 1], [0.8, 1])})`,
              opacity: interpolate(artworkEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            {/* Shadow */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 12,
                width: 280,
                height: 280,
                borderRadius: 16,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                filter: 'blur(20px)',
              }}
            />
            {/* Artwork gradient placeholder */}
            <div
              style={{
                position: 'relative',
                width: 280,
                height: 280,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${PLAYLIST_DATA.artwork} 0%, #FF8E53 50%, #FE6B8B 100%)`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Music note icon */}
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none">
                <path
                  d="M9 18V5l12-2v13"
                  stroke="rgba(255, 255, 255, 0.6)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="6" cy="18" r="3" fill="rgba(255, 255, 255, 0.6)" />
                <circle cx="18" cy="16" r="3" fill="rgba(255, 255, 255, 0.6)" />
              </svg>
            </div>
          </div>

          {/* Info card */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: '24px 32px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              textAlign: 'center',
              minWidth: 280,
              transform: `translateY(${interpolate(infoEntrance, [0, 1], [20, 0])}px)`,
              opacity: interpolate(infoEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 28,
                fontWeight: theme.fontWeights.bold,
                color: theme.colors.white,
                marginBottom: 8,
              }}
            >
              {PLAYLIST_DATA.title}
            </div>
            <div
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 18,
                color: theme.colors.gray300,
                marginBottom: 16,
              }}
            >
              {PLAYLIST_DATA.trackCount} tracks
            </div>
            {/* Source badge */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                padding: '8px 16px',
                borderRadius: 20,
              }}
            >
              <Img
                src={staticFile('images/spotify_logo_colored.png')}
                style={{ width: 20, height: 20, objectFit: 'contain' }}
              />
              <span
                style={{
                  fontFamily: theme.fonts.atkinson,
                  fontSize: 14,
                  color: theme.colors.gray300,
                }}
              >
                from {PLAYLIST_DATA.sourcePlatform}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Track list preview and platforms */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            minWidth: 400,
          }}
        >
          {/* Listen Now section */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              padding: 24,
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 20,
                fontWeight: theme.fontWeights.semibold,
                color: theme.colors.white,
                marginBottom: 20,
                textAlign: 'center',
              }}
            >
              Listen Now
            </div>

            {/* Platform buttons */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
              }}
            >
              {['spotify', 'apple_music', 'deezer'].map((platform, i) => {
                const buttonEntrance = spring({
                  frame: adjustedFrame - platformsStartFrame - i * 8,
                  fps,
                  config: springConfigs.snappy,
                });

                const platformNames: Record<string, string> = {
                  spotify: 'Open in Spotify',
                  apple_music: 'Open in Apple Music',
                  deezer: 'Open in Deezer',
                };

                const platformColors: Record<string, string> = {
                  spotify: '#1DB954',
                  apple_music: '#FA243C',
                  deezer: '#FF0092',
                };

                return (
                  <div
                    key={platform}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      padding: '14px 20px',
                      borderRadius: 12,
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transform: `translateX(${interpolate(buttonEntrance, [0, 1], [30, 0])}px)`,
                      opacity: interpolate(buttonEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 8,
                        backgroundColor: platformColors[platform],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Img
                        src={staticFile(`images/${platform}_logo_colored.png`)}
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                      />
                    </div>
                    <span
                      style={{
                        fontFamily: theme.fonts.atkinson,
                        fontSize: 16,
                        fontWeight: theme.fontWeights.medium,
                        color: theme.colors.white,
                        flex: 1,
                      }}
                    >
                      {platformNames[platform]}
                    </span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M7 17L17 7M17 7H7M17 7V17"
                        stroke={theme.colors.gray400}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Track preview list */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.15)',
            }}
          >
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <span
                style={{
                  fontFamily: theme.fonts.atkinson,
                  fontSize: 16,
                  fontWeight: theme.fontWeights.semibold,
                  color: theme.colors.white,
                }}
              >
                Playlist Tracks
              </span>
            </div>

            <div style={{ padding: '8px 0' }}>
              {SAMPLE_TRACKS.map((track, i) => {
                const trackEntrance = spring({
                  frame: adjustedFrame - tracksStartFrame - i * 6,
                  fps,
                  config: springConfigs.snappy,
                });

                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 20px',
                      opacity: interpolate(trackEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                      transform: `translateX(${interpolate(trackEntrance, [0, 1], [20, 0])}px)`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: theme.fonts.atkinson,
                        fontSize: 14,
                        color: theme.colors.gray500,
                        width: 24,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 15,
                          color: theme.colors.white,
                          fontWeight: theme.fontWeights.medium,
                        }}
                      >
                        {track.title}
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fonts.atkinson,
                          fontSize: 13,
                          color: theme.colors.gray400,
                        }}
                      >
                        {track.artist}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* More tracks indicator */}
              <div
                style={{
                  padding: '12px 20px',
                  textAlign: 'center',
                  opacity: interpolate(
                    adjustedFrame - tracksStartFrame - SAMPLE_TRACKS.length * 6,
                    [0, 15],
                    [0, 1],
                    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
                  ),
                }}
              >
                <span
                  style={{
                    fontFamily: theme.fonts.atkinson,
                    fontSize: 14,
                    color: theme.colors.gray500,
                  }}
                >
                  + {PLAYLIST_DATA.trackCount - SAMPLE_TRACKS.length} more tracks
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Callout - Share button highlight */}
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          transform: `translateY(${interpolate(calloutEntrance, [0, 1], [30, 0])}px)`,
          opacity: interpolate(calloutEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
        }}
      >
        <div
          style={{
            backgroundColor: theme.colors.brandRed,
            borderRadius: 12,
            padding: '16px 32px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: `0 4px 20px ${theme.colors.brandRed}40`,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path
              d="M8.59 16.59L13.17 12L8.59 7.41L10 6L16 12L10 18L8.59 16.59Z"
              fill={theme.colors.white}
            />
          </svg>
          <span
            style={{
              fontFamily: theme.fonts.atkinson,
              fontSize: 20,
              fontWeight: theme.fontWeights.bold,
              color: theme.colors.white,
            }}
          >
            Share with one link
          </span>
        </div>
      </div>
    </div>
  );
};
