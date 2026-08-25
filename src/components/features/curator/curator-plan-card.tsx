'use client';

/** Creates and manages curator membership plans from server-provided pricing policy. */

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import {
  fetchCuratorPayoutAccount,
  type CuratorProfile,
} from '@/services/curator';
import {
  archiveCuratorPlan,
  calculateCuratorPlanEconomics,
  createCuratorPlan,
  fetchCuratorFeatures,
  fetchCuratorPlans,
  fetchCuratorPricing,
  publishCuratorPlan,
  type CuratorPlan,
  type CuratorPlanEconomics,
} from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { cn } from '@/lib/utils';
import {
  ReceiptRow,
  StudioChip,
  StudioNotice,
  StudioSection,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Check, ChevronDown, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

type PlanAction = { kind: 'publish' | 'archive'; planId: string };

const profileQueryKey = ['curator-profile', 'me'] as const;
const payoutQueryKey = ['curator-payout-account', 'current'] as const;
// Server contract bounds for the monthly price (see curatorPlanRequestSchema).
const monthlyMinMinor = 500;
const monthlyMaxMinor = 10_000;

function priceMinor(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : null;
}

function formText(data: FormData, name: string): string {
  // SAFETY: each requested name belongs to a text input in this form.
  return (data.get(name) as string | null) ?? '';
}

function money(amountMinor: number, currency: string) {
  return formatPaidPromotionMinorAmount(amountMinor, currency, 'en-US');
}

function replacePlan(plans: CuratorPlan[] | undefined, saved: CuratorPlan): CuratorPlan[] {
  if (!plans) return [saved];
  return plans.some((plan) => plan.id === saved.id)
    ? plans.map((plan) => plan.id === saved.id ? saved : plan)
    : [saved, ...plans];
}

const planChipTone = {
  active: 'positive',
  draft: 'neutral',
  archived: 'neutral',
} satisfies Record<CuratorPlan['status'], StudioChipTone>;

/** Receipt-style estimate: fan charge builds down to the curator accrual. */
function EconomicsBreakdown({
  economics,
  currency,
  interval,
}: {
  economics: CuratorPlanEconomics;
  currency: string;
  interval: 'month' | 'year';
}) {
  return (
    <div className="bg-muted/30 p-4 sm:p-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Per {interval}
      </h4>
      <dl className="mt-4 space-y-2 text-sm">
        <ReceiptRow label="Your price" value={money(economics.faceMinor, currency)} />
        <ReceiptRow label="Fan service fee" value={money(economics.serviceFeeMinor, currency)} />
        <ReceiptRow
          label="Fan pays"
          value={money(economics.fanChargeMinor, currency)}
          emphasized
          className="border-t border-dashed border-border pt-2"
        />
        <ReceiptRow label="Cassette platform fee" value={`−${money(economics.platformFeeMinor, currency)}`} deduction />
        <ReceiptRow label="Payout operations fee" value={`−${money(economics.payoutOpsFeeMinor, currency)}`} deduction />
        <ReceiptRow label="Payment processing" value={`−${money(economics.processingFeeMinor, currency)}`} deduction />
        {/* Total line: div wrapper kept so tests can find the amount via its row */}
        <div className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
          <dt className="font-semibold">Estimated curator accrual</dt>
          <dd className="font-teko text-2xl font-bold leading-none tabular-nums">
            {money(economics.curatorAccrualMinor, currency)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

export function CuratorPlanCard({ profile }: { profile: CuratorProfile }) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const monthlyRef = useRef<HTMLInputElement>(null);
  const annualRef = useRef<HTMLInputElement>(null);
  const [monthlyPrice, setMonthlyPrice] = useState('5.00');
  const [annualPrice, setAnnualPrice] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // null = follow the default (open only while the curator has no plans yet)
  const [createOpen, setCreateOpen] = useState<boolean | null>(null);
  const plansKey = ['curator-plans', profile.id] as const;
  const proKey = ['curator-pro-status', user?.id ?? null] as const;
  const plans = useQuery({
    queryKey: plansKey,
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    staleTime: 0,
  });
  const features = useQuery({
    queryKey: ['curator-plan-features'],
    queryFn: ({ signal }) => fetchCuratorFeatures(signal),
    staleTime: 60 * 60 * 1000,
  });
  const pricing = useQuery({
    queryKey: ['curator-pricing', profile.id],
    queryFn: ({ signal }) => fetchCuratorPricing(signal),
    staleTime: 0,
  });
  const pro = useQuery({
    queryKey: proKey,
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const payout = useQuery({
    queryKey: payoutQueryKey,
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(false, signal),
    staleTime: 0,
  });
  const create = useMutation({
    mutationFn: createCuratorPlan,
    onSuccess: (saved) => {
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => replacePlan(current, saved));
      formRef.current?.reset();
      setMonthlyPrice('5.00');
      setAnnualPrice('');
      // Fold the form away so the freshly saved draft is what the curator sees.
      setCreateOpen(false);
      setNotice('Draft saved. Publishing remains optional.');
    },
    onError: () => queryClient.invalidateQueries({ queryKey: plansKey }),
  });
  const change = useMutation({
    mutationFn: ({ kind, planId }: PlanAction) => kind === 'publish'
      ? publishCuratorPlan(planId)
      : archiveCuratorPlan(planId),
    onSuccess: (saved, action) => {
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => replacePlan(current, saved));
      setNotice(action.kind === 'publish'
        ? 'Membership plan published.'
        : 'Plan archived. Existing subscriptions were not canceled.');
    },
    onError: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileQueryKey }),
      queryClient.invalidateQueries({ queryKey: plansKey }),
      queryClient.invalidateQueries({ queryKey: proKey }),
      queryClient.invalidateQueries({ queryKey: payoutQueryKey }),
    ]),
  });

  const monthlyMinor = priceMinor(monthlyPrice);
  const annualEntered = annualPrice.trim() !== '';
  const annualMinor = annualEntered ? priceMinor(annualPrice) : null;
  const validMonthly = monthlyMinor !== null && monthlyMinor >= monthlyMinMinor && monthlyMinor <= monthlyMaxMinor;
  const validAnnual = annualMinor !== null && monthlyMinor !== null && annualMinor <= monthlyMinor * 12;
  const priceCurrency = pricing.data?.currency ?? 'USD';
  const monthlyError = validMonthly
    ? null
    : `Monthly price must be between ${money(monthlyMinMinor, priceCurrency)} and ${money(monthlyMaxMinor, priceCurrency)}.`;
  const annualError = !annualEntered || validAnnual
    ? null
    : annualMinor === null
      ? 'Enter a valid annual price.'
      : 'Annual price can be at most 12 monthly payments.';
  const showMonthlyError = monthlyError !== null && (submitAttempted || monthlyPrice.trim() !== '');
  const showAnnualError = annualError !== null;
  const monthlyEconomics = validMonthly && pricing.data
    ? calculateCuratorPlanEconomics(monthlyMinor, pricing.data)
    : null;
  const annualEconomics = validAnnual && pricing.data
    ? calculateCuratorPlanEconomics(annualMinor, pricing.data)
    : null;
  const activePlan = plans.data?.find((plan) => plan.status === 'active') ?? null;
  const profileReady = profile.status === 'active';
  const proReady = pro.data?.hasAccess === true;
  const payoutStarted = payout.data != null;
  const gatesConfirmed = profileReady && proReady && payoutStarted &&
    !pro.isPending && !pro.isError && !payout.isPending && !payout.isError;
  const featureNames = new Map(features.data?.map((feature) => [feature.featureKey, feature.displayName]));
  const corePending = plans.isPending || features.isPending || pricing.isPending;
  const coreError = plans.isError || features.isError || pricing.isError;

  return (
    <StudioSection
      id="studio-plan"
      eyebrow="Monetize"
      title="Fan membership plan"
      headingId="curator-plan-title"
      testId="curator-plan-card"
      description="Drafting is free. Active Curator Pro and started payout setup are required only when you publish."
    >
      <StudioNotice testId="curator-plan-notice" className="mb-8">{notice}</StudioNotice>
      <div className="space-y-8">
        {corePending ? (
          <output className="text-sm text-muted-foreground">Loading membership plan tools…</output>
        ) : coreError || !plans.data || !features.data || !pricing.data ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {getUserFacingApiErrorMessage(
                plans.error ?? features.error ?? pricing.error,
                'Membership plan tools are unavailable.',
              )}
              {' '}Your free profile, Curator Pro, and payout controls still work.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={() => void Promise.all([plans.refetch(), features.refetch(), pricing.refetch()])}
            >
              Try again
            </Button>
          </div>
        ) : (
          <>
            {plans.data.length > 0 && (
            <section aria-labelledby="saved-plans-title" className="space-y-4">
              <div>
                <h3 id="saved-plans-title" className="font-teko text-xl font-semibold uppercase tracking-tight">Your plans</h3>
                <p className="mt-1 text-sm text-muted-foreground">Published fan charges are frozen. Exact future accruals can change with your effective policy.</p>
              </div>
              {/* Requirements surface only while an unpublishable draft is waiting */}
              {!gatesConfirmed && plans.data.some((plan) => plan.status === 'draft') && (
                <dl aria-label="Publishing requirements" className="divide-y divide-border/70 text-sm">
                  <ReceiptRow
                    className="py-2.5"
                    label="Free profile"
                    value={profileReady ? (
                      <span className="inline-flex items-center gap-1 text-success-text">
                        <Check aria-hidden className="size-3.5" />
                        Active
                      </span>
                    ) : 'Not active'}
                  />
                  <ReceiptRow
                    className="py-2.5"
                    label="Curator Pro"
                    value={pro.isPending ? 'Checking…' : proReady ? (
                      <span className="inline-flex items-center gap-1 text-success-text">
                        <Check aria-hidden className="size-3.5" />
                        Active
                      </span>
                    ) : pro.isError ? (
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => void pro.refetch()}
                      >
                        Unavailable — retry
                      </button>
                    ) : 'Required'}
                  />
                  <ReceiptRow
                    className="py-2.5"
                    label="Payout setup"
                    value={payout.isPending ? 'Checking…' : payoutStarted ? (
                      <span className="inline-flex items-center gap-1 text-success-text">
                        <Check aria-hidden className="size-3.5" />
                        Started
                      </span>
                    ) : payout.isError ? (
                      <button
                        type="button"
                        className="underline underline-offset-2"
                        onClick={() => void payout.refetch()}
                      >
                        Unavailable — retry
                      </button>
                    ) : 'Not started'}
                  />
                </dl>
              )}
              {change.isError && (
                <p role="alert" className="text-sm text-destructive">
                  The plan action could not be confirmed. Review the refreshed plan state and try again if needed.
                </p>
              )}
              {plans.data.map((plan) => {
                const blockedByActivePlan = activePlan !== null && activePlan.id !== plan.id;
                const canPublish = plan.status === 'draft' && gatesConfirmed && !blockedByActivePlan;
                const changing = change.isPending && change.variables?.planId === plan.id;
                return (
                  <article
                    key={plan.id}
                    data-testid={`curator-plan-${plan.status}`}
                    className={cn(
                      'border-t-2',
                      plan.status === 'active' ? 'border-primary/60' : 'border-foreground/15',
                      plan.status === 'archived' && 'opacity-70',
                    )}
                  >
                    {/* Tier header: reads like the card a fan would see */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 py-4">
                      <div className="min-w-0">
                        <h4 className="break-words font-teko text-2xl font-semibold uppercase leading-none">{plan.name}</h4>
                        <p className="mt-1.5 text-sm text-muted-foreground">{plan.description || 'No description.'}</p>
                      </div>
                      <StudioChip tone={planChipTone[plan.status]} className="capitalize">{plan.status}</StudioChip>
                    </div>
                    <div className="space-y-4 py-4">
                      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
                        <div className="flex items-baseline justify-between gap-4">
                          <dt className="text-muted-foreground">Monthly price</dt>
                          <dd className="font-mono font-semibold tabular-nums">{money(plan.amountMinor, plan.currency)}</dd>
                        </div>
                        <div className="flex items-baseline justify-between gap-4">
                          <dt className="text-muted-foreground">Monthly fan charge</dt>
                          <dd className="font-mono tabular-nums">{plan.serviceFeeMinor === null ? 'Set when published' : `${money(plan.amountMinor + plan.serviceFeeMinor, plan.currency)} (frozen)`}</dd>
                        </div>
                        {plan.annualAmountMinor !== null && (
                          <>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt className="text-muted-foreground">Annual price</dt>
                              <dd className="font-mono font-semibold tabular-nums">{money(plan.annualAmountMinor, plan.currency)}</dd>
                            </div>
                            <div className="flex items-baseline justify-between gap-4">
                              <dt className="text-muted-foreground">Annual fan charge</dt>
                              <dd className="font-mono tabular-nums">{plan.annualServiceFeeMinor === null ? 'Set when published' : `${money(plan.annualAmountMinor + plan.annualServiceFeeMinor, plan.currency)} (frozen)`}</dd>
                            </div>
                          </>
                        )}
                      </dl>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Features: </span>
                        {plan.featureKeys.length === 0 ? 'None' : plan.featureKeys.map((key) => featureNames.get(key) ?? key).join(', ')}
                      </p>
                    {plan.status === 'draft' && (
                      <div className="space-y-2">
                        <Button
                          type="button"
                          data-testid="curator-plan-publish"
                          // aria-disabled keeps the button focusable so the linked
                          // requirement text stays reachable; the click is guarded.
                          aria-disabled={!canPublish || change.isPending ? true : undefined}
                          aria-describedby={[
                            !gatesConfirmed && `plan-${plan.id}-gates`,
                            blockedByActivePlan && `plan-${plan.id}-blocked`,
                          ].filter(Boolean).join(' ') || undefined}
                          className="w-full sm:w-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                          onClick={() => {
                            if (!canPublish || change.isPending) return;
                            setNotice(null);
                            change.mutate({ kind: 'publish', planId: plan.id });
                          }}
                        >
                          {changing ? 'Publishing…' : 'Publish plan'}
                        </Button>
                        {!gatesConfirmed && <p id={`plan-${plan.id}-gates`} className="text-xs text-muted-foreground">Confirm an active profile, Curator Pro, and started payout setup before publishing.</p>}
                        {blockedByActivePlan && <p id={`plan-${plan.id}-blocked`} className="text-xs text-muted-foreground">Archive the active plan before publishing this draft.</p>}
                      </div>
                    )}
                    {plan.status === 'active' && (
                      <div className="rounded-none border border-border p-4 sm:p-5">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                          What fans see
                        </p>
                        <h5 className="mt-3 break-words font-teko text-2xl font-semibold uppercase leading-none">
                          {plan.name}
                        </h5>
                        <p className="mt-1.5 text-sm">
                          <span className="font-mono font-semibold tabular-nums">{money(plan.amountMinor, plan.currency)}</span>
                          <span className="text-muted-foreground">/month</span>
                        </p>
                        {plan.description && (
                          <p className="mt-2 text-pretty text-sm text-muted-foreground">{plan.description}</p>
                        )}
                        {plan.featureKeys.length > 0 && (
                          <ul className="mt-3 space-y-1.5 text-sm">
                            {plan.featureKeys.map((key) => (
                              <li key={key} className="flex items-start gap-2">
                                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-primary" />
                                {featureNames.get(key) ?? key}
                              </li>
                            ))}
                          </ul>
                        )}
                        {/* Preview only: non-interactive stand-in for the join button. */}
                        <Button
                          type="button"
                          aria-disabled="true"
                          tabIndex={-1}
                          className="pointer-events-none mt-4 w-full"
                        >
                          Join {user?.displayName || 'you'}
                        </Button>
                        <p className="mt-2 text-center text-xs text-muted-foreground">
                          Preview — fans join from your public page
                        </p>
                      </div>
                    )}
                    {plan.status === 'active' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="outline" disabled={change.isPending}>Archive plan</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Archive this plan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Archiving stops new fans from joining this plan. Existing subscriptions are not canceled and keep their current Stripe price until the fan cancels.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep plan active</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setNotice(null);
                                change.mutate({ kind: 'archive', planId: plan.id });
                              }}
                            >
                              Archive plan
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                    </div>
                  </article>
                );
              })}
            </section>
            )}

            {/* Creating a plan is opt-in once plans exist; it opens automatically
                for first-time curators so the next step is obvious. */}
            <Collapsible
              open={createOpen ?? plans.data.length === 0}
              onOpenChange={setCreateOpen}
              className={cn(plans.data.length > 0 && 'border-t border-dashed border-border pt-6')}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="flex items-start gap-3">
                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-primary">
                      <Plus className="size-4 transition-transform group-data-[state=open]:rotate-45 motion-reduce:transition-none" />
                    </span>
                    <span>
                      <span className="block font-teko text-xl font-semibold uppercase tracking-tight">Create a draft</span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        Draft prices and benefits cannot be edited or deleted after saving.
                      </span>
                    </span>
                  </span>
                  <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <form
                  ref={formRef}
                  className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSubmitAttempted(true);
                    if (monthlyMinor === null || !validMonthly) {
                      monthlyRef.current?.focus();
                      return;
                    }
                    if (annualEntered && !validAnnual) {
                      annualRef.current?.focus();
                      return;
                    }
                    const data = new FormData(event.currentTarget);
                    const amountMinor = monthlyMinor;
                    const annualAmountMinor = annualEntered ? annualMinor : null;
                    setNotice(null);
                    create.mutate({
                      name: formText(data, 'name'),
                      description: formText(data, 'description'),
                      amountMinor,
                      annualAmountMinor,
                      // SAFETY: featureKeys belongs only to checkbox inputs in this form.
                      featureKeys: data.getAll('featureKeys') as string[],
                    });
                  }}
                >
                  <div className="min-w-0 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="curator-plan-name">Plan name</Label>
                      <Input id="curator-plan-name" name="name" required maxLength={150} placeholder="Selector Club" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="curator-plan-description">Description</Label>
                      <Textarea id="curator-plan-description" name="description" maxLength={2000} placeholder="Tell fans what membership supports." />
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="curator-plan-monthly">Monthly price (USD)</Label>
                        <Input
                          ref={monthlyRef}
                          id="curator-plan-monthly"
                          name="monthlyPrice"
                          type="text"
                          inputMode="decimal"
                          aria-required="true"
                          aria-invalid={showMonthlyError || undefined}
                          aria-describedby={showMonthlyError ? 'curator-plan-monthly-error' : undefined}
                          value={monthlyPrice}
                          onChange={(event) => setMonthlyPrice(event.target.value)}
                        />
                        {showMonthlyError && (
                          <p id="curator-plan-monthly-error" className="text-xs text-destructive">
                            {monthlyError}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="curator-plan-annual">Annual price (USD, optional)</Label>
                        <Input
                          ref={annualRef}
                          id="curator-plan-annual"
                          name="annualPrice"
                          type="text"
                          inputMode="decimal"
                          aria-invalid={showAnnualError || undefined}
                          aria-describedby={showAnnualError
                            ? 'curator-plan-annual-error curator-plan-annual-help'
                            : 'curator-plan-annual-help'}
                          value={annualPrice}
                          onChange={(event) => setAnnualPrice(event.target.value)}
                        />
                        {showAnnualError && (
                          <p id="curator-plan-annual-error" className="text-xs text-destructive">
                            {annualError}
                          </p>
                        )}
                        <p id="curator-plan-annual-help" className="text-xs text-muted-foreground">At most 12 monthly payments.</p>
                      </div>
                    </div>

                    <fieldset className="space-y-2.5">
                      <legend className="pb-1 text-sm font-semibold">
                        Included Cassette features
                      </legend>
                      {features.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No gated features are available.</p>
                      ) : features.data.map((feature) => (
                        <Label
                          htmlFor={`curator-feature-${feature.featureKey}`}
                          key={feature.featureKey}
                          // data-state highlights the row when its checkbox is on
                          className="flex items-start gap-3 rounded-none border border-border/70 p-3.5 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
                        >
                          <Checkbox id={`curator-feature-${feature.featureKey}`} className="mt-0.5" name="featureKeys" value={feature.featureKey} />
                          <span><span className="font-medium">{feature.displayName}</span><span className="mt-1 block text-muted-foreground">{feature.description}</span></span>
                        </Label>
                      ))}
                    </fieldset>

                    {create.isError && (
                      <p role="alert" className="text-sm text-destructive">
                        The draft save could not be confirmed. Review the refreshed saved plans before trying again.
                      </p>
                    )}
                    <Button type="submit" className="w-full sm:w-auto" disabled={create.isPending}>{create.isPending ? 'Saving draft…' : 'Save draft'}</Button>
                  </div>

                  {/* Live estimate beside the form, so pricing reads as a preview */}
                  <aside aria-labelledby="economics-title" className="space-y-4 lg:sticky lg:top-24">
                    <div>
                      <h3 id="economics-title" className="font-teko text-xl font-semibold uppercase tracking-tight">
                        Current-policy estimate
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Fan charges freeze when you publish. Future pricing-policy changes can change later accruals.
                      </p>
                    </div>
                    {monthlyEconomics && <EconomicsBreakdown economics={monthlyEconomics} currency={pricing.data.currency} interval="month" />}
                    {annualEconomics && <EconomicsBreakdown economics={annualEconomics} currency={pricing.data.currency} interval="year" />}
                    <dl className="divide-y divide-border/70 text-sm">
                      <div className="py-2.5">
                        <dt className="text-muted-foreground">Current Curator Pro base price</dt>
                        <dd className="mt-1">
                          <span className="font-mono tabular-nums">{money(pricing.data.curatorProMonthlyPriceMinor, pricing.data.currency)}</span>/month, billed separately
                        </dd>
                      </div>
                      <div className="py-2.5">
                        <dt className="text-muted-foreground">Payout schedule</dt>
                        <dd className="mt-1 text-pretty">
                          {/* capitalize only the cadence word, not the whole sentence */}
                          <span className="capitalize">{pricing.data.payoutCadence}</span>
                          , after your balance reaches{' '}
                          <span className="font-mono tabular-nums">{money(pricing.data.minPayoutMinor, pricing.data.currency)}</span>. Smaller cleared balances are paid after 90 days or when Curator Pro ends.
                        </dd>
                      </div>
                    </dl>
                    <p className="text-xs text-muted-foreground">Curator Pro is not subtracted from the estimated accrual.</p>
                  </aside>
                </form>
              </CollapsibleContent>
            </Collapsible>
          </>
        )}
      </div>
    </StudioSection>
  );
}
