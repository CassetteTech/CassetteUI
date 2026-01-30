import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';
import { TypewriterText } from './shared/TypewriterText';
import { springConfigs } from './shared/springs';

interface UrlBarSceneProps {
  startFrame?: number;
}

export const UrlBarScene: React.FC<UrlBarSceneProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // URL bar slide in animation
  const urlBarProgress = spring({
    frame: adjustedFrame,
    fps,
    config: springConfigs.smooth,
  });

  const urlBarOpacity = interpolate(urlBarProgress, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const urlBarY = interpolate(urlBarProgress, [0, 1], [60, 0]);

  // Typewriter starts after bar animates in
  const typewriterStartFrame = 25;
  // Shorter playlist URL that fits without cutoff
  const playlistUrl = 'open.spotify.com/playlist/37i9dQZF1DX';

  // Glow pulse animation after URL is typed
  const typewriterEndFrame = typewriterStartFrame + playlistUrl.length * 2;
  const glowStartFrame = typewriterEndFrame + 10;

  const glowOpacity = adjustedFrame > glowStartFrame
    ? interpolate(
        Math.sin((adjustedFrame - glowStartFrame) * 0.15),
        [-1, 1],
        [0.3, 0.8]
      )
    : 0;

  // Platform icons appear after glow
  const iconsStartFrame = glowStartFrame + 15;

  const spotifyScale = spring({
    frame: adjustedFrame - iconsStartFrame,
    fps,
    config: { damping: 200 },
  });

  const appleScale = spring({
    frame: adjustedFrame - iconsStartFrame - 8,
    fps,
    config: { damping: 200 },
  });

  const deezerScale = spring({
    frame: adjustedFrame - iconsStartFrame - 16,
    fps,
    config: { damping: 200 },
  });

  // Label text
  const labelOpacity = interpolate(
    adjustedFrame,
    [5, 20],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

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
        padding: 80,
      }}
    >
      {/* Section Label */}
      <div
        style={{
          opacity: labelOpacity,
          marginBottom: 60,
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: theme.fonts.teko,
            fontSize: 64,
            fontWeight: theme.fontWeights.bold,
            color: theme.colors.textOnDark,
            margin: 0,
            letterSpacing: 2,
          }}
        >
          PASTE YOUR PLAYLIST
        </h2>
        <p
          style={{
            fontFamily: theme.fonts.atkinson,
            fontSize: 28,
            color: theme.colors.gray400,
            margin: '16px 0 0 0',
          }}
        >
          Convert entire playlists in seconds
        </p>
      </div>

      {/* URL Bar Container */}
      <div
        style={{
          opacity: urlBarOpacity,
          transform: `translateY(${urlBarY}px)`,
          width: '100%',
          maxWidth: 900,
          position: 'relative',
        }}
      >
        {/* Glow effect */}
        <div
          style={{
            position: 'absolute',
            top: -10,
            left: -10,
            right: -10,
            bottom: -10,
            borderRadius: 30,
            background: `radial-gradient(ellipse at center, ${theme.colors.brandRed}40 0%, transparent 70%)`,
            opacity: glowOpacity,
            filter: 'blur(20px)',
          }}
        />

        {/* URL Bar */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: 100,
            backgroundColor: theme.colors.white,
            borderRadius: 20,
            border: `3px solid ${theme.colors.brandBlack}`,
            boxShadow: `6px 6px 0px 0px ${theme.colors.brandBlack}`,
            display: 'flex',
            alignItems: 'center',
            padding: '0 30px',
          }}
        >
          {/* Link Icon */}
          <div
            style={{
              width: 40,
              height: 40,
              marginRight: 20,
              opacity: 0.6,
              flexShrink: 0,
            }}
          >
            <Img
              src={staticFile('images/ic_link.png')}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>

          {/* Typewriter URL */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <TypewriterText
              text={playlistUrl}
              startFrame={typewriterStartFrame}
              framesPerChar={2}
              showCursor={true}
              cursorColor={theme.colors.brandRed}
              style={{
                fontFamily: theme.fonts.robotoFlex,
                fontSize: 26,
                color: theme.colors.textPrimary,
                whiteSpace: 'nowrap',
              }}
            />
          </div>
        </div>
      </div>

      {/* Platform Icons */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          marginTop: 60,
        }}
      >
        {/* Spotify */}
        <div
          style={{
            transform: `scale(${spotifyScale})`,
            opacity: interpolate(spotifyScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows.album,
            }}
          >
            <Img
              src={staticFile('images/spotify_logo_colored.png')}
              style={{ width: 50, height: 50, objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Arrow */}
        <div
          style={{
            opacity: interpolate(appleScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <svg width="60" height="30" viewBox="0 0 60 30" fill="none">
            <path
              d="M0 15H50M50 15L38 5M50 15L38 25"
              stroke={theme.colors.brandRed}
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Apple Music */}
        <div
          style={{
            transform: `scale(${appleScale})`,
            opacity: interpolate(appleScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows.album,
            }}
          >
            <Img
              src={staticFile('images/apple_music_logo_colored.png')}
              style={{ width: 50, height: 50, objectFit: 'contain' }}
            />
          </div>
        </div>

        {/* Deezer */}
        <div
          style={{
            transform: `scale(${deezerScale})`,
            opacity: interpolate(deezerScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: theme.colors.white,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.shadows.album,
            }}
          >
            <Img
              src={staticFile('images/deezer_logo_colored.png')}
              style={{ width: 50, height: 50, objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>

      {/* Detection indicator */}
      {adjustedFrame > glowStartFrame && (
        <div
          style={{
            marginTop: 40,
            opacity: interpolate(
              adjustedFrame - glowStartFrame,
              [0, 15],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              backgroundColor: `${theme.colors.success}20`,
              padding: '12px 24px',
              borderRadius: 30,
              border: `2px solid ${theme.colors.success}`,
            }}
          >
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: theme.colors.success,
              }}
            />
            <span
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 20,
                color: theme.colors.success,
                fontWeight: theme.fontWeights.semibold,
              }}
            >
              Spotify playlist detected
            </span>
            <span
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 20,
                color: theme.colors.gray400,
              }}
            >
              •
            </span>
            <span
              style={{
                fontFamily: theme.fonts.atkinson,
                fontSize: 20,
                color: theme.colors.gray300,
                fontWeight: theme.fontWeights.medium,
              }}
            >
              47 tracks
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
