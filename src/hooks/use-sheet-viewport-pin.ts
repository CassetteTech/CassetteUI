'use client';

import { useEffect, useRef } from 'react';

/**
 * Pins a full-screen mobile sheet to the *visual* viewport while active.
 *
 * iOS Safari anchors `position: fixed` to the layout viewport; when the
 * keyboard opens it pans the visual viewport instead, so a fixed-top sheet
 * (search bar + list header) can slide out of view the moment the input
 * focuses. While active, this translates the sheet by
 * `visualViewport.offsetTop` and clamps its height to
 * `visualViewport.height`, so the bar always hugs the visible top and the
 * list is never hidden behind the keyboard.
 *
 * Safari's focus auto-scroll can also move the document underneath the
 * sheet, so the pre-open scroll position is captured and restored on close.
 *
 * Desktop (lg) sheets are static in-flow — the hook is a no-op there.
 */
export function useSheetViewportPin(active: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    const vv = window.visualViewport;
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (!el || isDesktop) return;

    const savedScrollY = window.scrollY;

    const apply = () => {
      if (!vv) return;
      el.style.transform = `translateY(${vv.offsetTop}px)`;
      el.style.height = `${vv.height}px`;
      el.style.bottom = 'auto';
    };

    apply();
    vv?.addEventListener('resize', apply);
    vv?.addEventListener('scroll', apply);

    return () => {
      vv?.removeEventListener('resize', apply);
      vv?.removeEventListener('scroll', apply);
      el.style.transform = '';
      el.style.height = '';
      el.style.bottom = '';
      window.scrollTo(0, savedScrollY);
    };
  }, [active]);

  return ref;
}
