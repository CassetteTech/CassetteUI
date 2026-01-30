import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  style?: React.CSSProperties;
  useSpring?: boolean;
}

export const FadeIn: React.FC<FadeInProps> = ({
  children,
  delay = 0,
  duration = 20,
  style = {},
  useSpring: useSpringAnimation = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  let opacity: number;

  if (useSpringAnimation) {
    opacity = spring({
      frame: adjustedFrame,
      fps,
      config: {
        damping: 200,
        stiffness: 100,
        mass: 0.5,
      },
    });
  } else {
    opacity = interpolate(
      adjustedFrame,
      [0, duration],
      [0, 1],
      {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      }
    );
  }

  return (
    <div
      style={{
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
