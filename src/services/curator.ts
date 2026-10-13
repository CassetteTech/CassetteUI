/** Defines public curator privacy boundaries plus profile and payout API operations. */

import { z } from 'zod';
import { correlationIdSchema, httpsUrlSchema } from './membership';
import { formatPaidPromotionMinorAmount } from './paid-promotion-lifecycle';

const nullableString = z.string().nullable();
const timestamp = z.string().datetime({ offset: true });
const moneyMinor = z.number().int().nonnegative().safe();
const profileText = z.string().max(2000);
const profileList = z.array(profileText).max(20);

const curatorPayoutAccountSchema = z.object({
  onboardingStatus: z.enum(['created', 'onboarding', 'active', 'restricted']),
  transfersCapabilityStatus: z.string().min(1).max(50).nullable(),
  requirementsDue: z.boolean(),
  capabilityCheckedAtUtc: timestamp.nullable(),
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...account }) => account);

const curatorPayoutOnboardingSchema = z.object({
  onboardingUrl: httpsUrlSchema,
  expiresAtUtc: timestamp.nullable(),
  account: curatorPayoutAccountSchema,
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...onboarding }) => onboarding);

const curatorProfileRequestSchema = z.object({
  headline: profileText.nullable(),
  about: profileText.nullable(),
  declaredGenres: profileList,
  declaredPlatforms: profileList,
}).strict();

const curatorProfileSchema = curatorProfileRequestSchema.extend({
  id: z.string().regex(/^cpr_[0-9A-Za-z]+$/).max(40),
  status: z.enum(['active', 'suspended', 'retired']),
  suspensionReason: nullableString,
  createdAtUtc: timestamp,
  statusChangedAtUtc: timestamp,
  correlationId: z.string().uuid().optional(),
}).transform(({ correlationId: _correlationId, ...profile }) => profile);

const curatorPostSchema = z.object({
  postId: z.string().min(1),
  elementType: z.string().min(1),
  createdAt: timestamp,
  username: z.string().min(1),
  accountType: nullableString,
  title: z.string(),
  subtitle: nullableString,
  imageUrl: nullableString,
  description: nullableString,
  privacy: z.enum(['public', 'subscriber']),
  redirectPostId: z.string(),
  commentsEnabled: z.boolean().optional(),
  isRepost: z.boolean().optional(),
});

/** Bridge's element types, the values of the page's type filter. */
export const curatorElementTypes = ['Playlist', 'Track', 'Album', 'Artist'] as const;
export type CuratorElementType = (typeof curatorElementTypes)[number];

const postItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('post'), post: curatorPostSchema }).strict(),
  // Locked rows are deliberately exact: an additive content field is a leak,
  // not a forward-compatible contract change.
  z.object({
    kind: z.literal('locked'),
    postId: z.string().min(1),
    createdAt: timestamp,
  }).strict(),
]);

const curatorPageSchema = z.object({
  curator: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    displayName: nullableString,
    bio: nullableString,
    avatarUrl: nullableString,
    profileLinks: z.array(z.string()),
    accountType: z.string(),
    headline: nullableString,
    about: nullableString,
    declaredGenres: z.array(z.string()),
    declaredPlatforms: z.array(z.string()),
    curatorSinceUtc: timestamp,
  }),
  membership: z.object({
    planId: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    amountMinor: moneyMinor,
    serviceFeeMinor: moneyMinor,
    annualAmountMinor: moneyMinor.nullable(),
    annualServiceFeeMinor: moneyMinor.nullable(),
    currency: z.string().length(3),
    benefits: z.array(z.object({
      featureKey: z.string().min(1),
      name: z.string().min(1),
      description: z.string(),
    })),
  }).refine(
    (plan) => (plan.annualAmountMinor === null) === (plan.annualServiceFeeMinor === null),
    { message: 'Annual amount and service fee must be provided together' },
  ).refine(
    (plan) => Number.isSafeInteger(plan.amountMinor + plan.serviceFeeMinor) &&
      (plan.annualAmountMinor === null ||
        (plan.annualServiceFeeMinor !== null && Number.isSafeInteger(
          plan.annualAmountMinor + plan.annualServiceFeeMinor,
        ))),
    { message: 'Membership total exceeds the safe money range' },
  ).nullable(),
  viewer: z.object({
    isOwner: z.boolean(),
    isMember: z.boolean(),
    hasMemberBadge: z.boolean(),
  }),
  posts: z.object({
    items: z.array(postItemSchema),
    totalItems: z.number().int().nonnegative(),
    page: z.number().int().positive(),
    pageSize: z.number().int().min(1).max(50),
    // On the first page: the posts of each type the viewer can open.
    typeCounts: z.array(z.object({
      elementType: z.enum(curatorElementTypes),
      count: z.number().int().positive(),
    })).optional(),
  }),
}).refine(
  // A retained member on an archived plan sees member content with no public offer;
  // the privacy boundary is the viewer entitlement, not the offer's presence.
  (page) => page.viewer.isOwner || page.viewer.isMember || page.posts.items.every(
    (item) => item.kind === 'locked' || item.post.privacy === 'public',
  ),
  { message: 'Subscriber post bodies require an entitled viewer' },
);

// The viewer's own relationship. isFollowing is Feed inclusion: an explicit
// Follow or a membership that gives access now.
const curatorFollowStateSchema = z.object({
  isFollowing: z.boolean(),
  hasExplicitFollow: z.boolean(),
  hasActiveMembership: z.boolean(),
}).strict();

// Current owner counts, never identities. Each count is checked on its own:
// Bridge counts them in separate statements, so they can briefly disagree.
const curatorAudienceSchema = z.object({
  audienceCount: z.number().int().nonnegative(),
  activeMemberCount: z.number().int().nonnegative(),
}).strict();

export type CuratorPage = z.infer<typeof curatorPageSchema>;
export type CuratorFollowState = z.infer<typeof curatorFollowStateSchema>;
export type CuratorAudience = z.infer<typeof curatorAudienceSchema>;
export type CuratorPostItem = z.infer<typeof postItemSchema>;
export type CuratorProfile = z.infer<typeof curatorProfileSchema>;
export type CuratorPayoutAccount = z.infer<typeof curatorPayoutAccountSchema>;
export type CuratorPayoutOnboarding = z.infer<typeof curatorPayoutOnboardingSchema>;

export class CuratorPageError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'CuratorPageError';
  }
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorPage(value: unknown): CuratorPage {
  return curatorPageSchema.parse(value);
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorFollowState(value: unknown): CuratorFollowState {
  return curatorFollowStateSchema.parse(value);
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorAudience(value: unknown): CuratorAudience {
  return curatorAudienceSchema.parse(value);
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorProfile(value: unknown): CuratorProfile {
  return curatorProfileSchema.parse(value);
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorPayoutAccount(value: unknown): CuratorPayoutAccount {
  return curatorPayoutAccountSchema.parse(value);
}

// The endpoint body is untrusted until this schema succeeds.
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export function parseCuratorPayoutOnboarding(value: unknown): CuratorPayoutOnboarding {
  return curatorPayoutOnboardingSchema.parse(value);
}

/** Narrows a curator page's posts. Locked teasers show only without a type. */
export type CuratorPageFilter = { elementType: CuratorElementType | null; membersOnly: boolean };

export const unfilteredCuratorPage: CuratorPageFilter = { elementType: null, membersOnly: false };

export function buildCuratorPagePath(
  username: string,
  page: number,
  pageSize: number,
  filter: CuratorPageFilter = unfilteredCuratorPage,
): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (filter.elementType) query.set('elementType', filter.elementType);
  if (filter.membersOnly) query.set('membersOnly', 'true');
  return `/api/v1/curators/${encodeURIComponent(username.trim())}/page?${query}`;
}

export async function fetchCuratorPage(
  username: string,
  page: number,
  pageSize: number,
  baseUrl = '',
  signal?: AbortSignal,
  filter: CuratorPageFilter = unfilteredCuratorPage,
): Promise<CuratorPage> {
  const response = await fetch(`${baseUrl}${buildCuratorPagePath(username, page, pageSize, filter)}`, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (!response.ok) {
    throw new CuratorPageError(
      response.status === 404 ? 'Curator not found' : 'Failed to load curator page',
      response.status,
    );
  }

  return parseCuratorPage(await response.json());
}

export async function fetchOwnCuratorProfile(
  signal?: AbortSignal,
): Promise<CuratorProfile | null> {
  const response = await fetch('/api/v1/curators/me', {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new CuratorPageError('Failed to load curator profile', response.status);
  }

  return parseCuratorProfile(await response.json());
}

const curatorFollowPath = (curatorProfileId: string) =>
  `/api/v1/curators/${encodeURIComponent(curatorProfileId)}/follow`;

/** The signed-in viewer's own relationship; the server resolves the viewer from the session. */
export async function fetchCuratorFollow(
  curatorProfileId: string,
  signal?: AbortSignal,
): Promise<CuratorFollowState> {
  const response = await fetch(curatorFollowPath(curatorProfileId), {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    throw new CuratorPageError('Failed to load follow status', response.status);
  }
  return parseCuratorFollowState(await response.json());
}

/** Follows (PUT, empty body) or unfollows (DELETE); both answer with the relationship after the change. */
export async function setCuratorFollow(
  curatorProfileId: string,
  following: boolean,
): Promise<CuratorFollowState> {
  const response = await fetch(curatorFollowPath(curatorProfileId), {
    method: following ? 'PUT' : 'DELETE',
    cache: 'no-store',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new CuratorPageError(following ? 'Failed to follow' : 'Failed to unfollow', response.status);
  }
  return parseCuratorFollowState(await response.json());
}

/** The owner's current audience and members, for Curator Studio only. */
export async function fetchCuratorAudience(signal?: AbortSignal): Promise<CuratorAudience> {
  const response = await fetch('/api/v1/curators/me/audience', {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    throw new CuratorPageError('Failed to load audience', response.status);
  }
  return parseCuratorAudience(await response.json());
}

export async function fetchCuratorPayoutAccount(
  refresh = false,
  signal?: AbortSignal,
): Promise<CuratorPayoutAccount | null> {
  const response = await fetch(`/api/v1/curators/payout-account?refresh=${refresh}`, {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new CuratorPageError('Failed to load payout account', response.status);
  }

  return parseCuratorPayoutAccount(await response.json());
}

export async function startCuratorPayoutOnboarding(
  signal?: AbortSignal,
): Promise<CuratorPayoutOnboarding> {
  const response = await fetch('/api/v1/curators/payout-account', {
    method: 'POST',
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    throw new CuratorPageError('Failed to start payout onboarding', response.status);
  }
  return parseCuratorPayoutOnboarding(await response.json());
}

export function formatCuratorPlanPrice(
  amountMinor: number,
  serviceFeeMinor: number,
  currency: string,
  locale?: string | string[],
): string {
  return formatPaidPromotionMinorAmount(amountMinor + serviceFeeMinor, currency, locale);
}
