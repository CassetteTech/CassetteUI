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
  <Component className={cn('font-teko text-xl sm:text-2xl font-bold text-foreground', className)}>
    {children}
  </Component>
);

export const CassetteTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h1' 
}) => (
  <Component className={cn('font-teko text-xl sm:text-2xl md:text-3xl font-semibold text-foreground', className)}>
    {children}
  </Component>
);

export const SongTitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-teko text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-custom-5', className)}>
    {children}
  </Component>
);

export const ArtistName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h3' 
}) => (
  <Component className={cn('font-teko text-xl sm:text-2xl font-bold text-muted-foreground tracking-custom-2', className)}>
    {children}
  </Component>
);

// Body text styles (Roboto Flex)
export const BodyText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto-flex text-base sm:text-lg md:text-xl font-normal text-foreground', className)}>
    {children}
  </Component>
);

export const BodyTextBold: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto-flex text-base sm:text-lg md:text-xl font-bold text-foreground', className)}>
    {children}
  </Component>
);

export const AlbumName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-base sm:text-lg font-medium text-foreground', className)}>
    {children}
  </Component>
);

export const GenreText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-sm font-normal text-muted-foreground', className)}>
    {children}
  </Component>
);

// UI/Interface text (Atkinson Hyperlegible)
export const UIText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-bold text-foreground tracking-wide', className)}>
    {children}
  </Component>
);

export const SignInText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-roboto-flex text-base font-normal text-foreground tracking-custom-7', className)}>
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
  <Component className={cn('font-roboto text-sm font-semibold text-muted-foreground', className)}>
    {children}
  </Component>
);

export const ButtonText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-teko text-base sm:text-lg md:text-xl font-bold text-white tracking-custom-4', className)}>
    {children}
  </Component>
);

// Profile page specific styles
export const ProfileName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-atkinson text-xl sm:text-2xl font-bold text-white tracking-wide', className)}>
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
  <Component className={cn('font-teko text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-custom-5', className)}>
    {children}
  </Component>
);

export const TrackPageArtistName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'h2' 
}) => (
  <Component className={cn('font-teko text-xl sm:text-2xl font-bold text-white tracking-custom-2', className)}>
    {children}
  </Component>
);

export const TrackPageAlbumName: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-roboto text-base sm:text-lg font-medium text-white', className)}>
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
  <Component className={cn('font-atkinson text-3xl sm:text-4xl md:text-5xl font-bold text-foreground tracking-wide', className)}>
    {children}
  </Component>
);

export const AddMusicSubtitle: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'p' 
}) => (
  <Component className={cn('font-atkinson text-base font-normal text-foreground tracking-wide', className)}>
    {children}
  </Component>
);

// Error and validation text
export const ErrorText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-normal text-destructive', className)}>
    {children}
  </Component>
);

// Toast and notification text
export const ToastText: React.FC<TypographyProps> = ({ 
  children, 
  className, 
  as: Component = 'span' 
}) => (
  <Component className={cn('font-atkinson text-sm font-medium text-foreground tracking-wide', className)}>
    {children}
  </Component>
);