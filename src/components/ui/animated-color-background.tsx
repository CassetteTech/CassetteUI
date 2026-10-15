'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { BAYER } from '@/components/dither-kit/dither-paint';
import { type ColorPalette } from '@/services/color-extractor';

interface AnimatedColorBackgroundProps {
  palette: ColorPalette | null;
  duration?: number;
}

const DITHER_STEPS = 4;
const DITHER_CELL_CSS_PX = 4;

const BAYER_TILE_URI = (() => {
  const cells = BAYER.flatMap((row, y) =>
    row.map(
      (threshold, x) =>
        `<rect x='${x * DITHER_CELL_CSS_PX}' y='${y * DITHER_CELL_CSS_PX}' width='${DITHER_CELL_CSS_PX}' height='${DITHER_CELL_CSS_PX}' fill-opacity='${threshold}'/>`
    )
  ).join('');
  const size = 4 * DITHER_CELL_CSS_PX;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' shape-rendering='crispEdges'>${cells}</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();

const DITHER_TONES = Array.from({ length: DITHER_STEPS + 1 }, (_, step) => step / DITHER_STEPS).join(' ');

function hexToHslLocal(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToCss(h: number, s: number, l: number, alpha: number): string {
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}% / ${alpha.toFixed(3)})`;
}

function tone(
  hex: string,
  isDark: boolean,
  alpha: number,
  role: 'star' | 'support' = 'support'
): string {
  const { h, s, l } = hexToHslLocal(hex);
  const isNeutral = s < 0.12;
  const sat = isNeutral
    ? s
    : isDark
      ? Math.min(s * 1.05, 0.6)
      : Math.min(s * 1.1, role === 'star' ? 0.8 : 0.6);
  const light = isDark
    ? Math.max(0.2, Math.min(role === 'star' ? 0.36 : 0.3, l))
    : Math.max(role === 'star' ? 0.64 : 0.72, Math.min(0.86, l))
  ;
  return hslToCss(h, sat, light, alpha);
}

export const AnimatedColorBackground: React.FC<AnimatedColorBackgroundProps> = ({
  palette,
  duration = 3000,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const alphaCap = palette && palette.confidence < 0.4 ? 0.4 : 0.6;

  const meshBackground = React.useMemo(() => {
    if (!palette) return '';

    const starHsl = hexToHslLocal(palette.vibrant);
    const star = starHsl.s >= 0.2 ? palette.vibrant : palette.dominant;
    const support = star === palette.vibrant ? palette.dominant : palette.muted;

    const glow      = tone(star, isDark, alphaCap, 'star');
    const glowFade  = tone(star, isDark, 0, 'star');
    const side      = tone(support, isDark, alphaCap * 0.7);
    const sideFade  = tone(support, isDark, 0);
    const horizon   = tone(palette.muted, isDark, alphaCap * 0.6);
    const horizonFade = tone(palette.muted, isDark, 0);

    return [
      `radial-gradient(90vmax at 22% 85%, ${glow} 0%, ${glowFade} 50%)`,
      `radial-gradient(70vmax at 88% 70%, ${side} 0%, ${sideFade} 50%)`,
      `linear-gradient(to bottom, ${horizonFade} 46%, ${horizon} 100%)`,
    ].join(', ');
  }, [palette, alphaCap, isDark]);

  // Apply the mesh to <body> directly. On iOS Safari with viewport-fit=cover, body's
  // background paints the full layout viewport — including under the URL pill and home
  // indicator — unconditionally. A position:fixed wrapper can't match that because fixed
  // elements track the visual viewport (smaller when Safari chrome is visible) and can also
  // end up in odd stacking positions under transformed ancestors.
  React.useEffect(() => {
    const body = document.body;
    if (!palette) {
      body.style.backgroundImage = '';
      body.style.backgroundAttachment = '';
      body.style.backgroundBlendMode = '';
      body.style.transition = '';
      return;
    }
    body.style.backgroundImage = meshBackground;
    body.style.backgroundAttachment = 'fixed';
    body.style.backgroundBlendMode = 'normal';
    body.style.transition = `background-image ${duration}ms ease-in-out`;
    return () => {
      body.style.backgroundImage = '';
      body.style.backgroundAttachment = '';
      body.style.backgroundBlendMode = '';
      body.style.transition = '';
    };
  }, [palette, meshBackground, duration]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-background">
      <div
        className="absolute inset-0 transition-opacity ease-in-out motion-reduce:transition-none"
        style={{
          backgroundImage: meshBackground,
          opacity: palette ? 1 : 0,
          transitionDuration: `${duration}ms`,
          filter: 'url(#post-gradient-dither)',
        }}
      />
      <svg width="0" height="0" className="absolute">
        <filter id="post-gradient-dither" x="0" y="0" width="1" height="1" colorInterpolationFilters="sRGB">
          <feImage href={BAYER_TILE_URI} width={4 * DITHER_CELL_CSS_PX} height={4 * DITHER_CELL_CSS_PX} result="cell" />
          <feTile in="cell" result="bayer" />
          <feComposite
            in="SourceAlpha"
            in2="bayer"
            operator="arithmetic"
            k2={DITHER_STEPS / (DITHER_STEPS + 1)}
            k3={1 / (DITHER_STEPS + 1)}
            result="level"
          />
          <feComponentTransfer in="level" result="tone">
            <feFuncA type="discrete" tableValues={DITHER_TONES} />
          </feComponentTransfer>
          <feComponentTransfer in="SourceGraphic" result="ink">
            <feFuncA type="linear" slope="255" />
          </feComponentTransfer>
          <feComposite in="ink" in2="tone" operator="in" />
        </filter>
      </svg>
    </div>
  );
};
