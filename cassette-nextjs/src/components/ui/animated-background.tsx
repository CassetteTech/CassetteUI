'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';

interface FloatingElement {
  id: string;
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
  const [elements, setElements] = useState<FloatingElement[]>([]);
  const [isClient, setIsClient] = useState(false);
  const [animationId, setAnimationId] = useState<number | null>(null);

  // Responsive configuration
  const getConfiguration = useCallback(() => {
    if (typeof window === 'undefined') return { itemsCount: 20, maxSize: 60, minSize: 30, maxSpeed: 0.15, minSpeed: 0.05 };
    
    const isSmallScreen = window.innerWidth < 768;
    const isLowPerformance = window.innerWidth < 1024;

    return {
      itemsCount: itemsCount || (isLowPerformance ? (isSmallScreen ? 15 : 20) : 25),
      maxSize: isLowPerformance ? (isSmallScreen ? 50 : 65) : 80,
      minSize: isLowPerformance ? (isSmallScreen ? 25 : 35) : 45,
      maxSpeed: isLowPerformance ? (isSmallScreen ? 0.1 : 0.15) : 0.2,
      minSpeed: isLowPerformance ? (isSmallScreen ? 0.03 : 0.05) : 0.08,
    };
  }, [itemsCount]);

  // Generate random floating element
  const createRandomElement = useCallback((id: string): FloatingElement => {
    const config = getConfiguration();
    const image = animationImages[Math.floor(Math.random() * animationImages.length)];
    
    return {
      id,
      image,
      x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
      y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1000),
      size: config.minSize + Math.random() * (config.maxSize - config.minSize),
      speedX: (Math.random() - 0.5) * config.maxSpeed,
      speedY: (Math.random() - 0.5) * config.maxSpeed,
      opacity: 0.3 + Math.random() * 0.4, // 0.3 to 0.7
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 2, // -1 to 1 degrees per frame
    };
  }, [getConfiguration]);

  // Initialize elements
  useEffect(() => {
    setIsClient(true);
    const config = getConfiguration();
    const initialElements = Array.from({ length: config.itemsCount }, (_, i) =>
      createRandomElement(`element-${i}`)
    );
    setElements(initialElements);
  }, [createRandomElement, getConfiguration]);

  // Animation loop
  useEffect(() => {
    if (!enableAnimation || !isClient) return;

    const animate = () => {
      setElements(prevElements =>
        prevElements.map(element => {
          let newX = element.x + element.speedX;
          let newY = element.y + element.speedY;
          let newRotation = element.rotation + element.rotationSpeed;

          // Wrap around screen edges
          if (newX > window.innerWidth + element.size) newX = -element.size;
          if (newX < -element.size) newX = window.innerWidth + element.size;
          if (newY > window.innerHeight + element.size) newY = -element.size;
          if (newY < -element.size) newY = window.innerHeight + element.size;

          // Keep rotation in bounds
          if (newRotation > 360) newRotation -= 360;
          if (newRotation < 0) newRotation += 360;

          return {
            ...element,
            x: newX,
            y: newY,
            rotation: newRotation,
          };
        })
      );

      const id = requestAnimationFrame(animate);
      setAnimationId(id);
    };

    const id = requestAnimationFrame(animate);
    setAnimationId(id);

    return () => {
      if (id) cancelAnimationFrame(id);
    };
  }, [enableAnimation, isClient]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [animationId]);

  // Handle window resize
  useEffect(() => {
    if (!isClient) return;

    const handleResize = () => {
      const config = getConfiguration();
      setElements(prevElements => {
        // Adjust existing elements to new screen size
        return prevElements.slice(0, config.itemsCount).map(element => ({
          ...element,
          x: Math.min(element.x, window.innerWidth),
          y: Math.min(element.y, window.innerHeight),
        }));
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isClient, getConfiguration]);

  if (!isClient) {
    return null;
  }

  return (
    <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`}>
      <AnimatePresence>
        {elements.map((element) => (
          <motion.div
            key={element.id}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ 
              opacity: element.opacity,
              scale: 1,
              x: element.x,
              y: element.y,
              rotate: element.rotation,
            }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 0.5 },
              x: { duration: 0 },
              y: { duration: 0 },
              rotate: { duration: 0 },
            }}
            className="absolute"
            style={{
              width: element.size,
              height: element.size,
              willChange: 'transform',
            }}
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
          </motion.div>
        ))}
      </AnimatePresence>
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