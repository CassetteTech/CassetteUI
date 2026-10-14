import { z } from 'zod';
import { tryStorage } from '@/lib/best-effort';

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
  tryStorage(() => window.sessionStorage.setItem(
    COHORT_KEY,
    JSON.stringify({ userId, cohort, expiresAt: nowMs + COHORT_TTL_MS } satisfies z.infer<typeof cohortRecordSchema>),
  ), undefined);
}

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
    return 'existing';
  }
}

export function getDeviceCategory(): 'mobile' | 'desktop' | undefined {
  try {
    const coarse = window.matchMedia('(pointer: coarse)').matches;
    return coarse || window.innerWidth < 768 ? 'mobile' : 'desktop';
  } catch {
    return undefined;
  }
}
