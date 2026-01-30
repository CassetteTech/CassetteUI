import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';
import { springConfigs } from './shared/springs';
import { CountUp } from './shared/CountUp';
import { TrackMatchingList, DEMO_TRACKS } from './TrackMatchingList';

interface PlaylistConversionSceneProps {
  startFrame?: number;
}

// 4-step progress configuration
const STEPS = [
  { label: 'Analyzing', icon: 'search' },
  { label: 'Matching tracks', icon: 'music' },
  { label: 'Syncing artwork', icon: 'image' },
  { label: 'Ready', icon: 'check' },
] as const;

const TOTAL_TRACKS = 47;

// Step indicator component
const StepIndicator: React.FC<{
  step: number;
  currentStep: number;
  label: string;
  frame: number;
  fps: number;
  startFrame: number;
}> = ({ step, currentStep, label, frame, fps, startFrame }) => {
  const isCompleted = currentStep > step;
  const isActive = currentStep === step;
  const isPending = currentStep < step;

  const entranceProgress = spring({
    frame: frame - startFrame - step * 8,
    fps,
    config: springConfigs.smooth,
  });

  const opacity = interpolate(entranceProgress, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const scale = interpolate(entranceProgress, [0, 1], [0.8, 1]);

  // Pulse effect for active step
  const pulse = isActive ? 1 + Math.sin(frame * 0.15) * 0.05 : 1;

  const getColor = () => {
    if (isCompleted) return theme.colors.success;
    if (isActive) return theme.colors.brandRed;
    return theme.colors.gray600;
  };

  const getIcon = () => {
    if (isCompleted) {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M5 12L10 17L19 8"
            stroke={theme.colors.white}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    }
    return (
      <span
        style={{
          fontFamily: theme.fonts.teko,
          fontSize: 16,
          fontWeight: theme.fontWeights.bold,
          color: isPending ? theme.colors.gray500 : theme.colors.white,
        }}
      >
        {step + 1}
      </span>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity,
        transform: `scale(${scale * pulse})`,
      }}
    >
      {/* Step circle */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: getColor(),
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isActive ? `0 0 20px ${theme.colors.brandRed}60` : 'none',
        }}
      >
        {getIcon()}
      </div>

      {/* Step label */}
      <span
        style={{
          fontFamily: theme.fonts.atkinson,
          fontSize: 16,
          color: isPending ? theme.colors.gray500 : theme.colors.white,
          fontWeight: isActive ? theme.fontWeights.semibold : theme.fontWeights.normal,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const PlaylistConversionScene: React.FC<PlaylistConversionSceneProps> = ({
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;
  const sceneDuration = 420; // frames for this scene

  // Calculate current step (0-3)
  // Steps transition at: 0-80 (analyzing), 80-200 (matching), 200-320 (syncing), 320+ (ready)
  const stepTransitions = [0, 80, 280, 360];
  const currentStep = stepTransitions.reduce((acc, threshold, i) => {
    return adjustedFrame >= threshold ? i : acc;
  }, 0);

  // Calculate matched track count based on frame
  // Tracks start matching after step 1 begins (frame 80)
  const matchingStartFrame = 80;
  const matchingEndFrame = 340;
  const matchedCount = Math.min(
    TOTAL_TRACKS,
    Math.max(
      0,
      Math.round(
        interpolate(
          adjustedFrame,
          [matchingStartFrame, matchingEndFrame],
          [0, TOTAL_TRACKS],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        )
      )
    )
  );

  // Title animation
  const titleOpacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const titleY = interpolate(adjustedFrame, [0, 30], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo subtle pulse
  const logoPulse = 1 + Math.sin(adjustedFrame * 0.08) * 0.03;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        padding: 60,
      }}
    >
      {/* Left side: Progress steps */}
      <div
        style={{
          flex: '0 0 320px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingRight: 40,
        }}
      >
        {/* Logo */}
        <div
          style={{
            opacity: titleOpacity,
            transform: `scale(${logoPulse})`,
            marginBottom: 24,
          }}
        >
          <Img
            src={staticFile('images/cassette_logo.png')}
            style={{ width: 60, height: 60, objectFit: 'contain' }}
          />
        </div>

        {/* Title */}
        <h2
          style={{
            fontFamily: theme.fonts.teko,
            fontSize: 48,
            fontWeight: theme.fontWeights.bold,
            color: theme.colors.white,
            margin: 0,
            marginBottom: 8,
            opacity: titleOpacity,
            transform: `translateY(${titleY}px)`,
            letterSpacing: 1,
          }}
        >
          Converting Playlist
        </h2>

        {/* Progress counter */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 8,
            marginBottom: 40,
            opacity: titleOpacity,
          }}
        >
          <CountUp
            from={0}
            to={matchedCount}
            startFrame={startFrame + matchingStartFrame}
            duration={matchingEndFrame - matchingStartFrame}
            style={{
              fontFamily: theme.fonts.teko,
              fontSize: 36,
              fontWeight: theme.fontWeights.bold,
              color: theme.colors.brandRed,
            }}
          />
          <span
            style={{
              fontFamily: theme.fonts.atkinson,
              fontSize: 20,
              color: theme.colors.gray400,
            }}
          >
            / {TOTAL_TRACKS} tracks
          </span>
        </div>

        {/* Step indicators */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
          }}
        >
          {STEPS.map((step, i) => (
            <StepIndicator
              key={i}
              step={i}
              currentStep={currentStep}
              label={step.label}
              frame={frame}
              fps={fps}
              startFrame={startFrame}
            />
          ))}
        </div>
      </div>

      {/* Right side: Track matching list */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: 40,
          borderLeft: `1px solid ${theme.colors.gray700}`,
        }}
      >
        <TrackMatchingList
          startFrame={startFrame + 20}
          totalTracks={TOTAL_TRACKS}
        />
      </div>
    </div>
  );
};
