import { z } from 'zod';

import { PLAYLIST_CREATION_PLATFORM_UI_KEYS, type PlatformUiKey } from '../lib/platforms';
import { normalizeAuthRedirect } from './auth-redirect';

export type PlatformKey = PlatformUiKey;

export interface PendingPlaylistAction {
  type: 'create_playlist';
  platform: PlatformKey;
  playlistId: string;
  returnUrl: string;
  timestamp: number;
}

export interface PendingAddToProfileAction {
  type: 'add_to_profile';
  postId: string;
  returnUrl: string;
  timestamp: number;
}

export type PendingAction = PendingPlaylistAction | PendingAddToProfileAction;

const STORAGE_KEY = 'cassette_pending_action';
const MAX_AGE_MS = 10 * 60 * 1000;

const storedActionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create_playlist'),
    platform: z.enum(PLAYLIST_CREATION_PLATFORM_UI_KEYS),
    playlistId: z.string().min(1),
    returnUrl: z.string(),
    timestamp: z.number().finite(),
  }),
  z.object({
    type: z.literal('add_to_profile'),
    postId: z.string().min(1),
    returnUrl: z.string(),
    timestamp: z.number().finite(),
  }),
]);

const postReturnPath = (postId: string) => `/post/${encodeURIComponent(postId)}`;

// The local path for a stored return URL. Playlist actions store the full
// page URL, so a same-origin URL becomes its path; the sign-in redirect rules
// then decide whether the path is safe.
const toLocalReturnPath = (returnUrl: string) => {
  try {
    const url = new URL(returnUrl, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    return normalizeAuthRedirect(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return null;
  }
};

// Session storage is page-writable, and a stored action can write for the
// signed-in account, so each read checks the shape, the age, and the return
// path again.
const parseStoredAction = (stored: string): PendingAction | null => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(stored);
  } catch {
    return null;
  }

  const result = storedActionSchema.safeParse(parsed);
  if (!result.success) return null;
  const action = result.data;

  const age = Date.now() - action.timestamp;
  if (age < 0 || age > MAX_AGE_MS) return null;

  const returnUrl = toLocalReturnPath(action.returnUrl);
  if (!returnUrl) return null;
  // A post save returns only to the post it saves.
  if (action.type === 'add_to_profile' && returnUrl !== postReturnPath(action.postId)) return null;

  return { ...action, returnUrl };
};

export const pendingActionService = {
  save(action: PendingAction): void {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(action));
  },

  get(): PendingAction | null {
    if (typeof window === 'undefined') return null;
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const action = parseStoredAction(stored);
    if (!action) this.clear();
    return action;
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

  createAddToProfileAction(postId: string): PendingAddToProfileAction {
    return {
      type: 'add_to_profile',
      postId,
      returnUrl: postReturnPath(postId),
      timestamp: Date.now(),
    };
  },
};
