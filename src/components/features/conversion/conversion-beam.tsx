'use client';

import React, { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { BorderBeam } from 'border-beam';

interface ConversionBeamProps {
  children: React.ReactNode;
  /** Whether the beam is running. Flipping to false fades it out gracefully. */
  active: boolean;
  /**
   * Border radius of the wrapped card. When omitted, the beam auto-detects
   * the child's radius (handles responsive radii like UrlBar's).
   */
  borderRadius?: number;
  /** Called after the fade-out completes when active flips to false. */
  onDeactivate?: () => void;
  className?: string;
}

/**
 * ConversionBeam - the `border-beam` package on Cassette's terms.
 *
 * The package's `md` preset is kept at its tuned defaults (duration,
 * strength, brightness) — its look is the point. The only brand adaptations:
 * the warm `sunset` palette instead of the rainbow default, a small
 * `--beam-hue-base` pull toward brand red, and theme resolved from
 * next-themes (the package's 'auto' follows the OS, which can disagree with
 * the in-app theme switcher).
 */
export const ConversionBeam: React.FC<ConversionBeamProps> = ({
  children,
  active,
  borderRadius,
  onDeactivate,
  className,
}) => {
  const { resolvedTheme } = useTheme();
  // next-themes resolves the theme on the client before hydration but not on
  // the server, so the beam keeps its dark default until hydrated; the light
  // styles would otherwise mismatch the server HTML.
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);

  return (
    <BorderBeam
      size="md"
      colorVariant="sunset"
      theme={hydrated && resolvedTheme === 'light' ? 'light' : 'dark'}
      active={active}
      borderRadius={borderRadius}
      onDeactivate={onDeactivate}
      className={className}
      // SAFETY: CSSProperties has no custom-property keys; the value is a plain CSS angle.
      style={{ '--beam-hue-base': '-12deg' } as React.CSSProperties}
    >
      {children}
    </BorderBeam>
  );
};
