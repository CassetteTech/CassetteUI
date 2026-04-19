'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { ColorExtractor, type ColorPalette } from '@/services/color-extractor';

interface AnimatedColorBackgroundProps {
  /** Full palette from ColorExtractor. If null, the background reverts to theme default. */
  palette: ColorPalette | null;
  /** Duration of the palette crossfade between posts, in ms. */
  duration?: number;
}

// Static SVG grain — feTurbulence noise, desaturated via feColorMatrix, tiled seamlessly.
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

  const shouldClamp = palette
    ? palette.confidence < 0.4 || (!isDark && ColorExtractor.isLightColor(palette.dominant))
    : false;

  const blendMode = !isDark || shouldClamp ? 'multiply' : 'screen';
  const alphaCap = shouldClamp ? 0.55 : isDark ? 0.95 : 0.85;

  const meshBackground = React.useMemo(() => {
    if (!palette) return '';

    const accentSource = palette.vibrant || palette.analogous?.[0] || palette.dominant;

    const primary = hexWithAlpha(palette.dominant, alphaCap);
    const accent  = hexWithAlpha(accentSource, alphaCap * 0.9);
    const fill    = hexWithAlpha(palette.muted, alphaCap * 0.75);
    const topPeek = hexWithAlpha(accentSource, alphaCap * 0.55);
    const washMid = hexWithAlpha(palette.muted, alphaCap * 0.35);
    const washEnd = hexWithAlpha(palette.muted, alphaCap * 0.50);

    return [
      `radial-gradient(120vmax at 50% 110%, ${fill} 0%, ${palette.muted}00 62%)`,
      `radial-gradient(85vmax at 15% 100%, ${primary} 0%, ${palette.dominant}00 58%)`,
      `radial-gradient(75vmax at 90% 95%, ${accent} 0%, ${accentSource}00 58%)`,
      `radial-gradient(55vmax at 100% -10%, ${topPeek} 0%, ${accentSource}00 55%)`,
      `linear-gradient(to bottom, ${palette.muted}00 8%, ${washMid} 45%, ${washEnd} 100%)`,
    ].join(', ');
  }, [palette, alphaCap]);

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
    body.style.backgroundBlendMode = blendMode;
    body.style.transition = `background-image ${duration}ms ease-in-out`;
    return () => {
      body.style.backgroundImage = '';
      body.style.backgroundAttachment = '';
      body.style.backgroundBlendMode = '';
      body.style.transition = '';
    };
  }, [palette, meshBackground, blendMode, duration]);

  // Grain overlay stays as a pointer-none fixed element at -z-10; its small footprint in
  // the Safari chrome area is imperceptible. mix-blend-soft-light needs the blob colors
  // under it, so this sits above the body's background image.
  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none"
      aria-hidden="true"
      style={{
        backgroundImage: GRAIN_DATA_URI,
        backgroundSize: '240px 240px',
        mixBlendMode: 'soft-light',
        opacity: palette ? 0.12 : 0,
        transition: `opacity ${duration}ms ease-in-out`,
      }}
    />
  );
};
