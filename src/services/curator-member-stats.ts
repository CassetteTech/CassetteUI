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
  previousWindow: z.object({
    activeMembers: countSchema,
    newMembers: countSchema,
    endedMembers: countSchema,
  }).strict(),
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
