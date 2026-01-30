import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';

interface ConversionSceneProps {
  startFrame?: number;
}

// Waveform bar component with spring animation
const WaveformBar: React.FC<{
  baseHeight: number;
  index: number;
  frame: number;
  fps: number;
  delay: number;
}> = ({ baseHeight, index, frame, fps, delay }) => {
  const adjustedFrame = frame - delay;

  // Entrance animation
  const entrance = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  // Oscillating height animation
  const oscillation = Math.sin((frame + index * 8) * 0.12) * 0.4 + 0.6;
  const height = baseHeight * oscillation * entrance;

  return (
    <div
      style={{
        width: 8,
        height: height,
        backgroundColor: theme.colors.brandRed,
        borderRadius: 4,
        transition: 'none',
      }}
    />
  );
};

// Step indicator component
const StepIndicator: React.FC<{
  step: number;
  currentStep: number;
  label: string;
  frame: number;
  fps: number;
  startFrame: number;
}> = ({ step, currentStep, label, frame, fps, startFrame }) => {
  const isActive = currentStep >= step;
  const isCurrentStep = currentStep === step;

  const scale = spring({
    frame: frame - startFrame - step * 30,
    fps,
    config: { damping: 200 },
  });

  const opacity = interpolate(scale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `scale(${interpolate(scale, [0, 1], [0.8, 1])})`,
      }}
    >
      {/* Step circle */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: isActive ? theme.colors.brandRed : theme.colors.gray700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: isCurrentStep ? `3px solid ${theme.colors.white}` : 'none',
          boxShadow: isCurrentStep ? `0 0 20px ${theme.colors.brandRed}80` : 'none',
        }}
      >
        {isActive && currentStep > step ? (
          // Checkmark
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12L10 17L19 8"
              stroke={theme.colors.white}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : (
          <span
            style={{
              fontFamily: theme.fonts.teko,
              fontSize: 18,
              fontWeight: theme.fontWeights.bold,
              color: theme.colors.white,
            }}
          >
            {step + 1}
          </span>
        )}
      </div>

      {/* Step label */}
      <span
        style={{
          fontFamily: theme.fonts.atkinson,
          fontSize: 22,
          color: isActive ? theme.colors.white : theme.colors.gray500,
          fontWeight: isCurrentStep ? theme.fontWeights.semibold : theme.fontWeights.normal,
        }}
      >
        {label}
      </span>
    </div>
  );
};

export const ConversionScene: React.FC<ConversionSceneProps> = ({ startFrame = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Progress animation (0 to 100 over scene duration)
  const sceneDuration = 300; // frames
  const progress = interpolate(
    adjustedFrame,
    [0, sceneDuration - 30],
    [0, 100],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Current step (0-3)
  const currentStep = Math.min(3, Math.floor(progress / 25));

  // Waveform bars
  const waveformHeights = [24, 40, 56, 36, 28, 48, 32, 44, 26, 38];

  // Step labels
  const steps = [
    'Analyzing link',
    'Converting track',
    'Matching across platforms',
    'Generating smart link',
  ];

  // Title and subtitle
  const titleOpacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Logo pulse
  const logoPulse = 1 + Math.sin(adjustedFrame * 0.1) * 0.05;

  // Platform icons animation at the end
  const platformsStartFrame = sceneDuration - 80;
  const showPlatforms = adjustedFrame > platformsStartFrame;

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
      {/* Logo */}
      <div
        style={{
          opacity: titleOpacity,
          transform: `scale(${logoPulse})`,
          marginBottom: 30,
        }}
      >
        <Img
          src={staticFile('images/cassette_logo.png')}
          style={{ width: 80, height: 80, objectFit: 'contain' }}
        />
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: theme.fonts.teko,
          fontSize: 56,
          fontWeight: theme.fontWeights.bold,
          color: theme.colors.white,
          margin: 0,
          opacity: titleOpacity,
          letterSpacing: 1,
        }}
      >
        Converting Track
      </h2>

      {/* Subtitle */}
      <p
        style={{
          fontFamily: theme.fonts.atkinson,
          fontSize: 24,
          color: theme.colors.gray400,
          margin: '12px 0 40px 0',
          opacity: titleOpacity,
        }}
      >
        {steps[currentStep]}
      </p>

      {/* Waveform */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          height: 80,
          marginBottom: 50,
        }}
      >
        {waveformHeights.map((height, i) => (
          <WaveformBar
            key={i}
            baseHeight={height}
            index={i}
            frame={adjustedFrame}
            fps={fps}
            delay={i * 3}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: 700,
          marginBottom: 50,
        }}
      >
        {/* Progress track */}
        <div
          style={{
            width: '100%',
            height: 12,
            backgroundColor: theme.colors.gray700,
            borderRadius: 6,
            overflow: 'hidden',
          }}
        >
          {/* Progress fill */}
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              backgroundColor: theme.colors.brandRed,
              borderRadius: 6,
              transition: 'none',
            }}
          />
        </div>

        {/* Progress labels */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 12,
          }}
        >
          <span
            style={{
              fontFamily: theme.fonts.atkinson,
              fontSize: 16,
              color: theme.colors.gray400,
            }}
          >
            Step {currentStep + 1} of {steps.length}
          </span>
          <span
            style={{
              fontFamily: theme.fonts.atkinson,
              fontSize: 16,
              color: theme.colors.gray400,
            }}
          >
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {/* Step Indicators */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {steps.map((label, i) => (
          <StepIndicator
            key={i}
            step={i}
            currentStep={currentStep}
            label={label}
            frame={frame}
            fps={fps}
            startFrame={startFrame}
          />
        ))}
      </div>

      {/* Platform icons at completion */}
      {showPlatforms && (
        <div
          style={{
            position: 'absolute',
            bottom: 100,
            display: 'flex',
            alignItems: 'center',
            gap: 30,
            opacity: interpolate(
              adjustedFrame - platformsStartFrame,
              [0, 20],
              [0, 1],
              { extrapolateRight: 'clamp' }
            ),
          }}
        >
          {['spotify', 'apple_music', 'deezer'].map((platform, i) => {
            const iconScale = spring({
              frame: adjustedFrame - platformsStartFrame - i * 10,
              fps,
              config: { damping: 200 },
            });

            return (
              <div
                key={platform}
                style={{
                  transform: `scale(${iconScale})`,
                  opacity: interpolate(iconScale, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                }}
              >
                <div
                  style={{
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    backgroundColor: theme.colors.white,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: theme.shadows.album,
                  }}
                >
                  <Img
                    src={staticFile(`images/${platform}_logo_colored.png`)}
                    style={{ width: 42, height: 42, objectFit: 'contain' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
