'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import styles from './animated-background.module.css';

interface FloatingElement {
  id: string;
  image: string;
  x: number;
  y: number;
  size: number;
  opacity: number;
  rotation: number;
  // CSS drift parameters (transform-only, compositor-driven)
  driftX: number;
  driftY: number;
  driftRotate: number;
  driftDuration: number;
  driftDelay: number;
}

interface AnimatedBackgroundProps {
  className?: string;
  itemsCount?: number;
  enableAnimation?: boolean;
}

// Animation elements from Flutter - moved outside component to avoid recreation
const animationImages = [
  '/images/animation_elements/circle_blue.png',
  '/images/animation_elements/arrows_left.png',
  '/images/animation_elements/zigzag_red_1.png',
  '/images/animation_elements/circle_red.png',
  '/images/animation_elements/arrows_right.png',
  '/images/animation_elements/zigzag_red_3.png',
  '/images/animation_elements/circle_light_red.png',
  '/images/animation_elements/zigzag_red_2.png',
];

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  itemsCount,
  enableAnimation = true,
}) => {
  const [isClient, setIsClient] = useState(false);

  // Mount flag: elements depend on window dimensions / Math.random, so they
  // must be generated on the client only (avoids hydration mismatch).
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Generate the elements exactly once per mount. No per-frame React state:
  // drift now runs as a pure CSS keyframe animation on the compositor.
  const elements = useMemo<FloatingElement[]>(() => {
    if (!isClient) return [];

    const width = typeof window !== 'undefined' ? window.innerWidth : 1000;
    const height = typeof window !== 'undefined' ? window.innerHeight : 1000;
    const isSmallScreen = width < 768;
    const isLowPerformance = width < 1024;

    const count =
      itemsCount || (isLowPerformance ? (isSmallScreen ? 15 : 20) : 25);
    const maxSize = isLowPerformance ? (isSmallScreen ? 50 : 65) : 80;
    const minSize = isLowPerformance ? (isSmallScreen ? 25 : 35) : 45;

    return Array.from({ length: count }, (_, i) => ({
      id: `element-${i}`,
      image: animationImages[Math.floor(Math.random() * animationImages.length)],
      x: Math.random() * width,
      y: Math.random() * height,
      size: minSize + Math.random() * (maxSize - minSize),
      opacity: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
      rotation: Math.random() * 360,
      // Gentle transform-only drift, randomized per element.
      driftX: (Math.random() - 0.5) * 120, // -60..60px
      driftY: (Math.random() - 0.5) * 120, // -60..60px
      driftRotate: (Math.random() - 0.5) * 40, // -20..20deg
      driftDuration: 18 + Math.random() * 14, // 18..32s
      driftDelay: Math.random() * -20, // negative → desynchronized start
    }));
    // Regenerate only across mounts / prop change, never per frame.
  }, [isClient, itemsCount]);

  if (!isClient) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      {elements.map((element) => (
        <div
          key={element.id}
          className={styles.element}
          style={
            {
              left: element.x,
              top: element.y,
              width: element.size,
              height: element.size,
              '--target-opacity': element.opacity,
              '--rotation': `${element.rotation}deg`,
              '--drift-x': `${element.driftX}px`,
              '--drift-y': `${element.driftY}px`,
              '--drift-rotate': `${element.driftRotate}deg`,
              '--drift-duration': `${element.driftDuration}s`,
              '--drift-delay': `${element.driftDelay}s`,
              // Allow callers/tests to opt out; drift keyframe still parked
              // at frame 0 so the element renders in place.
              animationPlayState: enableAnimation ? undefined : 'paused',
            } as React.CSSProperties
          }
        >
          <Image
            src={element.image}
            alt=""
            width={element.size}
            height={element.size}
            className="w-full h-full object-contain"
            loading="lazy"
            unoptimized // For better performance with small animated images
          />
        </div>
      ))}
    </div>
  );
};

// Simplified version for better performance on lower-end devices
export const SimpleAnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
}) => {
  return (
    <motion.div
      className={`fixed inset-0 pointer-events-none ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Static background pattern for low-performance devices */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-10 left-10 w-16 h-16">
          <Image
            src="/images/animation_elements/circle_blue.png"
            alt=""
            width={64}
            height={64}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute top-20 right-20 w-12 h-12">
          <Image
            src="/images/animation_elements/circle_red.png"
            alt=""
            width={48}
            height={48}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute bottom-20 left-20 w-14 h-14">
          <Image
            src="/images/animation_elements/zigzag_red_1.png"
            alt=""
            width={56}
            height={56}
            className="w-full h-full object-contain"
          />
        </div>
        <div className="absolute bottom-10 right-10 w-10 h-10">
          <Image
            src="/images/animation_elements/arrows_right.png"
            alt=""
            width={40}
            height={40}
            className="w-full h-full object-contain"
          />
        </div>
      </div>
    </motion.div>
  );
};