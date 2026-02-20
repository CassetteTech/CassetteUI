'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';

interface BackButtonProps {
  /** Explicit route to navigate to (overrides router.back()) */
  route?: string;
  /** Fallback route when there is no browser history (default: "/") */
  fallbackRoute?: string;
  /** Visual variant: "icon" for header back arrows, "button" for error states */
  variant?: 'icon' | 'button';
  /** Text label next to the icon (only shown for "icon" variant) */
  label?: string;
  /** Button text for "button" variant (defaults to "Go Back") */
  children?: React.ReactNode;
  /** Override click handler entirely (for skeleton onCancel pattern) */
  onClick?: () => void;
  /** Additional className for the root element */
  className?: string;
  /** shadcn Button variant for "button" mode (defaults to "destructive") */
  buttonVariant?: ButtonVariant;
}

export function BackButton({
  route,
  fallbackRoute = '/',
  variant = 'icon',
  label,
  children,
  onClick,
  className,
  buttonVariant = 'destructive',
}: BackButtonProps) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    if (onClick) {
      onClick();
      return;
    }
    if (route) {
      router.push(route);
      return;
    }
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackRoute);
    }
  }, [onClick, route, router, fallbackRoute]);

  if (variant === 'button') {
    return (
      <Button
        variant={buttonVariant}
        onClick={handleClick}
        className={cn('px-6', className)}
      >
        {children || 'Go Back'}
      </Button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 text-foreground hover:opacity-70 transition-opacity',
        className
      )}
    >
      <ChevronLeft className="w-5 h-5" />
      {label && <span className="font-atkinson font-bold">{label}</span>}
    </button>
  );
}
