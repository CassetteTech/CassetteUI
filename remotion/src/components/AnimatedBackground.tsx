import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from 'remotion';
import { theme } from '../theme';

// Animation elements - matching Flutter app
const animationImages = [
  'images/animation_elements/circle_blue.png',
  'images/animation_elements/arrows_left.png',
  'images/animation_elements/zigzag_red_1.png',
  'images/animation_elements/circle_red.png',
  'images/animation_elements/arrows_right.png',
  'images/animation_elements/zigzag_red_3.png',
  'images/animation_elements/circle_light_red.png',
  'images/animation_elements/zigzag_red_2.png',
];

interface FloatingElement {
  id: number;
  image: string;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
}

// Generate deterministic random elements based on seed
const generateElements = (count: number, width: number, height: number): FloatingElement[] => {
  const elements: FloatingElement[] = [];

  for (let i = 0; i < count; i++) {
    // Use deterministic "random" values based on index
    const seed = i * 137.5; // Golden angle for good distribution
    const pseudoRandom = (offset: number) => ((seed + offset) * 9301 + 49297) % 233280 / 233280;

    elements.push({
      id: i,
      image: animationImages[i % animationImages.length],
      x: pseudoRandom(1) * width,
      y: pseudoRandom(2) * height,
      size: 40 + pseudoRandom(3) * 40, // 40-80px
      speedX: (pseudoRandom(4) - 0.5) * 0.8, // -0.4 to 0.4 px/frame
      speedY: (pseudoRandom(5) - 0.5) * 0.8,
      opacity: 0.3 + pseudoRandom(6) * 0.3, // 0.3-0.6
      rotation: pseudoRandom(7) * 360,
      rotationSpeed: (pseudoRandom(8) - 0.5) * 0.5, // -0.25 to 0.25 deg/frame
    });
  }

  return elements;
};

interface AnimatedBackgroundProps {
  variant?: 'dark' | 'light' | 'gradient';
  itemsCount?: number;
  fadeIn?: boolean;
  fadeInDelay?: number;
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  variant = 'dark',
  itemsCount = 12,
  fadeIn = true,
  fadeInDelay = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Generate elements once (deterministic)
  const elements = React.useMemo(
    () => generateElements(itemsCount, width, height),
    [itemsCount, width, height]
  );

  // Fade in animation
  const fadeOpacity = fadeIn
    ? spring({
        frame: frame - fadeInDelay,
        fps,
        config: { damping: 200, stiffness: 50 },
      })
    : 1;

  // Background color based on variant
  const getBackgroundStyle = (): React.CSSProperties => {
    switch (variant) {
      case 'light':
        return { backgroundColor: theme.colors.brandCream };
      case 'gradient':
        return {
          background: `linear-gradient(180deg, ${theme.colors.brandBlackD} 0%, ${theme.colors.brandBlack} 50%, ${theme.colors.bgSubtle} 100%)`,
        };
      case 'dark':
      default:
        return { backgroundColor: theme.colors.bgCanvas };
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        opacity: fadeOpacity,
        ...getBackgroundStyle(),
      }}
    >
      {elements.map((element) => {
        // Calculate current position based on frame
        const currentX = (element.x + element.speedX * frame) % (width + element.size * 2) - element.size;
        const currentY = (element.y + element.speedY * frame) % (height + element.size * 2) - element.size;
        const currentRotation = element.rotation + element.rotationSpeed * frame;

        return (
          <div
            key={element.id}
            style={{
              position: 'absolute',
              left: currentX,
              top: currentY,
              width: element.size,
              height: element.size,
              transform: `rotate(${currentRotation}deg)`,
              opacity: element.opacity,
            }}
          >
            <Img
              src={staticFile(element.image)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
              }}
            />
          </div>
        );
      })}
    </div>
  );
};
