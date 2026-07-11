import Image from 'next/image';
import { cn } from '@/lib/utils';
import { KOFI_ICON_SRC } from '@/lib/ko-fi';

// The Ko-fi logomark asset is 161x130, not square. Size props must follow
// that ratio — and both dimensions must be pinned in styles — or next/image
// warns in dev that one dimension was CSS-modified (Tailwind preflight sets
// img { height: auto }).
const INTRINSIC_WIDTH = 161;
const INTRINSIC_HEIGHT = 130;

interface KofiIconProps {
  width?: number;
  alt?: string;
  className?: string;
}

export function KofiIcon({ width = 20, alt = 'Ko-fi', className }: KofiIconProps) {
  const height = Math.round((width * INTRINSIC_HEIGHT) / INTRINSIC_WIDTH);
  return (
    <Image
      src={KOFI_ICON_SRC}
      alt={alt}
      width={width}
      height={height}
      className={cn('shrink-0', className)}
      style={{ width, height }}
    />
  );
}
