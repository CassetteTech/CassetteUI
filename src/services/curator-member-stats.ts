/** Parses and requests the curator's member counts for a trailing window of
    UTC days: counts only, never fan identities. A membership ends when its
    access ends, not when the fan cancels; until then it is not renewing. */

import { z } from 'zod';
import { CuratorPageError } from './curator';

const countSchema = z.number().int().nonnegative().max(2_147_483_647);
const daysSchema = countSchema.min(7).max(365);

const curatorMemberStatsSchema = z.object({
  days: daysSchema,
  activeMembers: countSchema,
  newMembers: countSchema,
  endedMembers: countSchema,
  notRenewingMembers: countSchema,
  /** The `days` before the window; its activeMembers is the count at the window start. */
  previousWindow: z.object({
    activeMembers: countSchema,
    newMembers: countSchema,
    endedMembers: countSchema,
  }).strict(),
  /** One count per UTC day, oldest first; the last is now. */
  daily: z.array(z.object({
    date: z.string().date(),
    activeMembers: countSchema,
  }).strict()).max(365),
}).strict().superRefine((stats, context) => {
  if (stats.daily.length !== stats.days || stats.notRenewingMembers > stats.activeMembers) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Member counts are inconsistent' });
  }
});

export type CuratorMemberStats = z.infer<typeof curatorMemberStatsSchema>;

/** Top of the member trend's y axis: about 30% above the busiest day, rounded up to a
    whole step of 1, 2, or 5 times a power of ten (three steps from zero), so the line
    never touches the top. One member gives an axis of 0 to 2, 18 members 0 to 30. */
export function memberAxisMax(peak: number): number {
  const target = Math.max(peak, 1) * 1.3;
  const roughStep = target / 3;
  const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
  const step = [1, 2, 5, 10].map((multiple) => multiple * magnitude).find((size) => size >= roughStep) ?? 10 * magnitude;
  return Math.ceil(target / step) * step;
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorMemberStats = (value: unknown): CuratorMemberStats =>
  curatorMemberStatsSchema.parse(value);

export async function fetchCuratorMemberStats(
  days: number,
  signal?: AbortSignal,
): Promise<CuratorMemberStats> {
  const query = new URLSearchParams({ days: String(daysSchema.parse(days)) });
  const response = await fetch(`/api/v1/curators/me/member-stats?${query}`, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new CuratorPageError('Failed to load member counts', response.status);
  }
  return parseCuratorMemberStats(await response.json());
}
