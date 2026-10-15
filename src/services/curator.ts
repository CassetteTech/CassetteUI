import { z } from 'zod';
import { accountTypeSchema } from '../lib/account-type';
import { correlationIdSchema, httpsUrlSchema } from './membership';
import { formatPaidPromotionMinorAmount } from './paid-promotion-lifecycle';

const nullableString = z.string().nullable();
const timestamp = z.string().datetime({ offset: true });
const moneyMinor = z.number().int().nonnegative().safe();
const profileText = z.string().max(2000);
const profileList = z.array(profileText).max(20);

export const curatorPayoutAccountSchema = z.object({
  onboardingStatus: z.enum(['created', 'onboarding', 'active', 'restricted']),
  transfersCapabilityStatus: z.string().min(1).max(50).nullable(),
  requirementsDue: z.boolean(),
  capabilityCheckedAtUtc: timestamp.nullable(),
  correlationId: correlationIdSchema,
}).strict().transform(({ correlationId: _correlationId, ...account }) => account);

export const curatorPayoutOnboardingSchema = z.object({
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

export const curatorProfileSchema = curatorProfileRequestSchema.extend({
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
  accountType: nullableString.pipe(accountTypeSchema),
  title: z.string(),
  subtitle: nullableString,
  imageUrl: nullableString,
  description: nullableString,
  privacy: z.enum(['public', 'subscriber']),
  redirectPostId: z.string(),
  commentsEnabled: z.boolean().optional(),
  isRepost: z.boolean().optional(),
  originalPostOwnerUsername: nullableString.optional(),
  originalPostOwnerAccountType: nullableString.pipe(accountTypeSchema).optional(),
});

export const curatorElementTypes = ['Playlist', 'Track', 'Album', 'Artist'] as const;
export type CuratorElementType = (typeof curatorElementTypes)[number];

const postItemSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('post'), post: curatorPostSchema }).strict(),
  z.object({
    kind: z.literal('locked'),
    postId: z.string().min(1),
    createdAt: timestamp,
  }).strict(),
]);

export const curatorPageSchema = z.object({
  curator: z.object({
    id: z.string().min(1),
    username: z.string().min(1),
    displayName: nullableString,
    bio: nullableString,
    avatarUrl: nullableString,
    profileLinks: z.array(z.string()),
    accountType: z.string().pipe(accountTypeSchema),
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
    typeCounts: z.array(z.object({
      elementType: z.enum(curatorElementTypes),
      count: z.number().int().positive(),
    })).optional(),
  }),
}).refine(
  (page) => page.viewer.isOwner || page.viewer.isMember || page.posts.items.every(
    (item) => item.kind === 'locked' || item.post.privacy === 'public',
  ),
  { message: 'Subscriber post bodies require an entitled viewer' },
);

export const curatorFollowStateSchema = z.object({
  isFollowing: z.boolean(),
  hasExplicitFollow: z.boolean(),
  hasActiveMembership: z.boolean(),
}).strict();

// Current owner counts, never identities.
export const curatorAudienceSchema = z.object({
  audienceCount: z.number().int().nonnegative(),
  activeMemberCount: z.number().int().nonnegative(),
}).strict().refine(
  (audience) => audience.audienceCount >= audience.activeMemberCount,
  { message: 'Audience count is below the member count' },
);

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

  return curatorPageSchema.parse(await response.json());
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

  return curatorProfileSchema.parse(await response.json());
}

const curatorFollowPath = (curatorProfileId: string) =>
  `/api/v1/curators/${encodeURIComponent(curatorProfileId)}/follow`;

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
  return curatorFollowStateSchema.parse(await response.json());
}

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
  return curatorFollowStateSchema.parse(await response.json());
}

export async function fetchCuratorAudience(signal?: AbortSignal): Promise<CuratorAudience> {
  const response = await fetch('/api/v1/curators/me/audience', {
    cache: 'no-store',
    credentials: 'include',
    signal,
  });
  if (!response.ok) {
    throw new CuratorPageError('Failed to load audience', response.status);
  }
  return curatorAudienceSchema.parse(await response.json());
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

  return curatorPayoutAccountSchema.parse(await response.json());
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
  return curatorPayoutOnboardingSchema.parse(await response.json());
}

export function formatCuratorPlanPrice(
  amountMinor: number,
  serviceFeeMinor: number,
  currency: string,
  locale?: string | string[],
): string {
  return formatPaidPromotionMinorAmount(amountMinor + serviceFeeMinor, currency, locale);
}
