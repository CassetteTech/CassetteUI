import { z } from 'zod';
import { formatPaidPromotionMinorAmount } from './paid-promotion-lifecycle';

const nullableString = z.string().nullable();
const timestamp = z.string().datetime({ offset: true });
const moneyMinor = z.number().int().nonnegative().safe();

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
);

export type CuratorPage = z.infer<typeof curatorPageSchema>;
export type CuratorPostItem = z.infer<typeof postItemSchema>;

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

export function formatCuratorPlanPrice(
  amountMinor: number,
  serviceFeeMinor: number,
  currency: string,
  locale?: string | string[],
): string {
  return formatPaidPromotionMinorAmount(amountMinor + serviceFeeMinor, currency, locale);
}
