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
  expiresAtUtc: timestamp,
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
});

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
  }),
}).refine(
  (page) => page.membership !== null || page.posts.items.every(
    (item) => item.kind === 'post' && item.post.privacy === 'public',
  ),
  { message: 'Subscriber posts require an active membership plan' },
).refine(
  (page) => page.viewer.isOwner || page.viewer.isMember || page.posts.items.every(
    (item) => item.kind === 'locked' || item.post.privacy === 'public',
  ),
  { message: 'Subscriber post bodies require an entitled viewer' },
);

export type CuratorPage = z.infer<typeof curatorPageSchema>;
export type CuratorPostItem = z.infer<typeof postItemSchema>;
export type CuratorProfileRequest = z.infer<typeof curatorProfileRequestSchema>;
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

export function buildCuratorPagePath(username: string, page: number, pageSize: number): string {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return `/api/v1/curators/${encodeURIComponent(username.trim())}/page?${query}`;
}

export async function fetchCuratorPage(
  username: string,
  page: number,
  pageSize: number,
  baseUrl = '',
  signal?: AbortSignal,
): Promise<CuratorPage> {
  const response = await fetch(`${baseUrl}${buildCuratorPagePath(username, page, pageSize)}`, {
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

async function saveCuratorProfile(
  path: string,
  method: 'POST' | 'PUT',
  request: CuratorProfileRequest,
): Promise<CuratorProfile> {
  const response = await fetch(path, {
    method,
    body: JSON.stringify(curatorProfileRequestSchema.parse(request)),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new CuratorPageError('Failed to save curator profile', response.status);
  }

  return parseCuratorProfile(await response.json());
}

export function createCuratorProfile(
  request: CuratorProfileRequest,
): Promise<CuratorProfile> {
  return saveCuratorProfile('/api/v1/curators', 'POST', request);
}

export function updateCuratorProfile(
  request: CuratorProfileRequest,
): Promise<CuratorProfile> {
  return saveCuratorProfile('/api/v1/curators/me', 'PUT', request);
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
