'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';
import { Music2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Artwork already shown in this tab. Showing it again (the finished post after a
 * conversion, or a revisit) skips the blur-up, so artwork the visitor has just
 * seen does not fade out and back in.
 */
const shownArtwork = new Set<string>();

/**
 * Loads and decodes artwork before it is shown, then marks it as shown so it renders at
 * once, without the blur-up. Resolves when the image is ready or failed; never rejects.
 */
export function preloadArtwork(src: string): Promise<void> {
  const normalizedSrc = src.trim();
  if (!normalizedSrc || shownArtwork.has(normalizedSrc)) return Promise.resolve();
  const image = new window.Image();
  const loaded = new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error('artwork failed to load'));
  });
  image.src = normalizedSrc;
  // decode() also waits for the pixels; a browser without it stops at the load event.
  return loaded.then(() => image.decode?.()).then(
    () => { shownArtwork.add(normalizedSrc); },
    () => {},
  );
}

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
  const loaded = loadedSrc === normalizedSrc || shownArtwork.has(normalizedSrc);

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
        'transition-[opacity,filter] duration-500 ease-out motion-reduce:transition-none',
        loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm',
        className,
      )}
      onLoad={(event) => {
        shownArtwork.add(normalizedSrc);
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
