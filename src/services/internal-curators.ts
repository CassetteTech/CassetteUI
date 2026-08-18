/** Defines internal curator lifecycle, immutable pricing policy, and assignment operations. */

import { z } from 'zod';

const timestampSchema = z.string().datetime({ offset: true });
const curatorIdSchema = z.string().regex(/^cpr_[0-9A-Za-z]+$/).max(40);
const policyIdSchema = z.string().regex(/^msf_[0-9A-Za-z]+$/).max(40);
const assignmentIdSchema = z.string().regex(/^cfa_[0-9A-Za-z]+$/).max(40);
const moneyMinorSchema = z.number().int().nonnegative().max(99_999_999);
const basisPointsSchema = z.number().int().nonnegative().max(10_000);
const reasonSchema = z.string().trim().min(1).max(2_000);

const curatorStatusSchema = z.enum(['active', 'suspended', 'retired']);

const internalCuratorSchema = z.object({
  id: curatorIdSchema,
  userId: z.string().uuid(),
  username: z.string().min(1).max(100),
  status: curatorStatusSchema,
  headline: z.string().max(2_000).nullable(),
  about: z.string().max(2_000).nullable(),
  declaredGenres: z.array(z.string().max(2_000)).max(20),
  declaredPlatforms: z.array(z.string().max(2_000)).max(20),
  suspensionReason: z.string().min(1).max(2_000).nullable(),
  createdAtUtc: timestampSchema,
  statusChangedAtUtc: timestampSchema,
}).strict().refine(
  (curator) => (curator.status === 'suspended') === (curator.suspensionReason !== null),
  { message: 'Curator status and suspension reason are inconsistent' },
);

const pricingPolicyFields = {
  policyKey: z.string().trim().min(1).max(100).regex(/^[a-z0-9_]+$/),
  displayName: z.string().trim().min(1).max(150),
  isActive: z.boolean(),
  curatorProMonthlyPriceMinor: moneyMinorSchema.positive(),
  currency: z.literal('USD'),
  platformFeeBps: basisPointsSchema,
  serviceFeeBps: basisPointsSchema,
  serviceFeeFixedMinor: moneyMinorSchema,
  processingBorneBy: z.enum(['platform', 'curator']),
  payoutOpsFeeBps: basisPointsSchema,
  payoutCadence: z.enum(['monthly', 'quarterly']),
  minPayoutMinor: moneyMinorSchema,
} as const;

const pricingPolicyRequestSchema = z.object(pricingPolicyFields).strict().refine(
  (policy) => policy.processingBorneBy === 'platform' ||
    (policy.serviceFeeBps === 0 && policy.serviceFeeFixedMinor === 0),
  { message: 'Curator-borne processing cannot be combined with fan service fees' },
);

const pricingPolicySchema = z.object({
  id: policyIdSchema,
  ...pricingPolicyFields,
  version: z.number().int().positive().safe(),
  isDefault: z.boolean(),
  defaultEffectiveAtUtc: timestampSchema.nullable(),
  processingFeeBps: basisPointsSchema,
  processingFeeFixedMinor: moneyMinorSchema,
  createdAtUtc: timestampSchema,
}).strict()
  .refine(
    (policy) => policy.processingBorneBy === 'platform' ||
      (policy.serviceFeeBps === 0 && policy.serviceFeeFixedMinor === 0),
    { message: 'Curator-borne processing cannot be combined with fan service fees' },
  )
  .refine((policy) => !policy.isDefault || policy.isActive, {
    message: 'The default pricing policy must be active',
  })
  .refine((policy) => !policy.isDefault || policy.defaultEffectiveAtUtc !== null, {
    message: 'The default pricing policy must include its effective date',
  });

const pricingAssignmentSchema = z.object({
  id: assignmentIdSchema,
  curatorProfileId: curatorIdSchema,
  policyId: policyIdSchema,
  policyKey: pricingPolicyFields.policyKey,
  policyVersion: z.number().int().positive().safe(),
  policyDisplayName: pricingPolicyFields.displayName,
  assignedByUserId: z.string().uuid(),
  assignedByUsername: z.string().min(1).max(100),
  reason: reasonSchema,
  effectiveAtUtc: timestampSchema,
  createdAtUtc: timestampSchema,
}).strict();

const pricingAssignmentRequestSchema = z.object({
  curatorProfileId: curatorIdSchema,
  policyId: policyIdSchema,
  effectiveAtUtc: timestampSchema.nullable(),
  reason: reasonSchema,
}).strict();

const pricingAssignmentResultSchema = z.object({ id: assignmentIdSchema }).strict();
const errorResponseSchema = z.object({ message: z.string().trim().min(1) }).passthrough();
const internalCuratorsSchema = z.array(internalCuratorSchema);
const pricingPoliciesSchema = z.array(pricingPolicySchema);
const pricingAssignmentsSchema = z.array(pricingAssignmentSchema);

export type CuratorStatus = z.infer<typeof curatorStatusSchema>;
export type InternalCurator = z.infer<typeof internalCuratorSchema>;
export type PricingPolicy = z.infer<typeof pricingPolicySchema>;
export type PricingPolicyRequest = z.infer<typeof pricingPolicyRequestSchema>;
export type PricingAssignment = z.infer<typeof pricingAssignmentSchema>;
export type PricingAssignmentRequest = z.infer<typeof pricingAssignmentRequestSchema>;

// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parseInternalCurators = (value: unknown): InternalCurator[] =>
  internalCuratorsSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parsePricingPolicies = (value: unknown): PricingPolicy[] =>
  pricingPoliciesSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parsePricingAssignments = (value: unknown): PricingAssignment[] =>
  pricingAssignmentsSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parsePricingPolicyRequest = (value: unknown): PricingPolicyRequest =>
  pricingPolicyRequestSchema.parse(value);
// oxlint-disable-next-line anti-slop/no-unknown-parameters
export const parsePricingAssignmentRequest = (value: unknown): PricingAssignmentRequest =>
  pricingAssignmentRequestSchema.parse(value);

export function decimalToHundredths(value: string): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) throw new Error('Enter a non-negative number with at most two decimal places.');

  const result = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(result)) throw new Error('The value is too large.');
  return result;
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  fallbackMessage: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  const response = await fetch(path, {
    ...init,
    cache: 'no-store',
    credentials: 'include',
    headers,
  });
  if (!response.ok) {
    const body = errorResponseSchema.safeParse(await response.json().catch(() => null));
    throw new Error(body.success ? body.data.message : fallbackMessage);
  }
  return schema.parse(await response.json());
}

export async function fetchInternalCurators(
  status?: CuratorStatus,
  signal?: AbortSignal,
): Promise<InternalCurator[]> {
  const query = status ? `?${new URLSearchParams({ status })}` : '';
  return request(
    `/api/v1/internal/curators${query}`,
    internalCuratorsSchema,
    'Failed to load curators',
    { signal },
  );
}

export function fetchPricingPolicies(signal?: AbortSignal): Promise<PricingPolicy[]> {
  return request(
    '/api/v1/internal/memberships/pricing-policies',
    pricingPoliciesSchema,
    'Failed to load pricing policies',
    { signal },
  );
}

export function fetchPricingAssignments(
  curatorProfileId: string,
  signal?: AbortSignal,
): Promise<PricingAssignment[]> {
  const id = curatorIdSchema.parse(curatorProfileId);
  const query = new URLSearchParams({ curatorProfileId: id });
  return request(
    `/api/v1/internal/memberships/pricing-policies/assignments?${query}`,
    pricingAssignmentsSchema,
    'Failed to load assignment history',
    { signal },
  );
}

export function createPricingPolicy(requestBody: PricingPolicyRequest): Promise<PricingPolicy> {
  const body = pricingPolicyRequestSchema.parse(requestBody);
  return request(
    '/api/v1/internal/memberships/pricing-policies',
    pricingPolicySchema,
    'Failed to create pricing policy',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function setDefaultPricingPolicy(policyId: string): Promise<PricingPolicy> {
  const id = policyIdSchema.parse(policyId);
  return request(
    `/api/v1/internal/memberships/pricing-policies/${encodeURIComponent(id)}/set-default`,
    pricingPolicySchema,
    'Failed to change the default pricing policy',
    { method: 'POST' },
  );
}

export function assignPricingPolicy(
  requestBody: PricingAssignmentRequest,
): Promise<{ id: string }> {
  const body = pricingAssignmentRequestSchema.parse(requestBody);
  return request(
    '/api/v1/internal/memberships/pricing-policies/assignments',
    pricingAssignmentResultSchema,
    'Failed to assign the pricing policy',
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export function suspendInternalCurator(
  curatorProfileId: string,
  reason: string,
): Promise<InternalCurator> {
  const id = curatorIdSchema.parse(curatorProfileId);
  return request(
    `/api/v1/internal/curators/${encodeURIComponent(id)}/suspend`,
    internalCuratorSchema,
    'Failed to suspend the curator',
    { method: 'POST', body: JSON.stringify({ reason: reasonSchema.parse(reason) }) },
  );
}

export function reinstateInternalCurator(curatorProfileId: string): Promise<InternalCurator> {
  const id = curatorIdSchema.parse(curatorProfileId);
  return request(
    `/api/v1/internal/curators/${encodeURIComponent(id)}/reinstate`,
    internalCuratorSchema,
    'Failed to reinstate the curator',
    { method: 'POST' },
  );
}
