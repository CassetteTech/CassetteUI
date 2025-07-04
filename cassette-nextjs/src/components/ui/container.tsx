'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'main' | 'card' | 'minimal';
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className,
  variant = 'main',
}) => {
  const variants = {
    main: 'bg-white rounded-xl shadow-main',
    card: 'bg-white rounded-lg shadow-album',
    minimal: 'bg-white rounded-md shadow-soft',
  };

  return (
    <div className={cn(variants[variant], className)}>
      {children}
    </div>
  );
};

// Main container component matching Flutter's mainContainerDecoration
export const MainContainer: React.FC<Omit<ContainerProps, 'variant'>> = (props) => (
  <Container {...props} variant="main" />
);

// Card container for album covers and similar elements
export const CardContainer: React.FC<Omit<ContainerProps, 'variant'>> = (props) => (
  <Container {...props} variant="card" />
);

// Minimal container for subtle elevation
export const MinimalContainer: React.FC<Omit<ContainerProps, 'variant'>> = (props) => (
  <Container {...props} variant="minimal" />
);