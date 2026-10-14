import { z } from 'zod';
import type { FeedSourceCounts } from '@/types';

const sessionUserSchema = z.object({ userId: z.string().trim().min(1) }).passthrough();

// An invalid count is kept as null instead of failing the whole body: the
// viewer is signed in, but the session is an error until a read succeeds.
// Each count is checked on its own: Bridge counts them in separate
// statements, so they can briefly disagree.
const countSchema = z.number().int().nonnegative().nullable().catch(null);

export const signedInBodySchema = z.object({
  success: z.literal(true),
  authenticated: z.literal(true),
  user: sessionUserSchema,
  activeMembershipCount: countSchema,
  feedCuratorCount: countSchema,
}).transform(({ user, activeMembershipCount, feedCuratorCount }): SignedInBody => ({
  user,
  counts: activeMembershipCount !== null && feedCuratorCount !== null
    ? { activeMembershipCount, feedCuratorCount }
    : null,
}));

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type SignedInBody = { user: SessionUser; counts: FeedSourceCounts | null };

export type SessionRead =
  | { kind: 'authenticated'; user: SessionUser; counts: FeedSourceCounts }
  | { kind: 'signed-out' }
  | { kind: 'error' };

export function readSessionResponse(status: number, signedIn: SignedInBody | undefined): SessionRead {
  if (status === 401) return { kind: 'signed-out' };
  return status === 200 && signedIn?.counts
    ? { kind: 'authenticated', user: signedIn.user, counts: signedIn.counts }
    : { kind: 'error' };
}
