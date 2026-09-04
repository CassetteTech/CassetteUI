// Derives the bounded audience dimensions (cohort, device) shared by membership funnel events.

import { z } from 'zod';

// Cohort is the purchase journey, not account age: the Google callback is the
// one place that knows whether this sign-in created the account (not yet
// onboarded) or resumed one. The record is scoped to that user id and kept
// for the tab through checkout return, activation, and first member content
// view; a different account in the same tab never inherits it.
const COHORT_KEY = 'cassette_membership_cohort';
const COHORT_TTL_MS = 24 * 60 * 60 * 1000;

const cohortSchema = z.enum(['new', 'existing']);
const cohortRecordSchema = z.object({
  userId: z.string().min(1),
  cohort: cohortSchema,
  expiresAt: z.number(),
});

export type UserCohort = z.infer<typeof cohortSchema>;

export function rememberUserCohort(userId: string, cohort: UserCohort, nowMs = Date.now()): void {
  try {
    window.sessionStorage.setItem(
      COHORT_KEY,
      JSON.stringify({ userId, cohort, expiresAt: nowMs + COHORT_TTL_MS } satisfies z.infer<typeof cohortRecordSchema>),
    );
  } catch {
    // Storage unavailable: events fall back to 'existing' for signed-in users.
  }
}

// Undefined while signed out; the remembered journey cohort for this user,
// with 'existing' for authenticated starts that never passed the callback.
export function getUserCohort(userId: string | null | undefined, nowMs = Date.now()): UserCohort | undefined {
  if (!userId) return undefined;
  try {
    const raw = window.sessionStorage.getItem(COHORT_KEY);
    if (!raw) return 'existing';
    const record = cohortRecordSchema.safeParse(JSON.parse(raw));
    return record.success && record.data.userId === userId && record.data.expiresAt > nowMs
      ? record.data.cohort
      : 'existing';
  } catch {
    // No window (server) or unreadable storage: 'existing' is the safe default.
    return 'existing';
  }
}

export function getDeviceCategory(): 'mobile' | 'desktop' | undefined {
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    return coarse || window.innerWidth < 768 ? 'mobile' : 'desktop';
  } catch {
    // No window (server) or no matchMedia: leave the dimension unset.
    return undefined;
  }
}
