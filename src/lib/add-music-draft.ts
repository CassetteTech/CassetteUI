import type { PostPrivacy } from '@/types';

export interface AddMusicDraft {
  path: string;
  link: string;
  selection: { title: string; artist: string; type: string; url: string; coverArtUrl: string } | null;
  description: string;
  privacy: PostPrivacy;
  pushed: boolean;
}

export type ReturnedAddMusicDraft = AddMusicDraft & { errorMessage: string };

let held: { idempotencyKey: string; draft: AddMusicDraft } | null = null;
let returned: ReturnedAddMusicDraft | null = null;

export function holdAddMusicDraft(idempotencyKey: string, draft: AddMusicDraft): void {
  held = { idempotencyKey, draft };
}

export function returnAddMusicDraft(idempotencyKey: string, errorMessage: string): ReturnedAddMusicDraft | null {
  if (held?.idempotencyKey !== idempotencyKey) return null;
  returned = { ...held.draft, errorMessage };
  held = null;
  return returned;
}

/** Reading does not consume the draft, so a StrictMode double render reads the same value. */
export function readReturnedAddMusicDraft(): ReturnedAddMusicDraft | null {
  return returned;
}

export function clearReturnedAddMusicDraft(draft: ReturnedAddMusicDraft): void {
  if (returned === draft) returned = null;
}
