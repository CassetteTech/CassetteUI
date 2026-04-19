'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { ColorExtractor, type ColorPalette } from '@/services/color-extractor';

interface AnimatedColorBackgroundProps {
  /** Full palette from ColorExtractor. If null, the background fades out. */
  palette: ColorPalette | null;
  /** Duration of the opacity/palette crossfade between posts, in ms. */
  duration?: number;
}

// Static SVG grain — feTurbulence noise, desaturated via feColorMatrix, tiled seamlessly.
// Breaks up banding on large color fields; compiled once per page load.
const GRAIN_DATA_URI = (() => {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)'/>
  </svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
})();

function hexWithAlpha(hex: string, alpha: number): string {
  const clamped = Math.max(0, Math.min(1, alpha));
  const a = Math.round(clamped * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

export const AnimatedColorBackground: React.FC<AnimatedColorBackgroundProps> = ({
  palette,
  duration = 3000,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Clamp intensity when the dominant hue would wash out content: pale covers in light mode,
  // or low-confidence extractions where the palette isn't trustworthy enough to commit to.
  const shouldClamp = palette
    ? palette.confidence < 0.4 || (!isDark && ColorExtractor.isLightColor(palette.dominant))
    : false;

  // screen in dark mode boosts luminance on a dark floor; multiply tints against a light floor.
  const blendMode = !isDark || shouldClamp ? 'multiply' : 'screen';

  const alphaCap = shouldClamp ? 0.55 : isDark ? 0.95 : 0.85;

  const meshBackground = React.useMemo(() => {
    if (!palette) return 'transparent';

    const accentSource = palette.vibrant || palette.analogous?.[0] || palette.dominant;

    // Weight concentrated in the bottom half so the top of the viewport fades cleanly into
    // `--background` (no hard seam against the navbar). A small accent peeks in from the
    // top-right corner (mostly off-canvas) to keep the composition asymmetric.
    const primary = hexWithAlpha(palette.dominant, alphaCap);
    const accent  = hexWithAlpha(accentSource, alphaCap * 0.9);
    const topPeek = hexWithAlpha(accentSource, alphaCap * 0.55);

    const blobs = [
      // Bottom-left anchor: the dominant color carries the visual weight.
      `radial-gradient(95vmax at 20% 110%, ${primary} 0%, ${palette.dominant}00 62%)`,
      // Bottom-right counterbalance.
      `radial-gradient(70vmax at 85% 95%, ${accent} 0%, ${accentSource}00 60%)`,
      // Top-right peek: center pushed off-screen so it fades out before reaching the navbar.
      `radial-gradient(55vmax at 100% -10%, ${topPeek} 0%, ${accentSource}00 55%)`,
    ].join(', ');

    return `${blobs}, hsl(var(--background))`;
  }, [palette, alphaCap]);

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none overflow-hidden"
      aria-hidden="true"
      style={{
        opacity: palette ? 1 : 0,
        transition: `opacity ${duration}ms ease-in-out`,
      }}
    >
      <div
        className="absolute -inset-[8%] mesh-drift"
        style={{
          background: meshBackground,
          backgroundBlendMode: blendMode,
          transition: `background ${duration}ms ease-in-out`,
          willChange: 'transform',
        }}
      />
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          backgroundImage: GRAIN_DATA_URI,
          backgroundSize: '240px 240px',
          opacity: 0.12,
        }}
      />
    </div>
  );
};
