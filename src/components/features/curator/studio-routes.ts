export type StudioView = 'studio-music' | 'studio-membership' | 'studio-billing';

/** Each Studio view has its own URL; the dashboard layout shows the view whose path is open. Studio
    opens on Music: `/studio` redirects there (next.config.ts). */
export const studioPaths = {
  'studio-music': '/studio/music',
  'studio-membership': '/studio/membership',
  'studio-billing': '/studio/payouts',
} satisfies Record<StudioView, string>;

export const studioLabels = {
  'studio-music': 'Music',
  'studio-membership': 'Membership',
  'studio-billing': 'Payouts & billing',
} satisfies Record<StudioView, string>;

export const studioViews: readonly StudioView[] = ['studio-music', 'studio-membership', 'studio-billing'];

export function studioViewOfPath(pathname: string | null): StudioView | null {
  return studioViews.find((view) => studioPaths[view] === pathname) ?? null;
}

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

export const addMusicHref = (from: string) => `/studio/music/new?from=${encodeURIComponent(from)}`;

export const musicTypes = ['playlists', 'tracks', 'albums', 'artists'] as const;
export type MusicType = (typeof musicTypes)[number];
export const musicAudiences = ['public', 'members', 'private'] as const;
export type MusicAudience = (typeof musicAudiences)[number];

export function studioMusicHref({ type, audience }: { type?: MusicType | null; audience?: MusicAudience | null } = {}) {
  const query = new URLSearchParams();
  if (type) query.set('type', type);
  if (audience) query.set('audience', audience);
  const search = query.toString();
  return search ? `${studioPaths['studio-music']}?${search}` : studioPaths['studio-music'];
}

export const studioHref = (sectionId: string) => `${studioPaths[studioViewOf(sectionId)]}#${sectionId}`;
