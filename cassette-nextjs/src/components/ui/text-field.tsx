'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TextFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: 'default' | 'auth' | 'music-search';
  className?: string;
}

export const TextField = React.forwardRef<HTMLInputElement, TextFieldProps>(({
  label,
  error,
  variant = 'default',
  className,
  ...props
}, ref) => {
  const variants = {
    default: 'border-text-hint focus:border-primary',
    auth: 'border-text-secondary focus:border-primary bg-bg-input',
    'music-search': 'border-text-hint focus:border-primary bg-white',
  };

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-bold text-text-primary mb-1 font-atkinson tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={cn(
          'w-full px-3 py-2 rounded-md border-2 transition-colors duration-200',
          'font-atkinson text-sm font-normal tracking-wide',
          'placeholder:text-text-hint placeholder:font-atkinson placeholder:font-normal',
          'focus:outline-none focus:ring-0',
          variants[variant],
          error && 'border-red-500 focus:border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm font-normal text-red-500 font-atkinson">
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