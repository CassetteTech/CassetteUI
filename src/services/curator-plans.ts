import { z } from 'zod';
import { moneyMinorSchema } from './membership';
import { CuratorPageError } from './curator';

const timestampSchema = z.string().datetime({ offset: true });
const featureKeySchema = z.string().min(1).max(100).regex(/^[a-z0-9_]+$/);
const basisPointsSchema = z.number().int().nonnegative().safe();

const curatorPlanRequestSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().max(2000),
  amountMinor: moneyMinorSchema.min(500).max(10_000),
  annualAmountMinor: moneyMinorSchema.positive().nullable(),
  featureKeys: z.array(featureKeySchema).max(10),
}).strict().superRefine((plan, context) => {
  if (plan.annualAmountMinor !== null && plan.annualAmountMinor > plan.amountMinor * 12) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Annual price cannot exceed 12 monthly payments',
      path: ['annualAmountMinor'],
    });
  }
});

const curatorPlanSchema = z.object({
  id: z.string().regex(/^mpl_[0-9A-Za-z]+$/).max(40),
  name: z.string().min(1).max(150),
  description: z.string().max(2000),
  amountMinor: moneyMinorSchema.min(500).max(10_000),
  annualAmountMinor: moneyMinorSchema.positive().nullable(),
  currency: z.literal('USD'),
  serviceFeeMinor: moneyMinorSchema.nullable(),
  annualServiceFeeMinor: moneyMinorSchema.nullable(),
  status: z.enum(['draft', 'active', 'archived']),
  featureKeys: z.array(featureKeySchema).max(10),
  createdAtUtc: timestampSchema,
  publishedAtUtc: timestampSchema.nullable(),
  archivedAtUtc: timestampSchema.nullable(),
}).strict().superRefine((plan, context) => {
  if (plan.annualAmountMinor !== null && plan.annualAmountMinor > plan.amountMinor * 12) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Annual price exceeds the plan limit',
      path: ['annualAmountMinor'],
    });
  }

  const published = plan.status !== 'draft';
  if (published !== (plan.publishedAtUtc !== null) || published !== (plan.serviceFeeMinor !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Published plan fields are inconsistent',
    });
  }
  if ((plan.status === 'archived') !== (plan.archivedAtUtc !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Archived plan fields are inconsistent',
    });
  }
  const annualFeeExpected = published && plan.annualAmountMinor !== null;
  if (annualFeeExpected !== (plan.annualServiceFeeMinor !== null)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Annual plan fields are inconsistent',
    });
  }

  if (plan.serviceFeeMinor !== null && !Number.isSafeInteger(plan.amountMinor + plan.serviceFeeMinor)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Monthly fan charge is unsafe' });
  }
  if (plan.annualAmountMinor !== null && plan.annualServiceFeeMinor !== null &&
      !Number.isSafeInteger(plan.annualAmountMinor + plan.annualServiceFeeMinor)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Annual fan charge is unsafe' });
  }
});

const curatorFeatureSchema = z.object({
  featureKey: featureKeySchema,
  displayName: z.string().min(1).max(150),
  description: z.string().max(2000),
}).strict();

const curatorPricingSchema = z.object({
  curatorProMonthlyPriceMinor: moneyMinorSchema.positive(),
  currency: z.literal('USD'),
  platformFeeBps: basisPointsSchema.max(10_000),
  serviceFeeBps: basisPointsSchema,
  serviceFeeFixedMinor: moneyMinorSchema,
  processingBorneBy: z.enum(['platform', 'curator']),
  processingFeeBps: basisPointsSchema,
  processingFeeFixedMinor: moneyMinorSchema,
  payoutOpsFeeBps: basisPointsSchema,
  payoutCadence: z.enum(['monthly', 'quarterly']),
  minPayoutMinor: moneyMinorSchema,
}).strict().refine(
  (pricing) => pricing.processingBorneBy === 'platform' ||
    (pricing.serviceFeeBps === 0 && pricing.serviceFeeFixedMinor === 0),
  { message: 'Fan service fees cannot be combined with curator-borne processing' },
);

const curatorPlansSchema = z.array(curatorPlanSchema);
const curatorFeaturesSchema = z.array(curatorFeatureSchema);

export type CuratorPlanRequest = z.infer<typeof curatorPlanRequestSchema>;
export type CuratorPlan = z.infer<typeof curatorPlanSchema>;
export type CuratorFeature = z.infer<typeof curatorFeatureSchema>;
export type CuratorPricing = z.infer<typeof curatorPricingSchema>;

export type CuratorPlanEconomics = {
  faceMinor: number;
  serviceFeeMinor: number;
  fanChargeMinor: number;
  platformFeeMinor: number;
  payoutOpsFeeMinor: number;
  processingFeeMinor: number;
  curatorAccrualMinor: number;
};

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorPlan = (value: unknown): CuratorPlan => curatorPlanSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorPlans = (value: unknown): CuratorPlan[] => curatorPlansSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorFeatures = (value: unknown): CuratorFeature[] => curatorFeaturesSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseCuratorPricing = (value: unknown): CuratorPricing => curatorPricingSchema.parse(value);

function roundBasisPoints(amountMinor: number, basisPoints: number): number {
  const product = amountMinor * basisPoints;
  if (!Number.isSafeInteger(product)) throw new RangeError('Fee calculation exceeds the safe money range');
  return Math.floor((product + 5_000) / 10_000);
}

export function calculateCuratorPlanEconomics(
  faceMinor: number,
  pricing: CuratorPricing,
): CuratorPlanEconomics {
  moneyMinorSchema.parse(faceMinor);
  const serviceFeeMinor = roundBasisPoints(faceMinor, pricing.serviceFeeBps) +
    pricing.serviceFeeFixedMinor;
  const fanChargeMinor = faceMinor + serviceFeeMinor;
  const platformFeeMinor = roundBasisPoints(faceMinor, pricing.platformFeeBps);
  const payoutOpsFeeMinor = roundBasisPoints(faceMinor, pricing.payoutOpsFeeBps);
  const processingFeeMinor = pricing.processingBorneBy === 'curator'
    ? roundBasisPoints(fanChargeMinor, pricing.processingFeeBps) +
      pricing.processingFeeFixedMinor
    : 0;
  const values = [serviceFeeMinor, fanChargeMinor, processingFeeMinor];
  if (values.some((value) => !Number.isSafeInteger(value))) {
    throw new RangeError('Fee calculation exceeds the safe money range');
  }

  return {
    faceMinor,
    serviceFeeMinor,
    fanChargeMinor,
    platformFeeMinor,
    payoutOpsFeeMinor,
    processingFeeMinor,
    curatorAccrualMinor: Math.max(
      0,
      faceMinor - platformFeeMinor - payoutOpsFeeMinor - processingFeeMinor,
    ),
  };
}

async function parseResponse<T>(
  response: Response,
  message: string,
  schema: z.ZodType<T>,
): Promise<T> {
  if (!response.ok) throw new CuratorPageError(message, response.status);
  return schema.parse(await response.json());
}

export async function fetchCuratorPlans(signal?: AbortSignal): Promise<CuratorPlan[]> {
  const response = await fetch('/api/v1/curators/plans', {
    cache: 'no-store', credentials: 'include', signal,
  });
  return parseResponse(response, 'Failed to load membership plans', curatorPlansSchema);
}

export async function fetchCuratorFeatures(signal?: AbortSignal): Promise<CuratorFeature[]> {
  const response = await fetch('/api/v1/curators/plans/features', {
    cache: 'no-store', credentials: 'include', signal,
  });
  return parseResponse(response, 'Failed to load membership features', curatorFeaturesSchema);
}

export async function fetchCuratorPricing(signal?: AbortSignal): Promise<CuratorPricing> {
  const response = await fetch('/api/v1/curators/pricing', {
    cache: 'no-store', credentials: 'include', signal,
  });
  return parseResponse(response, 'Failed to load membership pricing', curatorPricingSchema);
}

export async function createCuratorPlan(request: CuratorPlanRequest): Promise<CuratorPlan> {
  const response = await fetch('/api/v1/curators/plans', {
    method: 'POST',
    body: JSON.stringify(curatorPlanRequestSchema.parse(request)),
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseResponse(response, 'Failed to create membership plan', curatorPlanSchema);
}

async function changeCuratorPlan(id: string, action: 'publish' | 'archive'): Promise<CuratorPlan> {
  const planId = z.string().regex(/^mpl_[0-9A-Za-z]+$/).max(40).parse(id);
  const response = await fetch(`/api/v1/curators/plans/${encodeURIComponent(planId)}/${action}`, {
    method: 'POST', credentials: 'include',
  });
  return parseResponse(response, `Failed to ${action} membership plan`, curatorPlanSchema);
}

export const publishCuratorPlan = (id: string): Promise<CuratorPlan> =>
  changeCuratorPlan(id, 'publish');

export const archiveCuratorPlan = (id: string): Promise<CuratorPlan> =>
  changeCuratorPlan(id, 'archive');
