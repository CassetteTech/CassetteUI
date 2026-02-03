/**
 * Utility for managing pending playlist creation actions across auth flows.
 * Uses sessionStorage to persist actions that need to resume after signin/OAuth.
 */

export type PlatformKey = 'spotify' | 'appleMusic' | 'deezer';

export interface PendingPlaylistAction {
  type: 'create_playlist';
  platform: PlatformKey;
  playlistId: string;
  returnUrl: string;
  timestamp: number;
}

const STORAGE_KEY = 'cassette_pending_action';
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

export const pendingActionService = {
  /**
   * Save a pending action to sessionStorage
   */
  save(action: PendingPlaylistAction): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  },

  /**
   * Retrieve the pending action, returning null if expired or invalid
   */
  get(): PendingPlaylistAction | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      const action = JSON.parse(stored) as PendingPlaylistAction;
      // Check if action is expired
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

  /**
   * Clear any pending action
   */
  clear(): void {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(STORAGE_KEY);
  },

  /**
   * Helper to create a playlist action object
   */
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
