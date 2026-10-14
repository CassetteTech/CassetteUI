/** Curator Studio URLs: one per dashboard view, the section anchors inside them, and Add music. */

export type StudioView = 'studio-music' | 'studio-membership' | 'studio-billing';

/** Each Studio view has its own URL; the dashboard layout shows the view whose path is open. Studio
    opens on Music: `/studio` redirects there (next.config.ts). */
export const studioPaths = {
  'studio-music': '/studio/music',
  'studio-membership': '/studio/membership',
  'studio-billing': '/studio/payouts',
} satisfies Record<StudioView, string>;

/** Each view's name, in the section links and in Back links that return to it. */
export const studioLabels = {
  'studio-music': 'Music',
  'studio-membership': 'Membership',
  'studio-billing': 'Payouts & billing',
} satisfies Record<StudioView, string>;

/** The dashboard views, in the order of the section links. */
export const studioViews: readonly StudioView[] = ['studio-music', 'studio-membership', 'studio-billing'];

/** The view a Studio path shows, or null outside the dashboard views. */
export function studioViewOfPath(pathname: string | null): StudioView | null {
  return studioViews.find((view) => studioPaths[view] === pathname) ?? null;
}

/** Resolves a section anchor (e.g. "#studio-pro") or a view id to the dashboard view that hosts it.
    The membership setup, the plan, and the members live on the Membership view;
    anything else, such as the header's share links, is on every view and resolves to Music. */
export function studioViewOf(sectionId: string): StudioView {
  switch (sectionId) {
    case 'studio-music':
    case 'studio-membership':
    case 'studio-billing':
      return sectionId;
    case 'studio-setup':
    case 'studio-plan':
    case 'studio-members':
      return 'studio-membership';
    case 'studio-pro':
    case 'studio-payouts':
      return 'studio-billing';
    default:
      return 'studio-music';
  }
}

/** The Add music page. `from` is the URL its Back and its finished post return to. */
export const addMusicHref = (from: string) => `/studio/music/new?from=${encodeURIComponent(from)}`;

/** Music library filters as they appear in the URL; a missing value shows everything. */
export const musicTypes = ['playlists', 'tracks', 'albums', 'artists'] as const;
export type MusicType = (typeof musicTypes)[number];
export const musicAudiences = ['public', 'members', 'private'] as const;
export type MusicAudience = (typeof musicAudiences)[number];

/** The Music library, narrowed to one type of music and to who can open it. */
export function studioMusicHref({ type, audience }: { type?: MusicType | null; audience?: MusicAudience | null } = {}) {
  const query = new URLSearchParams();
  if (type) query.set('type', type);
  if (audience) query.set('audience', audience);
  const search = query.toString();
  return search ? `${studioPaths['studio-music']}?${search}` : studioPaths['studio-music'];
}

/** The URL of a section, for links that also work in a new tab. */
export const studioHref = (sectionId: string) => `${studioPaths[studioViewOf(sectionId)]}#${sectionId}`;
