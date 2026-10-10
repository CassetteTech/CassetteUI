/** Reads the browser web-session envelope that Bridge returns for a signed-in viewer. */

import { z } from 'zod';

const sessionUserSchema = z.object({ userId: z.string().trim().min(1) }).passthrough();

const signedInSchema = z.object({
  success: z.literal(true),
  authenticated: z.literal(true),
  user: sessionUserSchema,
  // An invalid count is kept as null instead of failing the whole body: the
  // viewer is signed in, but the session is an error until a read succeeds.
  activeMembershipCount: z.number().int().nonnegative().nullable().catch(null),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;

/** A signed-in answer; `activeMembershipCount` is null when Bridge sent no valid count. */
export type SignedInBody = { user: SessionUser; activeMembershipCount: number | null };

export type SessionRead =
  | { kind: 'authenticated'; user: SessionUser; activeMembershipCount: number }
  | { kind: 'signed-out' }
  | { kind: 'error' };

// The response body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function readSignedInBody(body: unknown): SignedInBody | null {
  const parsed = signedInSchema.safeParse(body);
  return parsed.success
    ? { user: parsed.data.user, activeMembershipCount: parsed.data.activeMembershipCount }
    : null;
}

/**
 * Classifies a session read. Only a 401 means signed out; an outage or a
 * malformed answer, including a missing or invalid count, is an error, never
 * zero memberships and never a sign-out.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function readSessionResponse(status: number, body: unknown): SessionRead {
  if (status === 401) return { kind: 'signed-out' };
  const signedIn = status === 200 ? readSignedInBody(body) : null;
  return signedIn && signedIn.activeMembershipCount !== null
    ? { kind: 'authenticated', user: signedIn.user, activeMembershipCount: signedIn.activeMembershipCount }
    : { kind: 'error' };
}
