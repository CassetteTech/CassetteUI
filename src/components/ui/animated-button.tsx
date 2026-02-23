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

  const defaultTopColor = colorTop || 'hsl(var(--primary))';
  const defaultBottomColor = colorBottom || 'hsl(var(--accent))';
  const defaultTopBorderColor = borderColorTop || 'hsl(var(--ring))';
  const defaultBottomBorderColor = borderColorBottom || 'hsl(var(--primary))';

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

// Preset button variants using CSS tokens
export const AnimatedPrimaryButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop='hsl(var(--primary))'
    colorBottom='hsl(var(--accent))'
    borderColorTop='hsl(var(--ring))'
    borderColorBottom='hsl(var(--primary))'
  />
);

export const AnimatedConvertButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop='hsl(var(--secondary))'
    colorBottom='hsl(var(--muted-foreground))'
    borderColorTop='hsl(var(--secondary))'
    borderColorBottom='hsl(var(--secondary))'
  />
);

export const AnimatedFreeAccountButton: React.FC<Omit<AnimatedButtonProps, 'colorTop' | 'colorBottom' | 'textStyle'>> = (props) => (
  <AnimatedButton
    {...props}
    colorTop='hsl(var(--primary))'
    colorBottom='hsl(var(--accent))'
    borderColorTop='hsl(var(--ring))'
    borderColorBottom='hsl(var(--primary))'
    textStyle="text-xl font-bold tracking-wide"
  />
);