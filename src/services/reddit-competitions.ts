import { z } from 'zod';

const id = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const postId = z.string().regex(/^t3_[a-z0-9]+$/);
const subredditName = z.string().regex(/^[a-z0-9_]{3,21}$/);
export const communitySchema = z.object({
  subreddit: subredditName, enabled: z.boolean(),
  timeZone: z.string(), dayOfWeek: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23), minute: z.number().int().min(0).max(59),
  excludedFlairs: z.string(), nextRunUtc: timestamp.nullable(), lastSeenUtc: timestamp,
  introduction: z.string(), closing: z.string(), weekOneDate: z.string().date().nullable(),
  testMode: z.boolean(), revision: id,
});
export const roundSchema = z.object({
  id, subreddit: subredditName, revision: id,
  startUtc: timestamp, endUtc: timestamp, updatedAtUtc: timestamp,
  status: z.enum(['collecting', 'draft', 'queued', 'publishing', 'published', 'generation_failed', 'publication_uncertain']),
  title: z.string(), body: z.string(), report: z.string(),
  candidates: z.array(z.object({ postId, sourcePostId: postId, title: z.string(), author: z.string(),
    playlistUrl: z.string().url().refine(value => value.startsWith('https://')), score: z.number(),
    cassettePostId: z.string().nullish(), cassetteUrl: z.string().url().nullish(),
    conversionJobId: z.string().nullish(), conversionError: z.string().nullish(), conversionAttempt: z.number().int().nonnegative().optional() })),
  issues: z.array(z.string()), selectedPostIds: z.array(postId),
  postId: postId.nullable(), error: z.string().nullable(),
  approvedAtUtc: timestamp.nullable(), reviewNote: z.string().nullable(),
});
export type CompetitionCommunity = z.infer<typeof communitySchema>;
export type CompetitionRound = z.infer<typeof roundSchema>;

export const competitionStatus = {
  collecting: 'Preparing draft', draft: 'Draft', queued: 'Queued', publishing: 'Publishing',
  published: 'Published', generation_failed: 'Collection failed', publication_uncertain: 'Needs attention',
} satisfies Record<CompetitionRound['status'], string>;

async function request<T>(path: string, schema: z.ZodType<T>, method = 'GET', body?: string): Promise<T> {
  const options: RequestInit = {
    method, credentials: 'include', headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(20_000),
  };
  if (body !== undefined) options.body = body;
  const response = await fetch(`/api/v1/internal/reddit/${path}`, options);
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ message: z.string().optional(), title: z.string().optional() }).safeParse(payload);
    throw new Error(error.success ? error.data.message ?? error.data.title ?? 'The competition request failed.' : 'The competition request failed.');
  }
  return schema.parse(payload);
}

/** Accepts a Reddit post link, a t3_ ID, or a bare post ID. */
export function redditPostId(value: string) {
  const id = /(?:^t3_|^|\/comments\/)([a-z0-9]+)(?:[/?#]|$)/i.exec(value.trim())?.[1];
  return id ? `t3_${id.toLowerCase()}` : null;
}

export const redditCompetitions = {
  communities: () => request('communities', z.array(communitySchema)),
  rounds: (subreddit: string) => request(`${subreddit}/rounds`, z.array(roundSchema)),
  generate: (subreddit: string) => request(`${subreddit}/rounds`, roundSchema, 'POST'),
  schedule: (community: CompetitionCommunity) => request(`${community.subreddit}/schedule`, communitySchema, 'PUT', JSON.stringify({
    revision: community.revision, enabled: community.enabled, timeZone: community.timeZone,
    dayOfWeek: community.dayOfWeek, hour: community.hour, minute: community.minute, excludedFlairs: community.excludedFlairs,
    introduction: community.introduction, closing: community.closing, weekOneDate: community.weekOneDate,
  })),
  save: (round: CompetitionRound, title: string, body: string, selectedPostIds: string[]) =>
    request(`${round.subreddit}/rounds/${round.id}`, roundSchema, 'PUT', JSON.stringify({ revision: round.revision, title, body, selectedPostIds })),
  template: (round: CompetitionRound) => request(`${round.subreddit}/rounds/${round.id}/template`, z.object({ title: z.string(), body: z.string() }), 'POST', JSON.stringify({
    revision: round.revision, selectedPostIds: round.selectedPostIds,
  })),
  approve: (round: CompetitionRound, reviewNote: string) => request(`${round.subreddit}/rounds/${round.id}/approve`, roundSchema, 'POST', JSON.stringify({
    revision: round.revision, reviewed: true, reviewNote,
  })),
  retry: (round: CompetitionRound) => request(`${round.subreddit}/rounds/${round.id}/retry`, roundSchema, 'POST', JSON.stringify({ revision: round.revision })),
  resolvePublication: (round: CompetitionRound, postId: string | null) => request(`${round.subreddit}/rounds/${round.id}/resolve-publication`, roundSchema, 'POST', JSON.stringify({
    revision: round.revision, postId, notPublished: postId === null,
  })),
  retryConversion: (round: CompetitionRound, candidatePostId: string) => request(`${round.subreddit}/rounds/${round.id}/retry-conversion`, roundSchema, 'POST', JSON.stringify({ revision: round.revision, candidatePostId })),
};
