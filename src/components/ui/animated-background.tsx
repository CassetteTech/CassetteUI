'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import styles from './animated-background.module.css';

interface FloatingElement {
  id: string;
  image: string;
  xPct: number;
  yPct: number;
  size: number;
  opacitySeed: number;
  rotation: number;
  driftX: number;
  driftY: number;
  driftRotate: number;
  driftDuration: number;
  driftDelay: number;
  enterDelay: number;
}

interface AnimatedBackgroundProps {
  className?: string;
  itemsCount?: number;
  enableAnimation?: boolean;
}

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

const DESKTOP_COUNT = 25;
const TABLET_COUNT = 20;
const MOBILE_COUNT = 15;

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  itemsCount,
  enableAnimation = true,
}) => {
  const [isClient, setIsClient] = useState(false);

  // Mount flag: elements depend on Math.random, so they must be generated on
  // the client only (avoids hydration mismatch).
  useEffect(() => {
    setIsClient(true);
  }, []);

  const elements = useMemo<FloatingElement[]>(() => {
    if (!isClient) return [];

    const count = itemsCount ?? DESKTOP_COUNT;

    const cols = Math.ceil(Math.sqrt(count * 1.6));
    const rows = Math.ceil(count / cols);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    return cells.slice(0, count).map((cell, i) => ({
      id: `element-${i}`,
      image: animationImages[Math.floor(Math.random() * animationImages.length)],
      xPct: (((cell % cols) + 0.1 + Math.random() * 0.8) / cols) * 100,
      yPct: ((Math.floor(cell / cols) + 0.1 + Math.random() * 0.8) / rows) * 100,
      size: 45 + Math.random() * 35,
      opacitySeed: Math.random(),
      rotation: Math.random() * 360,
      driftX: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 60),
      driftY: (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 60),
      driftRotate: (Math.random() < 0.5 ? -1 : 1) * (15 + Math.random() * 30),
      driftDuration: 14 + Math.random() * 12,
      driftDelay: Math.random() * -20,
      enterDelay: Math.random() * 0.4,
    }));
    // Regenerate only across mounts / prop change, never per frame.
  }, [isClient, itemsCount]);

  if (!isClient) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`${styles.container} fixed inset-0 pointer-events-none overflow-hidden ${className}`}
    >
      {elements.map((element, i) => {
        const tierClass =
          itemsCount !== undefined
            ? ''
            : i >= TABLET_COUNT
              ? styles.desktopOnly
              : i >= MOBILE_COUNT
                ? styles.tabletUp
                : '';
        return (
          <div
            key={element.id}
            className={`${styles.element} ${tierClass}`.trim()}
            style={
              {
                left: `${element.xPct}%`,
                top: `${element.yPct}%`,
                '--size': `${element.size}px`,
                '--opacity-seed': element.opacitySeed,
                '--rotation': `${element.rotation}deg`,
                '--drift-x': `${element.driftX}px`,
                '--drift-y': `${element.driftY}px`,
                '--drift-rotate': `${element.driftRotate}deg`,
                '--drift-duration': `${element.driftDuration}s`,
                '--drift-delay': `${element.driftDelay}s`,
                '--enter-delay': `${element.enterDelay}s`,
                animationPlayState: enableAnimation ? undefined : 'paused',
              } as React.CSSProperties
            }
          >
            <Image
              src={element.image}
              alt=""
              width={Math.round(element.size)}
              height={Math.round(element.size)}
              className="w-full h-full object-contain"
              loading="lazy"
              unoptimized
            />
          </div>
        );
      })}
    </div>
  );
};
