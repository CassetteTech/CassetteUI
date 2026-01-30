import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { springConfigs } from './springs';

interface CountUpProps {
  from: number;
  to: number;
  startFrame: number;
  duration?: number; // frames to count up
  prefix?: string;
  suffix?: string;
  style?: React.CSSProperties;
}

export const CountUp: React.FC<CountUpProps> = ({
  from,
  to,
  startFrame,
  duration = 60,
  prefix = '',
  suffix = '',
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - startFrame;

  // Use spring for smooth count-up with slight overshoot feel
  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: springConfigs.smooth,
    durationInFrames: duration,
  });

  // Interpolate the value
  const currentValue = Math.round(
    interpolate(progress, [0, 1], [from, to], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );

  return (
    <span style={style}>
      {prefix}{currentValue}{suffix}
    </span>
  );
};
