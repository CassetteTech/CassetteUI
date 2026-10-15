import type { PlatformUiKey } from '@/lib/platforms';

export type PlatformKey = PlatformUiKey;

export interface PendingPlaylistAction {
  type: 'create_playlist';
  platform: PlatformKey;
  playlistId: string;
  returnUrl: string;
  timestamp: number;
}

const STORAGE_KEY = 'cassette_pending_action';
const MAX_AGE_MS = 10 * 60 * 1000;

export const pendingActionService = {
  save(action: PendingPlaylistAction): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  },

  get(): PendingPlaylistAction | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      const action = JSON.parse(stored) as PendingPlaylistAction;
      if (Date.now() - action.timestamp > MAX_AGE_MS) {
        this.clear();
        return null;
      }
      return action;
    } catch {
      this.clear();
      return null;
    }
  },

  clear(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  },

  createPlaylistAction(
    platform: PlatformKey,
    playlistId: string,
    returnUrl: string
  ): PendingPlaylistAction {
    return {
      type: 'create_playlist',
      platform,
      playlistId,
      returnUrl,
      timestamp: Date.now(),
    };
  },
};
