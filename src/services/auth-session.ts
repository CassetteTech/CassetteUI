import { z } from 'zod';
import type { FeedSourceCounts } from '@/types';

const sessionUserSchema = z.object({ userId: z.string().trim().min(1) }).passthrough();

// An invalid count is kept as null instead of failing the whole body: the
// viewer is signed in, but the session is an error until a read succeeds.
// Each count is checked on its own: Bridge counts them in separate
// statements, so they can briefly disagree.
const countSchema = z.number().int().nonnegative().nullable().catch(null);

const signedInSchema = z.object({
  success: z.literal(true),
  authenticated: z.literal(true),
  user: sessionUserSchema,
  activeMembershipCount: countSchema,
  feedCuratorCount: countSchema,
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

export type SignedInBody = { user: SessionUser; counts: FeedSourceCounts | null };

export type SessionRead =
  | { kind: 'authenticated'; user: SessionUser; counts: FeedSourceCounts }
  | { kind: 'signed-out' }
  | { kind: 'error' };

// The response body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function readSignedInBody(body: unknown): SignedInBody | null {
  const parsed = signedInSchema.safeParse(body);
  if (!parsed.success) return null;
  const { user, activeMembershipCount, feedCuratorCount } = parsed.data;
  return {
    user,
    counts: activeMembershipCount !== null && feedCuratorCount !== null
      ? { activeMembershipCount, feedCuratorCount }
      : null,
  };
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function readSessionResponse(status: number, body: unknown): SessionRead {
  if (status === 401) return { kind: 'signed-out' };
  const signedIn = status === 200 ? readSignedInBody(body) : null;
  return signedIn?.counts
    ? { kind: 'authenticated', user: signedIn.user, counts: signedIn.counts }
    : { kind: 'error' };
}
