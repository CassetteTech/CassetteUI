'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  variant?: 'default' | 'auth' | 'music-search';
  inputSize?: 'default' | 'lg';
  className?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(({
  label,
  error,
  variant = 'default',
  inputSize = 'default',
  className,
  ...props
}, ref) => {
  const variants = {
    default: 'border-border focus:border-primary',
    auth: 'border-border focus:border-primary bg-card',
    'music-search': 'border-border focus:border-primary bg-card',
  };

  const sizes = {
    default: 'px-3 py-2',
    lg: 'px-4 py-3',
  };

  return (
    <div className="w-full">
      {label && (
        <label className={cn(
          "block font-bold text-foreground font-atkinson tracking-wide",
          inputSize === 'lg' ? 'text-sm mb-2' : 'text-sm mb-1'
        )}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full rounded-md border-2 transition-colors duration-200',
          'font-atkinson text-sm font-normal tracking-wide',
          'placeholder:text-muted-foreground placeholder:font-atkinson placeholder:font-normal',
          'focus:outline-none focus:ring-0',
          sizes[inputSize],
          variants[variant],
          error && 'border-destructive focus:border-destructive',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm font-normal text-destructive font-atkinson">
          {error}
        </p>
      )}
    </div>
  );
});

TextField.displayName = 'TextField';

// Music search bar component
export const MusicSearchField = React.forwardRef<HTMLInputElement, Omit<TextFieldProps, 'variant'>>((props, ref) => (
  <TextField
    ref={ref}
    {...props}
    variant="music-search"
    placeholder="Paste your music link here..."
  />
));

MusicSearchField.displayName = 'MusicSearchField';

// Auth form field component
export const AuthField: React.FC<Omit<TextFieldProps, 'variant'>> = (props) => (
  <TextField
    {...props}
    variant="auth"
  />
);