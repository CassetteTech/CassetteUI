'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedButtonProps {
  text?: string;
  children?: React.ReactNode;
  height?: number;
  width?: number;
  initialPos?: number;
  colorTop?: string;
  colorBottom?: string;
  borderColorTop?: string;
  borderColorBottom?: string;
  radius?: number;
  bottomBorderWidth?: number;
  topBorderWidth?: number;
  textStyle?: string;
  onClick: () => void;
  onMouseDown?: () => void;
  className?: string;
  disabled?: boolean;
}

export const AnimatedButton: React.FC<AnimatedButtonProps> = ({
  text,
  children,
  height = 32,
  width = 100,
  initialPos = 4,
  colorTop,
  colorBottom,
  borderColorTop,
  borderColorBottom,
  radius = 5,
  bottomBorderWidth = 1,
  topBorderWidth = 1,
  textStyle,
  onClick,
  onMouseDown,
  className,
  disabled = false,
}) => {
  const [position, setPosition] = useState(initialPos);
  const [, setIsPressed] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    
    setIsPressed(true);
    setPosition(0);
    
    setTimeout(() => {
      setPosition(initialPos);
      setIsPressed(false);
    }, 125);
    
    onClick();
  };

  const handleMouseDown = () => {
    if (disabled) return;
    onMouseDown?.();
  };

  // Default colors based on Flutter implementation
  const defaultTopColor = colorTop || '#ED2748';
  const defaultBottomColor = colorBottom || '#E95E75';
  const defaultTopBorderColor = borderColorTop || '#FF002B';
  const defaultBottomBorderColor = borderColorBottom || '#ED2748';

  return (
    <button
      onClick={handleClick}
      onMouseDown={handleMouseDown}
      disabled={disabled}
      className={cn(
        'relative cursor-pointer select-none transition-all duration-50 ease-in',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        height: height + initialPos,
        width: width,
      }}
    >
      {/* Bottom layer (shadow/depth) */}
      <div
        className="absolute bottom-0 right-0"
        style={{
          height: height,
          width: width,
          backgroundColor: defaultBottomColor,
          borderRadius: radius,
          border: `${bottomBorderWidth}px solid ${defaultBottomBorderColor}`,
        }}
      />
      
      {/* Top layer (main button) */}
      <div
        className="absolute transition-all duration-50 ease-in"
        style={{
          height: height,
          width: width,
          backgroundColor: defaultTopColor,
          borderRadius: radius,
          border: `${topBorderWidth}px solid ${defaultTopBorderColor}`,
          bottom: position,
          right: position,
        }}
      >
        <div className="h-full w-full flex items-center justify-center">
          {children || (
            <span 
              className={cn(
                'text-white font-bold text-sm tracking-wide font-atkinson',
                textStyle
              )}
            >
              {text}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

// Preset button variants based on Flutter styles
export const AnimatedPrimaryButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop="#ED2748"
    colorBottom="#E95E75"
    borderColorTop="#FF002B"
    borderColorBottom="#ED2748"
  />
);

export const AnimatedConvertButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop="#1F2327"
    colorBottom="#595C5E"
    borderColorTop="#1F2327"
    borderColorBottom="#1F2327"
  />
);

export const AnimatedFreeAccountButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom' | 'textStyle'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop="#ED2748"
    colorBottom="#E95E75"
    borderColorTop="#FF002B"
    borderColorBottom="#ED2748"
    textStyle="text-xl font-bold tracking-wide"
  />
);