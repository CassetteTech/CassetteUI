'use client';

import React, { useSyncExternalStore } from 'react';
import { useTheme } from 'next-themes';
import { BorderBeam } from 'border-beam';

interface ConversionBeamProps {
  children: React.ReactNode;
  active: boolean;
  borderRadius?: number;
  onDeactivate?: () => void;
  className?: string;
}

/**
 * Theme is resolved from next-themes: the package's 'auto' follows the OS,
 * which can disagree with the in-app theme switcher.
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
      style={{ '--beam-hue-base': '-12deg' }}
    >
      {children}
    </BorderBeam>
  );
};
