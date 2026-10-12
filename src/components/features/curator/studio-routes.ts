/** Curator Studio URLs: one per dashboard view, the section anchors inside them, and Add music. */

export type StudioView = 'studio-overview' | 'studio-music' | 'studio-earnings' | 'studio-billing';

/** Each Studio view has its own URL; the dashboard layout shows the view whose path is open. */
export const studioPaths = {
  'studio-overview': '/studio',
  'studio-music': '/studio/music',
  'studio-earnings': '/studio/members',
  'studio-billing': '/studio/payouts',
} satisfies Record<StudioView, string>;

const studioViews: readonly StudioView[] = ['studio-overview', 'studio-music', 'studio-earnings', 'studio-billing'];

/** The view a Studio path shows, or null outside the dashboard views. */
export function studioViewOfPath(pathname: string | null): StudioView | null {
  return studioViews.find((view) => studioPaths[view] === pathname) ?? null;
}

/** Resolves a section anchor (e.g. "#studio-pro") or a view id to the dashboard view that hosts it.
    The membership plan lives on the overview. */
export function studioViewOf(sectionId: string): StudioView {
  switch (sectionId) {
    case 'studio-overview':
    case 'studio-music':
    case 'studio-earnings':
    case 'studio-billing':
      return sectionId;
    case 'studio-pro':
    case 'studio-payouts':
      return 'studio-billing';
    default:
      return 'studio-overview';
  }
}

/** The Add music page. `from` is the Studio URL its Back and its finished post return to. */
export const addMusicHref = (from: string) => `/studio/music/new?from=${encodeURIComponent(from)}`;

/** The URL of a section, for links that also work in a new tab. */
export const studioHref = (sectionId: string) => `${studioPaths[studioViewOf(sectionId)]}#${sectionId}`;
