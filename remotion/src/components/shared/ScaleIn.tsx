import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface ScaleInProps {
  children: React.ReactNode;
  delay?: number;
  initialScale?: number;
  style?: React.CSSProperties;
}

export const ScaleIn: React.FC<ScaleInProps> = ({
  children,
  delay = 0,
  initialScale = 0,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  const scale = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const interpolatedScale = interpolate(scale, [0, 1], [initialScale, 1]);

  const opacity = interpolate(scale, [0, 0.3], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        transform: `scale(${interpolatedScale})`,
        opacity,
        ...style,
      }}
    >
      {children}
    </div>
  );
};
