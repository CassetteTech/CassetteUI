'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost';

interface BackButtonProps {
  route?: string;
  fallbackRoute?: string;
  variant?: 'icon' | 'button';
  label?: string;
  children?: React.ReactNode;
  onClick?: () => void;
  className?: string;
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
      type="button"
      onClick={handleClick}
      aria-label={label ? undefined : 'Go back'}
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
