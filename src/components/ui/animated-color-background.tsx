'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { type ColorPalette } from '@/services/color-extractor';

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

// ─── Tone mapping ────────────────────────────────────────────────────────────
// Raw extracted colors can be any lightness; compositing them directly over the
// theme surface produces mud (dark album colors × cream paper) or glare. Instead
// we re-tone every palette color into a band that sits comfortably on the current
// surface, keeping the HUE (the part that identifies the album) and taming the rest.

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

/**
 * Clamp a color into a theme band. Light mode gets pastel washes that tint the
 * cream paper without swallowing it; dark mode gets deep jewel tones that glow
 * against the charcoal without going black. Near-grayscale colors stay neutral
 * (no fake saturation), so B&W artwork yields a quiet page instead of mud.
 */
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

  // Low-confidence extractions (busy or near-monochrome art) get a quieter wash.
  const alphaCap = palette && palette.confidence < 0.4 ? 0.5 : 0.85;

  const meshBackground = React.useMemo(() => {
    if (!palette) return '';

    // The "star" is the most chromatic color — it identifies the record.
    // Dominant (most populous) is often a dull background; use it as support.
    const starHsl = hexToHslLocal(palette.vibrant);
    const star = starHsl.s >= 0.2 ? palette.vibrant : palette.dominant;
    const support = star === palette.vibrant ? palette.dominant : palette.muted;

    const glow      = tone(star, isDark, alphaCap, 'star');
    const glowFade  = tone(star, isDark, 0, 'star');
    const side      = tone(support, isDark, alphaCap * 0.7);
    const sideFade  = tone(support, isDark, 0);
    const horizon   = tone(palette.muted, isDark, alphaCap * 0.6);
    const horizonFade = tone(palette.muted, isDark, 0);

    // Coverage is deliberately partial: the top ~third stays theme paper so the
    // page still reads as Cassette, with the album glowing up from below.
    return [
      `radial-gradient(90vmax at 22% 85%, ${glow} 0%, ${glowFade} 60%)`,
      `radial-gradient(70vmax at 88% 70%, ${side} 0%, ${sideFade} 55%)`,
      `linear-gradient(to bottom, ${horizonFade} 38%, ${horizon} 100%)`,
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
    // Colors are pre-toned to sit on the theme surface, so plain compositing is
    // predictable — multiply/screen were the source of the muddy full-page wash.
    body.style.backgroundBlendMode = 'normal';
    body.style.transition = `background-image ${duration}ms ease-in-out`;
    return () => {
      body.style.backgroundImage = '';
      body.style.backgroundAttachment = '';
      body.style.backgroundBlendMode = '';
      body.style.transition = '';
    };
  }, [palette, meshBackground, duration]);

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
