import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

type Direction = 'left' | 'right' | 'top' | 'bottom';

interface SlideInProps {
  children: React.ReactNode;
  direction?: Direction;
  delay?: number;
  distance?: number;
  style?: React.CSSProperties;
}

export const SlideIn: React.FC<SlideInProps> = ({
  children,
  direction = 'bottom',
  delay = 0,
  distance = 50,
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = frame - delay;

  const progress = spring({
    frame: adjustedFrame,
    fps,
    config: {
      damping: 200,
      stiffness: 100,
      mass: 0.5,
    },
  });

  const opacity = interpolate(progress, [0, 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const getTransform = () => {
    const offset = interpolate(progress, [0, 1], [distance, 0]);

    switch (direction) {
      case 'left':
        return `translateX(${-offset}px)`;
      case 'right':
        return `translateX(${offset}px)`;
      case 'top':
        return `translateY(${-offset}px)`;
      case 'bottom':
        return `translateY(${offset}px)`;
    }
  };

  return (
    <div
      style={{
        opacity,
        transform: getTransform(),
        ...style,
      }}
    >
      {children}
    </div>
  );
};
