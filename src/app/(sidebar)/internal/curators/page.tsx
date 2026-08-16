'use client';

import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, BadgeDollarSign, UserRoundCog } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  DataTable,
  Panel,
  SectionHeader,
  StatusPill,
  type Column,
} from '@/app/(sidebar)/internal/_components/kit';
import { formatDate } from '@/app/(sidebar)/internal/_components/internal-utils';
import { useAuthState } from '@/hooks/use-auth';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { internalPaidPromotionsService } from '@/services/internal-paid-promotions';
import {
  assignPricingPolicy,
  createPricingPolicy,
  decimalToHundredths,
  fetchInternalCurators,
  fetchPricingAssignments,
  fetchPricingPolicies,
  parsePricingAssignmentRequest,
  parsePricingPolicyRequest,
  reinstateInternalCurator,
  setDefaultPricingPolicy,
  suspendInternalCurator,
  type InternalCurator,
  type PricingAssignment,
  type PricingPolicy,
} from '@/services/internal-curators';
import type { InternalPaidPromotionException } from '@/types';

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';
const fieldClassName = 'grid gap-1 text-xs font-medium text-foreground';

function percent(basisPoints: number) {
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(basisPoints / 100)}%`;
}

const errorMessage = (error: Error) => error.message;

const formString = (form: FormData, name: string) => z.string().parse(form.get(name));

function curatorTone(status: InternalCurator['status']) {
  if (status === 'active') return 'success' as const;
  if (status === 'suspended') return 'warning' as const;
  return 'neutral' as const;
}

function policyLabel(policy: PricingPolicy) {
  return `${policy.displayName} · ${policy.policyKey} v${policy.version}`;
}

function CuratorOperations({
  curators,
  selected,
  isLoading,
  loadFailed,
  onSelect,
  onChanged,
  onRefresh,
}: {
  curators: InternalCurator[];
  selected: InternalCurator | null;
  isLoading: boolean;
  loadFailed: boolean;
  onSelect: (id: string) => void;
  onChanged: (curator: InternalCurator) => void;
  onRefresh: () => Promise<void>;
}) {
  const lifecycle = useMutation({
    mutationFn: (input: { action: 'suspend' | 'reinstate'; curatorId: string; reason?: string }) =>
      input.action === 'suspend'
        ? suspendInternalCurator(input.curatorId, input.reason ?? '')
        : reinstateInternalCurator(input.curatorId),
    onSuccess: (curator) => {
      onChanged(curator);
      toast.success(curator.status === 'suspended' ? 'Curator suspended.' : 'Curator reinstated.');
    },
    onError: async (error) => {
      await onRefresh();
      toast.error(`Could not confirm the lifecycle change. ${errorMessage(error)}`);
    },
  });

  const suspend = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const reason = formString(new FormData(event.currentTarget), 'suspensionReason');
    lifecycle.mutate({ action: 'suspend', curatorId: selected.id, reason });
  };

  return (
    <Panel title="Curator operations" bodyClassName="space-y-4 p-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading curators…</p>
      ) : loadFailed ? (
        <p className="text-sm text-muted-foreground">Curators are unavailable.</p>
      ) : (
        <>
          <label className={fieldClassName}>
            Curator
            <select
              className={selectClassName}
              value={selected?.id ?? ''}
              onChange={(event) => onSelect(event.target.value)}
            >
              {curators.map((curator) => (
                <option key={curator.id} value={curator.id}>
                  {curator.username} · {curator.status}
                </option>
              ))}
            </select>
          </label>

          {!selected ? (
            <p className="text-sm text-muted-foreground">No curator profiles exist.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-3">
                <div>
                  <p className="font-medium text-foreground">@{selected.username}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{selected.id}</p>
                </div>
                <StatusPill tone={curatorTone(selected.status)} label={selected.status} />
              </div>

          {selected.status === 'active' && (
            <form className="grid gap-2" onSubmit={suspend}>
              <label className={fieldClassName} htmlFor="suspension-reason">
                Suspension reason
                <Textarea id="suspension-reason" name="suspensionReason" required />
              </label>
              <Button type="submit" variant="destructive" disabled={lifecycle.isPending}>
                Suspend curator
              </Button>
            </form>
          )}

          {selected.status === 'suspended' && (
            <div className="space-y-2">
              <p className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground">
                {selected.suspensionReason}
              </p>
              <Button
                type="button"
                variant="outline"
                disabled={lifecycle.isPending}
                onClick={() => lifecycle.mutate({ action: 'reinstate', curatorId: selected.id })}
              >
                Reinstate curator
              </Button>
            </div>
          )}

          {selected.status === 'retired' && (
            <p className="text-sm text-muted-foreground">Retired profiles are read-only.</p>
          )}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

function AssignmentPanel({
  curator,
  policies,
  assignments,
  isLoading,
  loadFailed,
  onAssigned,
}: {
  curator: InternalCurator | null;
  policies: PricingPolicy[];
  assignments: PricingAssignment[];
  isLoading: boolean;
  loadFailed: boolean;
  onAssigned: (curatorProfileId: string) => Promise<void>;
}) {
  const assignment = useMutation({
    mutationFn: assignPricingPolicy,
    onSuccess: async (_, variables) => {
      await onAssigned(variables.curatorProfileId);
      toast.success('Pricing policy assigned.');
    },
    onError: async (error, variables) => {
      await onAssigned(variables.curatorProfileId);
      toast.error(`Could not confirm the assignment. ${errorMessage(error)}`);
    },
  });
  const activePolicies = policies.filter((policy) => policy.isActive);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!curator) return;
    const values = new FormData(event.currentTarget);
    const effectiveAt = formString(values, 'effectiveAt');
    assignment.mutate(parsePricingAssignmentRequest({
      curatorProfileId: curator.id,
      policyId: formString(values, 'policyId'),
      effectiveAtUtc: effectiveAt ? new Date(effectiveAt).toISOString() : null,
      reason: formString(values, 'assignmentReason'),
    }));
  };

  const columns: Column<PricingAssignment>[] = [
    {
      key: 'policy',
      header: 'Policy',
      cell: (row) => `${row.policyDisplayName} · v${row.policyVersion}`,
    },
    { key: 'actor', header: 'Actor', cell: (row) => `@${row.assignedByUsername}` },
    { key: 'reason', header: 'Reason', cell: (row) => row.reason },
    { key: 'effective', header: 'Effective', cell: (row) => formatDate(row.effectiveAtUtc), align: 'right' },
  ];

  return (
    <Panel title="Policy assignment" bodyClassName="space-y-4 p-4">
      <p className="text-xs text-muted-foreground">
        Assignments affect future policy resolution. Existing Curator Pro subscriptions keep their agreed Stripe price and are not silently repriced.
      </p>

      {curator && curator.status !== 'retired' ? (
        <form className="grid gap-3 sm:grid-cols-2" onSubmit={submit}>
          <label className={fieldClassName}>
            Pricing policy
            <select className={selectClassName} name="policyId" required defaultValue="">
              <option value="" disabled>Select a policy</option>
              {activePolicies.map((policy) => (
                <option key={policy.id} value={policy.id}>{policyLabel(policy)}</option>
              ))}
            </select>
          </label>
          <label className={fieldClassName} htmlFor="assignment-effective-at">
            Effective time (local)
            <Input id="assignment-effective-at" name="effectiveAt" type="datetime-local" />
          </label>
          <label className={`${fieldClassName} sm:col-span-2`} htmlFor="assignment-reason">
            Assignment reason
            <Textarea id="assignment-reason" name="assignmentReason" required />
          </label>
          <Button type="submit" disabled={assignment.isPending || activePolicies.length === 0}>
            Assign policy
          </Button>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          {curator ? 'Retired profiles cannot receive new assignments.' : 'Select a curator to assign a policy.'}
        </p>
      )}

      <div className="overflow-hidden rounded-md border border-border">
        <DataTable
          columns={columns}
          rows={assignments}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          empty={{ title: loadFailed ? 'Assignment history unavailable' : 'No assignment history' }}
          renderMobile={(row) => (
            <div className="space-y-1 text-xs">
              <p className="font-medium">{row.policyDisplayName} · v{row.policyVersion}</p>
              <p className="text-muted-foreground">@{row.assignedByUsername} · {formatDate(row.effectiveAtUtc)}</p>
              <p>{row.reason}</p>
            </div>
          )}
        />
      </div>
    </Panel>
  );
}

function PricingPolicies({
  policies,
  isLoading,
  loadFailed,
  onCreated,
  onDefaultChanged,
  onRefresh,
}: {
  policies: PricingPolicy[];
  isLoading: boolean;
  loadFailed: boolean;
  onCreated: (policy: PricingPolicy) => void;
  onDefaultChanged: (policy: PricingPolicy) => void;
  onRefresh: () => Promise<void>;
}) {
  const createPolicy = useMutation({
    mutationFn: createPricingPolicy,
    onSuccess: (policy) => {
      onCreated(policy);
      toast.success('Pricing policy version created.');
    },
    onError: async (error) => {
      await onRefresh();
      toast.error(`Could not confirm policy creation. ${errorMessage(error)}`);
    },
  });
  const setDefault = useMutation({
    mutationFn: setDefaultPricingPolicy,
    onSuccess: (policy) => {
      onDefaultChanged(policy);
      toast.success('Default pricing policy changed.');
    },
    onError: async (error) => {
      await onRefresh();
      toast.error(`Could not confirm the default policy. ${errorMessage(error)}`);
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    try {
      createPolicy.mutate(parsePricingPolicyRequest({
        policyKey: formString(values, 'policyKey'),
        displayName: formString(values, 'displayName'),
        isActive: values.get('isActive') === 'on',
        curatorProMonthlyPriceMinor: decimalToHundredths(formString(values, 'proPrice')),
        currency: 'USD',
        platformFeeBps: decimalToHundredths(formString(values, 'platformFee')),
        serviceFeeBps: decimalToHundredths(formString(values, 'serviceFee')),
        serviceFeeFixedMinor: decimalToHundredths(formString(values, 'serviceFixed')),
        processingBorneBy: formString(values, 'processingBorneBy'),
        payoutOpsFeeBps: decimalToHundredths(formString(values, 'payoutOpsFee')),
        payoutCadence: formString(values, 'payoutCadence'),
        minPayoutMinor: decimalToHundredths(formString(values, 'minPayout')),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Invalid pricing-policy values.');
    }
  };

  const changeDefault = (policy: PricingPolicy) => {
    const basePrice = formatPaidPromotionMinorAmount(
      policy.curatorProMonthlyPriceMinor,
      policy.currency,
      'en-US',
    );
    const confirmed = window.confirm(
      `Make ${policyLabel(policy)} the default? Pro base price: ${basePrice}; platform fee: ${percent(policy.platformFeeBps)}. This affects future unassigned policy resolution and cannot be reversed by reselecting a former default.`,
    );
    if (confirmed) setDefault.mutate(policy.id);
  };

  return (
    <Panel title="Pricing policies" bodyClassName="space-y-4 p-4">
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading pricing policies…</p>
      ) : loadFailed ? (
        <p className="text-sm text-muted-foreground">Pricing policies are unavailable.</p>
      ) : (
        <>
          <details className="rounded-md border border-border p-3">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Create immutable policy version</summary>
        <form className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={submit}>
          <label className={fieldClassName} htmlFor="policy-key">Policy key<Input id="policy-key" name="policyKey" required pattern="[a-z0-9_]+" /></label>
          <label className={fieldClassName} htmlFor="policy-display-name">Display name<Input id="policy-display-name" name="displayName" required maxLength={150} /></label>
          <label className={fieldClassName} htmlFor="policy-pro-price">Curator Pro monthly price (USD)<Input id="policy-pro-price" name="proPrice" required inputMode="decimal" /></label>
          <label className={fieldClassName} htmlFor="policy-platform-fee">Platform fee (%)<Input id="policy-platform-fee" name="platformFee" required inputMode="decimal" /></label>
          <label className={fieldClassName} htmlFor="policy-service-fee">Fan service fee (%)<Input id="policy-service-fee" name="serviceFee" required inputMode="decimal" /></label>
          <label className={fieldClassName} htmlFor="policy-service-fixed">Fan fixed fee (USD)<Input id="policy-service-fixed" name="serviceFixed" required inputMode="decimal" /></label>
          <label className={fieldClassName}>Processing paid by<select className={selectClassName} name="processingBorneBy" required defaultValue=""><option value="" disabled>Select who pays</option><option value="platform">Cassette</option><option value="curator">Curator</option></select></label>
          <label className={fieldClassName} htmlFor="policy-payout-ops-fee">Payout operations fee (%)<Input id="policy-payout-ops-fee" name="payoutOpsFee" required inputMode="decimal" /></label>
          <label className={fieldClassName}>Payout cadence<select className={selectClassName} name="payoutCadence" required defaultValue=""><option value="" disabled>Select cadence</option><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option></select></label>
          <label className={fieldClassName} htmlFor="policy-min-payout">Minimum payout (USD)<Input id="policy-min-payout" name="minPayout" required inputMode="decimal" /></label>
          <label className="flex items-center gap-2 text-xs font-medium text-foreground"><input name="isActive" type="checkbox" defaultChecked /> Active and assignable</label>
          <Button type="submit" disabled={createPolicy.isPending}>Create policy version</Button>
        </form>
      </details>

      <p className="text-xs text-muted-foreground">
        Policy versions are immutable. Changing the default or assigning a new version does not silently reprice existing Curator Pro subscriptions.
      </p>

      <ul className="grid gap-3 lg:grid-cols-2" aria-label="Pricing policies">
        {policies.map((policy) => {
          const formerDefault = !policy.isDefault && policy.defaultEffectiveAtUtc !== null;
          return (
            <li key={policy.id} className="space-y-3 rounded-md border border-border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-foreground">{policyLabel(policy)}</p>
                  <p className="font-mono text-[10px] text-muted-foreground">{policy.id}</p>
                </div>
                <StatusPill
                  tone={policy.isDefault ? 'success' : policy.isActive ? 'info' : 'neutral'}
                  label={policy.isDefault ? 'default' : formerDefault ? 'former default' : policy.isActive ? 'active' : 'inactive'}
                />
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Pro base price</dt><dd className="text-right">{formatPaidPromotionMinorAmount(policy.curatorProMonthlyPriceMinor, policy.currency, 'en-US')}</dd>
                <dt className="text-muted-foreground">Platform fee</dt><dd className="text-right">{percent(policy.platformFeeBps)}</dd>
                <dt className="text-muted-foreground">Fan service fee</dt><dd className="text-right">{percent(policy.serviceFeeBps)} + {formatPaidPromotionMinorAmount(policy.serviceFeeFixedMinor, policy.currency, 'en-US')}</dd>
                <dt className="text-muted-foreground">Processing</dt><dd className="text-right">{percent(policy.processingFeeBps)} + {formatPaidPromotionMinorAmount(policy.processingFeeFixedMinor, policy.currency, 'en-US')} · {policy.processingBorneBy}</dd>
                <dt className="text-muted-foreground">Payout operations</dt><dd className="text-right">{percent(policy.payoutOpsFeeBps)}</dd>
                <dt className="text-muted-foreground">Payout timing</dt><dd className="text-right">{policy.payoutCadence} · {formatPaidPromotionMinorAmount(policy.minPayoutMinor, policy.currency, 'en-US')} min</dd>
              </dl>
              {policy.isActive && !policy.isDefault && !formerDefault && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={setDefault.isPending}
                  onClick={() => changeDefault(policy)}
                >
                  Set as default
                </Button>
              )}
            </li>
          );
        })}
          </ul>
        </>
      )}
    </Panel>
  );
}

function PayoutExceptions({
  exceptions,
  isLoading,
  loadFailed,
}: {
  exceptions: InternalPaidPromotionException[];
  isLoading: boolean;
  loadFailed: boolean;
}) {
  return (
    <Panel title="Open payout exceptions">
      {isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading payout exceptions…</p>
      ) : loadFailed ? (
        <p className="p-4 text-sm text-muted-foreground">Payout exceptions are unavailable.</p>
      ) : exceptions.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No open payout exceptions.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Open payout exceptions">
          {exceptions.map((exception) => (
            <li key={exception.id} className="flex items-start gap-3 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[hsl(var(--warning-text))]" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{exception.kind.replaceAll('_', ' ')}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{exception.id} · {formatDate(exception.createdAtUtc)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function InternalCuratorsPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthState();
  const viewer = user?.id ?? 'unknown';
  const [selectedId, setSelectedId] = useState('');
  const curatorsKey = ['internal-curators', viewer] as const;
  const policiesKey = ['internal-curator-pricing-policies', viewer] as const;

  const curators = useQuery({ queryKey: curatorsKey, queryFn: ({ signal }) => fetchInternalCurators(undefined, signal) });
  const policies = useQuery({ queryKey: policiesKey, queryFn: ({ signal }) => fetchPricingPolicies(signal) });
  const effectiveSelectedId = curators.data?.some((curator) => curator.id === selectedId)
    ? selectedId
    : curators.data?.[0]?.id ?? '';
  const assignmentsKey = ['internal-curator-pricing-assignments', viewer, effectiveSelectedId] as const;
  const assignments = useQuery({
    queryKey: assignmentsKey,
    queryFn: ({ signal }) => fetchPricingAssignments(effectiveSelectedId, signal),
    enabled: effectiveSelectedId.length > 0,
  });
  const payoutExceptions = useQuery({
    queryKey: ['internal-curator-payout-exceptions', viewer],
    queryFn: async ({ signal }) => (await Promise.all([
      internalPaidPromotionsService.listExceptions({ status: 'open', kind: 'payout_transfer' }, signal),
      internalPaidPromotionsService.listExceptions({ status: 'open', kind: 'payout_clawback' }, signal),
    ])).flat().sort((left, right) => right.createdAtUtc.localeCompare(left.createdAtUtc)),
  });

  const selected = curators.data?.find((curator) => curator.id === effectiveSelectedId) ?? null;
  const loadError = curators.error ?? policies.error ?? assignments.error ?? payoutExceptions.error;

  const updateCurator = (next: InternalCurator) => {
    queryClient.setQueryData<InternalCurator[]>(curatorsKey, (current = []) =>
      current.map((curator) => curator.id === next.id ? next : curator));
  };
  const addPolicy = (next: PricingPolicy) => {
    queryClient.setQueryData<PricingPolicy[]>(policiesKey, (current = []) => [...current, next]);
  };
  const changeDefault = (next: PricingPolicy) => {
    queryClient.setQueryData<PricingPolicy[]>(policiesKey, (current = []) =>
      current.map((policy) => policy.id === next.id ? next : { ...policy, isDefault: false }));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <SectionHeader
        section="Product & Growth"
        title="Curators"
        count={curators.data?.length}
        actions={<UserRoundCog className="size-5 text-domain" aria-hidden />}
      />

      {loadError && (
        <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {errorMessage(loadError)}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="space-y-5">
          <CuratorOperations
            curators={curators.data ?? []}
            selected={selected}
            isLoading={curators.isLoading}
            loadFailed={curators.isError}
            onSelect={setSelectedId}
            onChanged={updateCurator}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: curatorsKey })}
          />
          <PayoutExceptions
            exceptions={payoutExceptions.data ?? []}
            isLoading={payoutExceptions.isLoading}
            loadFailed={payoutExceptions.isError}
          />
        </div>
        <AssignmentPanel
          curator={selected}
          policies={policies.data ?? []}
          assignments={assignments.data ?? []}
          isLoading={assignments.isLoading}
          loadFailed={assignments.isError}
          onAssigned={(curatorProfileId) => queryClient.invalidateQueries({
            queryKey: ['internal-curator-pricing-assignments', viewer, curatorProfileId],
          })}
        />
      </div>

      <PricingPolicies
        policies={policies.data ?? []}
        isLoading={policies.isLoading}
        loadFailed={policies.isError}
        onCreated={addPolicy}
        onDefaultChanged={changeDefault}
        onRefresh={() => queryClient.invalidateQueries({ queryKey: policiesKey })}
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <BadgeDollarSign className="size-4" aria-hidden />
        Curator status is an operational safety control, not an admission or vetting decision.
      </p>
    </div>
  );
}
