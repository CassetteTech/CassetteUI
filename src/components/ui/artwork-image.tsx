'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Music2 } from 'lucide-react';

import { cn } from '@/lib/utils';

type ArtworkImageProps = Omit<ImageProps, 'src' | 'alt'> & {
  src?: string | null;
  alt: string;
  fallbackClassName?: string;
  fallbackIconClassName?: string;
};

export function ArtworkImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackIconClassName,
  onLoad,
  onError,
  ...props
}: ArtworkImageProps) {
  const normalizedSrc = src?.trim() || '';
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const [loadedSrc, setLoadedSrc] = useState<string | null>(null);
  const failed = normalizedSrc !== '' && failedSrc === normalizedSrc;
  const loaded = loadedSrc === normalizedSrc;

  if (!normalizedSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          'flex h-full w-full items-center justify-center bg-muted text-muted-foreground',
          fallbackClassName,
        )}
      >
        <Music2 className={cn('size-[33%]', fallbackIconClassName)} aria-hidden="true" />
      </div>
    );
  }

  return (
    <Image
      {...props}
      src={normalizedSrc}
      alt={alt}
      className={cn(
        // Blur-up reveal: hidden+blurred until decoded, then eased in.
        // motion-reduce flips instantly.
        'transition-[opacity,filter] duration-500 ease-out motion-reduce:transition-none',
        loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm',
        className,
      )}
      onLoad={(event) => {
        setLoadedSrc(normalizedSrc);
        onLoad?.(event);
      }}
      onError={(event) => {
        setFailedSrc(normalizedSrc);
        onError?.(event);
      }}
    />
  );
}
