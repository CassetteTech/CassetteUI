'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TypographyProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof React.JSX.IntrinsicElements;
}

// Headline styles (Teko font)
export const HeadlineText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn('font-teko text-2xl font-bold text-text-primary', className)}>
    {children}
  </Component>
);

export const CassetteTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn('font-teko text-3xl font-semibold text-text-primary', className)}>
    {children}
  </Component>
);

export const SongTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-teko text-4xl font-bold text-text-primary tracking-custom-5', className)}>
    {children}
  </Component>
);

export const ArtistName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h3' 
}) => (
  <Component className={cn('font-teko text-2xl font-bold text-text-artist tracking-custom-2', className)}>
    {children}
  </Component>
);

// Body text styles (Roboto Flex)
export const BodyText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto-flex text-xl font-normal text-text-primary', className)}>
    {children}
  </Component>
);

export const BodyTextBold: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto-flex text-xl font-bold text-text-primary', className)}>
    {children}
  </Component>
);

export const AlbumName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-lg font-medium text-text-primary', className)}>
    {children}
  </Component>
);

export const GenreText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-sm font-normal text-text-secondary', className)}>
    {children}
  </Component>
);

// UI/Interface text (Atkinson Hyperlegible)
export const UIText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-bold text-text-primary tracking-wide', className)}>
    {children}
  </Component>
);

export const SignInText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-roboto-flex text-base font-normal text-text-primary tracking-custom-7', className)}>
    {children}
  </Component>
);

export const SignUpText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-roboto-flex text-base font-black text-white tracking-custom-7', className)}>
    {children}
  </Component>
);

export const HintText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-roboto text-sm font-semibold text-text-hint', className)}>
    {children}
  </Component>
);

export const ButtonText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-teko text-xl font-bold text-white tracking-custom-4', className)}>
    {children}
  </Component>
);

// Profile page specific styles
export const ProfileName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-atkinson text-2xl font-bold text-white tracking-wide', className)}>
    {children}
  </Component>
);

export const ProfileUsername: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-atkinson text-base font-medium text-white/80 tracking-wide', className)}>
    {children}
  </Component>
);

export const ProfileBio: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-atkinson text-sm font-normal text-white/95 leading-relaxed tracking-wide', className)}>
    {children}
  </Component>
);

export const ProfileLink: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'a' 
}) => (
  <Component className={cn('font-atkinson text-sm font-medium text-white/95 underline tracking-wide', className)}>
    {children}
  </Component>
);

// Track page specific styles
export const TrackPageSongTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn('font-teko text-4xl font-bold text-white tracking-custom-5', className)}>
    {children}
  </Component>
);

export const TrackPageArtistName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-teko text-2xl font-bold text-white tracking-custom-2', className)}>
    {children}
  </Component>
);

export const TrackPageAlbumName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-lg font-medium text-white', className)}>
    {children}
  </Component>
);

export const TrackPageGenres: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-sm font-normal text-white', className)}>
    {children}
  </Component>
);

// Add Music page styles
export const AddMusicTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn('font-atkinson text-5xl font-bold text-text-primary tracking-wide', className)}>
    {children}
  </Component>
);

export const AddMusicSubtitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-atkinson text-base font-normal text-text-primary tracking-wide', className)}>
    {children}
  </Component>
);

// Error and validation text
export const ErrorText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-normal text-btn-top-border', className)}>
    {children}
  </Component>
);

// Toast and notification text
export const ToastText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-medium text-bg-cream tracking-wide', className)}>
    {children}
  </Component>
);