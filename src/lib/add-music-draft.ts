import type { PlatformUiKey } from '@/lib/platforms';
import type { PostPrivacy } from '@/types';

/**
 * Keeps an Add music draft while the post page follows its conversion, so a failure
 * there brings the person back to the form as they left it, with the error shown.
 * Module memory, like the conversion handoff: it only has to survive client-side
 * route changes.
 */
export interface AddMusicDraft {
  /** The form's path with its query (`from`, a prefilled link). */
  path: string;
  /** The music link being converted. */
  link: string;
  /** The search result picked, when the music came from search. */
  selection: { title: string; artist: string; type: string; url: string; coverArtUrl: string } | null;
  description: string;
  privacy: PostPrivacy;
  /** The owner's own playlist links, by service. */
  platformLinks: Partial<Record<PlatformUiKey, string>>;
  /** The handoff added a history entry, so going back to the form removes it. */
  pushed: boolean;
}

export type ReturnedAddMusicDraft = AddMusicDraft & { errorMessage: string };

let held: { idempotencyKey: string; draft: AddMusicDraft } | null = null;
let returned: ReturnedAddMusicDraft | null = null;

export function holdAddMusicDraft(idempotencyKey: string, draft: AddMusicDraft): void {
  held = { idempotencyKey, draft };
}

/**
 * The conversion failed: hands its draft back to the form with the error. Returns the
 * draft, to go back to its form, or null when no draft is held for this conversion.
 */
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
