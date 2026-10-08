'use client';

/** Creates, edits, and manages curator membership plans from server-provided pricing policy. */

import { useContext, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthState } from '@/hooks/use-auth';
import {
  CuratorPageError,
  fetchCuratorPayoutAccount,
  type CuratorProfile,
} from '@/services/curator';
import {
  addCuratorPlanAnnualPrice,
  archiveCuratorPlan,
  endCuratorMemberships,
  calculateCuratorPlanEconomics,
  createCuratorPlan,
  deleteCuratorPlan,
  fetchCuratorFeatures,
  fetchCuratorPlans,
  fetchCuratorPricing,
  publishCuratorPlan,
  updateCuratorPlan,
  type CuratorPlan,
  type CuratorPlanRequest,
  type CuratorPricing,
} from '@/services/curator-plans';
import { cn } from '@/lib/utils';
import {
  EconomicsBreakdown,
  FanPreview,
  type PreviewPrice,
  money,
} from '@/components/features/curator/curator-plan-preview';
import {
  ReceiptRow,
  StudioChip,
  StudioNotice,
  StudioSection,
  StudioStat,
  StudioStepsContext,
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

type PlanAction = { kind: 'publish' | 'archive' | 'end-memberships'; planId: string };

const planActions = {
  publish: {
    run: publishCuratorPlan,
    notice: 'Membership plan published. Fans can join from your public page.',
  },
  archive: {
    run: archiveCuratorPlan,
    notice: 'Plan archived. New fans can no longer join; existing members keep their price, access, and renewals.',
  },
  'end-memberships': {
    run: endCuratorMemberships,
    notice: 'Memberships ended. New fans can no longer join, and each member keeps access through the period they paid for.',
  },
} satisfies Record<PlanAction['kind'], { run: (planId: string) => Promise<CuratorPlan>; notice: string }>;

const profileQueryKey = ['curator-profile', 'me'] as const;
const payoutQueryKey = ['curator-payout-account', 'current'] as const;
const feeFormatter = new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 2 });
// Server contract bounds for the monthly price (see curatorPlanRequestSchema).
const monthlyMinMinor = 500;
const monthlyMaxMinor = 10_000;
const defaultMonthlyPrice = '5.00';
// Common price points inside the contract bounds; one tap sets the field.
const suggestedMonthlyMinor = [500, 1000, 1500, 2500] as const;

function priceMinor(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function priceText(amountMinor: number | null): string {
  return amountMinor === null ? '' : (amountMinor / 100).toFixed(2);
}

function formText(data: FormData, name: string): string {
  // SAFETY: each requested name belongs to a text input in this form.
  return (data.get(name) as string | null) ?? '';
}

function replacePlan(plans: CuratorPlan[] | undefined, saved: CuratorPlan): CuratorPlan[] {
  if (!plans) return [saved];
  return plans.some((plan) => plan.id === saved.id)
    ? plans.map((plan) => plan.id === saved.id ? saved : plan)
    : [saved, ...plans];
}

/** A saved plan's fan price: the frozen fee when published, else today's policy. */
function planPrice(faceMinor: number, serviceFeeMinor: number | null, pricing: CuratorPricing): PreviewPrice {
  return {
    faceMinor,
    serviceFeeMinor: serviceFeeMinor ?? calculateCuratorPlanEconomics(faceMinor, pricing).serviceFeeMinor,
  };
}

const planChipTone = {
  active: 'positive',
  draft: 'neutral',
  archived: 'neutral',
} satisfies Record<CuratorPlan['status'], StudioChipTone>;

function StepLink({ href, children }: { href: string; children: ReactNode }) {
  const steps = useContext(StudioStepsContext);
  return (
    <a href={href} className="underline underline-offset-2" onClick={() => steps?.open(href.slice(1))}>
      {children}
    </a>
  );
}

/** One publishing requirement: met, checking, retryable failure, or a link to the step that fixes it. */
function RequirementValue({ met, pending, onRetry, metLabel, unmetLabel, href }: {
  met: boolean;
  pending?: boolean;
  /** Present only when the underlying query failed. */
  onRetry?: () => void;
  metLabel: string;
  unmetLabel: string;
  href: string;
}) {
  if (pending) return <>Checking…</>;
  if (met) {
    return (
      <span className="inline-flex items-center gap-1 text-success-text">
        <Check aria-hidden className="size-3.5" />
        {metLabel}
      </span>
    );
  }
  if (onRetry) {
    return (
      <button type="button" className="underline underline-offset-2" onClick={onRetry}>
        Unavailable — retry
      </button>
    );
  }
  return <StepLink href={href}>{unmetLabel}</StepLink>;
}

/** Text price field framed by a currency sign and the billing interval. */
function PriceField({ unit, className, ...props }: React.ComponentProps<typeof Input> & { unit: string }) {
  return (
    <div className="relative">
      <span aria-hidden className="pointer-events-none absolute inset-y-0 left-3 flex items-center font-mono text-sm text-muted-foreground">$</span>
      <Input
        type="text"
        inputMode="decimal"
        className={cn('pl-7 pr-16 font-mono tabular-nums', className)}
        {...props}
      />
      <span aria-hidden className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">{unit}</span>
    </div>
  );
}

// Stable identity, so React calls it once on mount: focus moves from the control
// that unmounted to the one that replaced it.
const focusOnMount = (node: HTMLElement | null) => node?.focus();

/** Adds the one-time annual price to a published plan. The plan list is refetched
    after the request settles, so the card only changes once the server confirms it.
    Once the plan has an annual price the adder renders nothing. */
function AnnualPriceAdder({ plan, refresh, onAdded }: {
  plan: CuratorPlan;
  refresh: () => Promise<void>;
  onAdded: () => void;
}) {
  // null until first opened, so only Cancel returns focus to the opening button.
  const [open, setOpen] = useState<boolean | null>(null);
  const [price, setPrice] = useState('');
  const add = useMutation({
    mutationFn: (annualAmountMinor: number) => addCuratorPlanAnnualPrice(plan.id, annualAmountMinor),
    onSuccess: async () => {
      await refresh();
      onAdded();
    },
    onError: refresh,
  });
  const entered = price.trim() !== '';
  const annualMinor = entered ? priceMinor(price) : null;
  const valid = annualMinor !== null && annualMinor <= plan.amountMinor * 12;
  const inputError = !entered || valid
    ? null
    : annualMinor === null ? 'Enter a valid annual price.' : 'Annual price can be at most 12 monthly payments.';
  // Bridge's conflict copy names the exact blocker (plan state, profile state, or a price already added).
  const requestError = add.error instanceof CuratorPageError && add.error.status === 409
    ? add.error.message
    : getUserFacingApiErrorMessage(add.error, 'The annual price was not added.');

  if (plan.annualAmountMinor !== null) return null;
  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        data-testid="curator-plan-annual-open"
        ref={open === false ? focusOnMount : undefined}
        onClick={() => setOpen(true)}
      >
        Add annual price
      </Button>
    );
  }
  return (
    <form
      data-testid="curator-plan-annual-form"
      className="w-full max-w-sm space-y-2"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !add.isPending) add.mutate(annualMinor);
      }}
    >
      <Label htmlFor={`plan-${plan.id}-annual`}>Annual price<span className="sr-only"> (USD)</span></Label>
      <PriceField
        id={`plan-${plan.id}-annual`}
        unit="/year"
        ref={focusOnMount}
        aria-invalid={inputError ? true : undefined}
        aria-describedby={`plan-${plan.id}-annual-help`}
        value={price}
        onChange={(event) => setPrice(event.target.value)}
      />
      <p id={`plan-${plan.id}-annual-help`} className={cn('text-xs', inputError ? 'text-destructive' : 'text-muted-foreground')}>
        {inputError ?? `Up to ${money(plan.amountMinor * 12, plan.currency)}. Once added, it cannot change.`}
      </p>
      {/* Bridge prices the annual term from the plan's frozen fee schedule. The plan response
          carries only the frozen monthly fee, and today's policy can match that fee yet price the
          annual term differently, so no fan estimate is shown. */}
      {valid && <p className="text-xs text-muted-foreground">Fan fees follow this plan&apos;s original terms.</p>}
      {add.isError && <p role="alert" className="text-sm text-destructive">{requestError}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" className="w-full sm:w-auto" disabled={!valid || add.isPending}>
          {add.isPending ? 'Adding…' : 'Add annual price'}
        </Button>
        <Button type="button" variant="ghost" className="w-full sm:w-auto" disabled={add.isPending} onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function CuratorPlanCard({ profile }: { profile: CuratorProfile | null }) {
  const { user } = useAuthState();
  const passSlot = useContext(StudioStepsContext)?.passSlot ?? null;
  // During a payout provider return the payout card owns the single refresh
  // request and seeds this key; an ordinary read here would race it with stale data.
  const payoutFlowActive = useSearchParams().has('payout');
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const monthlyRef = useRef<HTMLInputElement>(null);
  const annualRef = useRef<HTMLInputElement>(null);
  const [monthlyPrice, setMonthlyPrice] = useState(defaultMonthlyPrice);
  const [annualPrice, setAnnualPrice] = useState('');
  // Uncontrolled text fields mirrored into state only to feed the live fan preview.
  const [previewName, setPreviewName] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewFeatures, setPreviewFeatures] = useState<string[]>([]);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  // null = follow the default (open only while the curator has no plans yet)
  const [createOpen, setCreateOpen] = useState<boolean | null>(null);
  // Draft currently loaded into the form; the form remounts (key) when this changes.
  const [editingId, setEditingId] = useState<string | null>(null);
  // With a live plan the card folds to a summary; the curator opens the tools on demand.
  const [expanded, setExpanded] = useState(false);
  const plansKey = ['curator-plans', profile?.id ?? 'none'] as const;
  const plans = useQuery({
    queryKey: plansKey,
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: profile !== null,
    staleTime: 0,
  });
  const features = useQuery({
    queryKey: ['curator-plan-features'],
    queryFn: ({ signal }) => fetchCuratorFeatures(signal),
    staleTime: 60 * 60 * 1000,
  });
  const pricing = useQuery({
    queryKey: ['curator-pricing', profile?.id ?? 'none'],
    queryFn: ({ signal }) => fetchCuratorPricing(signal),
    staleTime: 0,
  });
  const payout = useQuery({
    queryKey: payoutQueryKey,
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(false, signal),
    enabled: !payoutFlowActive,
    staleTime: 0,
  });

  const resetForm = () => {
    // Uncontrolled fields only remount when the form key changes (edit → new).
    formRef.current?.reset();
    setEditingId(null);
    setMonthlyPrice(defaultMonthlyPrice);
    setAnnualPrice('');
    setPreviewName('');
    setPreviewDescription('');
    setPreviewFeatures([]);
    setSubmitAttempted(false);
  };
  const save = useMutation({
    mutationFn: ({ planId, request }: { planId: string | null; request: CuratorPlanRequest }) =>
      planId ? updateCuratorPlan(planId, request) : createCuratorPlan(request),
    onSuccess: (saved, { planId }) => {
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => replacePlan(current, saved));
      resetForm();
      // Fold the form away so the freshly saved draft is what the curator sees.
      setCreateOpen(false);
      setNotice(planId ? 'Draft updated.' : 'Draft saved. Publishing remains optional.');
    },
    onError: () => queryClient.invalidateQueries({ queryKey: plansKey }),
  });
  const remove = useMutation({
    mutationFn: deleteCuratorPlan,
    onSuccess: (_, planId) => {
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => current?.filter((plan) => plan.id !== planId) ?? []);
      if (planId === editingId) resetForm();
      setNotice('Draft deleted.');
    },
    onError: () => queryClient.invalidateQueries({ queryKey: plansKey }),
  });
  const change = useMutation({
    mutationFn: ({ kind, planId }: PlanAction) => planActions[kind].run(planId),
    onSuccess: async (saved, action) => {
      // A plan list read sent before this action, such as the annual price refresh, would overwrite its result.
      await queryClient.cancelQueries({ queryKey: plansKey });
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => replacePlan(current, saved));
      // Ending memberships also archives the live offer, which the response does not carry.
      if (action.kind === 'end-memberships') void queryClient.invalidateQueries({ queryKey: plansKey });
      setExpanded(true);
      setNotice(planActions[action.kind].notice);
    },
    onError: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileQueryKey }),
      queryClient.invalidateQueries({ queryKey: plansKey }),
      queryClient.invalidateQueries({ queryKey: payoutQueryKey }),
    ]),
  });

  const plansData = profile ? plans.data : [];
  // A draft that was published or deleted elsewhere silently drops out of edit mode.
  const editingPlan = plansData?.find((plan) => plan.id === editingId && plan.status === 'draft') ?? null;
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
  const annualSavingsMinor = validAnnual ? monthlyMinor * 12 - annualMinor : null;
  const annualHelp = annualSavingsMinor === null
    ? 'Optional. At most 12 monthly payments.'
    : annualSavingsMinor === 0
      ? 'Same as 12 monthly payments.'
      : `Fans save ${money(annualSavingsMinor, priceCurrency)} a year (${Math.round((annualSavingsMinor / (annualSavingsMinor + (annualMinor ?? 0))) * 100)}%).`;
  const monthlyEconomics = validMonthly && pricing.data
    ? calculateCuratorPlanEconomics(monthlyMinor, pricing.data)
    : null;
  const annualEconomics = validAnnual && pricing.data
    ? calculateCuratorPlanEconomics(annualMinor, pricing.data)
    : null;
  const activePlan = plansData?.find((plan) => plan.status === 'active') ?? null;
  const profileReady = profile?.status === 'active';
  // Publishing needs a payout account Stripe has verified for transfers.
  const payoutReady = payout.data?.transfersCapabilityStatus === 'active';
  const gatesConfirmed = profileReady && payoutReady && !payout.isPending && !payout.isError;
  const featureByKey = new Map(features.data?.map((feature) => [feature.featureKey, feature]));
  const namesFor = (keys: string[]) => keys.map((key) => featureByKey.get(key)?.displayName ?? key);
  const benefitsFor = (keys: string[]) => keys.map((key) => ({
    featureKey: key,
    name: featureByKey.get(key)?.displayName ?? key,
    description: featureByKey.get(key)?.description ?? '',
  }));
  const curatorName = user?.displayName || 'you';
  const corePending = (profile !== null && plans.isPending) || features.isPending || pricing.isPending;
  const coreError = plans.isError || features.isError || pricing.isError;
  const busy = save.isPending || remove.isPending;

  // One membership pass for the whole Studio, portaled into the page rail: the
  // form's live estimate while it is open, else the active plan, else the draft.
  const passPlan = activePlan ?? plansData?.find((plan) => plan.status === 'draft') ?? null;
  const formOpen = createOpen ?? plansData?.length === 0;
  const curatorPass = {
    curatorName,
    curatorHandle: user?.username ?? '',
    curatorAvatarUrl: user?.profilePicture,
  };
  const pass = !pricing.data ? null : formOpen ? (
    <FanPreview
      {...curatorPass}
      name={previewName}
      description={previewDescription}
      benefits={benefitsFor(previewFeatures)}
      currency={pricing.data.currency}
      frozen={false}
      monthly={monthlyEconomics && { faceMinor: monthlyEconomics.faceMinor, serviceFeeMinor: monthlyEconomics.serviceFeeMinor }}
      annual={annualEconomics && { faceMinor: annualEconomics.faceMinor, serviceFeeMinor: annualEconomics.serviceFeeMinor }}
    />
  ) : passPlan && (
    <FanPreview
      {...curatorPass}
      name={passPlan.name}
      description={passPlan.description}
      benefits={benefitsFor(passPlan.featureKeys)}
      currency={passPlan.currency}
      frozen={passPlan.status === 'active'}
      monthly={planPrice(passPlan.amountMinor, passPlan.serviceFeeMinor, pricing.data)}
      annual={passPlan.annualAmountMinor === null ? null : planPrice(passPlan.annualAmountMinor, passPlan.annualServiceFeeMinor, pricing.data)}
    />
  );
  const rail = passSlot && pass ? createPortal(pass, passSlot) : null;

  const startEditing = (plan: CuratorPlan) => {
    setEditingId(plan.id);
    setMonthlyPrice(priceText(plan.amountMinor));
    setAnnualPrice(priceText(plan.annualAmountMinor));
    setPreviewName(plan.name);
    setPreviewDescription(plan.description);
    setPreviewFeatures(plan.featureKeys);
    setSubmitAttempted(false);
    setNotice(null);
    setCreateOpen(true);
    formRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  };

  if (activePlan && !expanded) {
    const fanMonthly = activePlan.serviceFeeMinor === null
      ? null
      : money(activePlan.amountMinor + activePlan.serviceFeeMinor, activePlan.currency);
    return (
      <StudioSection
        id="studio-plan"
        eyebrow="Monetize"
        title="Fan membership plan"
        headingId="curator-plan-title"
        testId="curator-plan-card"
      >
        {rail}
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
              <p className="break-words text-base font-semibold leading-tight">{activePlan.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activePlan.description || 'Fans join from your public page.'}
              </p>
            </div>
            <Button type="button" variant="outline" onClick={() => setExpanded(true)}>Manage plan</Button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-3">
            <StudioStat
              label="Monthly price"
              value={money(activePlan.amountMinor, activePlan.currency)}
              hint={fanMonthly && `Fans pay ${fanMonthly}`}
            />
            <StudioStat
              label="Annual price"
              value={activePlan.annualAmountMinor === null ? '—' : money(activePlan.annualAmountMinor, activePlan.currency)}
              hint={activePlan.annualAmountMinor === null ? 'Not offered' : 'Billed once a year'}
            />
            <StudioStat
              label="Included features"
              value={activePlan.featureKeys.length}
              hint={activePlan.featureKeys.length === 0 ? 'None' : namesFor(activePlan.featureKeys).join(', ')}
            />
          </dl>
        </div>
      </StudioSection>
    );
  }

  return (
    <StudioSection
      id="studio-plan"
      eyebrow="Monetize"
      title="Fan membership plan"
      headingId="curator-plan-title"
      testId="curator-plan-card"
      description="Drafts are free and stay editable. Publishing needs completed payout setup."
    >
      {rail}
      <StudioNotice testId="curator-plan-notice" className="mb-8">{notice}</StudioNotice>
      <div className="space-y-8">
        {corePending ? (
          <output className="text-sm text-muted-foreground">Loading membership plan tools…</output>
        ) : coreError || !plansData || !features.data || !pricing.data ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              {getUserFacingApiErrorMessage(
                plans.error ?? features.error ?? pricing.error,
                'Membership plan tools are unavailable.',
              )}
              {' '}Your free profile and payout controls still work.
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
            {plansData.length > 0 && (
            <section aria-labelledby="saved-plans-title" className="space-y-4">
              <div>
                <h3 id="saved-plans-title" className="text-sm font-semibold">Your plans</h3>
                <p className="mt-1 text-sm text-muted-foreground">Published fan charges are frozen. Your cut can still change with policy.</p>
              </div>
              {/* Requirements surface only while an unpublishable draft is waiting */}
              {!gatesConfirmed && plansData.some((plan) => plan.status === 'draft') && (
                <div className="space-y-2.5">
                <dl aria-label="Publishing requirements" className="divide-y divide-border/70 text-sm">
                  <ReceiptRow
                    className="py-2.5"
                    label="Free profile"
                    value={
                      <RequirementValue
                        met={profileReady}
                        metLabel="Active"
                        unmetLabel={profile ? 'Not active' : 'Create profile'}
                        href="#studio-profile"
                      />
                    }
                  />
                  <ReceiptRow
                    className="py-2.5"
                    label="Payout setup"
                    value={
                      <RequirementValue
                        met={payoutReady}
                        pending={payout.isPending}
                        onRetry={payout.isError ? () => void payout.refetch() : undefined}
                        metLabel="Complete"
                        unmetLabel={payout.data ? 'Finish payout setup' : 'Start payout setup'}
                        href="#studio-payouts"
                      />
                    }
                  />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Fans can join once Stripe has verified your payout account.
                </p>
                </div>
              )}
              {change.isError && (
                <p role="alert" className="text-sm text-destructive">
                  The plan action could not be confirmed. Review the refreshed plan state and try again if needed.
                </p>
              )}
              {remove.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {getUserFacingApiErrorMessage(remove.error, 'The draft could not be deleted.')}
                  {' '}Review the refreshed plan state and try again if needed.
                </p>
              )}
              {plansData.map((plan) => {
                const blockedByActivePlan = activePlan !== null && activePlan.id !== plan.id;
                const canPublish = plan.status === 'draft' && gatesConfirmed && !blockedByActivePlan;
                const changing = change.isPending && change.variables?.planId === plan.id;
                const editing = editingPlan?.id === plan.id;
                return (
                  <article
                    key={plan.id}
                    data-testid={`curator-plan-${plan.status}`}
                    className={cn(
                      'card-ink px-4 sm:px-5',
                      plan.status === 'active' && 'border-primary/40',
                      plan.status === 'archived' && 'opacity-70',
                    )}
                  >
                    {/* Tier header: reads like the card a fan would see */}
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 py-4">
                      <div className="min-w-0">
                        <h4 className="break-words text-base font-semibold leading-tight">{plan.name}</h4>
                        <p className="mt-1.5 text-sm text-muted-foreground">{plan.description || 'No description.'}</p>
                      </div>
                      <StudioChip tone={planChipTone[plan.status]} className="capitalize">
                        {editing ? 'Editing' : plan.status}
                      </StudioChip>
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
                        {plan.featureKeys.length === 0 ? 'None' : namesFor(plan.featureKeys).join(', ')}
                      </p>
                    {plan.status === 'draft' && (
                      <div className="space-y-2">
                        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                          <Button
                            type="button"
                            data-testid="curator-plan-publish"
                            // aria-disabled keeps the button focusable so the linked
                            // requirement text stays reachable; the click is guarded.
                            aria-disabled={!canPublish || change.isPending || editing ? true : undefined}
                            aria-describedby={[
                              !gatesConfirmed && `plan-${plan.id}-gates`,
                              blockedByActivePlan && `plan-${plan.id}-blocked`,
                            ].filter(Boolean).join(' ') || undefined}
                            className="w-full sm:w-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                            onClick={() => {
                              if (!canPublish || change.isPending || editing) return;
                              setNotice(null);
                              change.mutate({ kind: 'publish', planId: plan.id });
                            }}
                          >
                            {changing ? 'Publishing…' : 'Publish plan'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            data-testid="curator-plan-edit"
                            className="w-full sm:w-auto"
                            disabled={busy || change.isPending || editing}
                            onClick={() => startEditing(plan)}
                          >
                            {editing ? 'Editing…' : 'Edit draft'}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                data-testid="curator-plan-delete"
                                className="w-full text-destructive hover:text-destructive sm:w-auto"
                                disabled={busy || change.isPending}
                              >
                                Delete draft
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete this draft?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  “{plan.name}” has never been published, so no fan has joined it. Deleting it cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Keep draft</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => {
                                    setNotice(null);
                                    remove.mutate(plan.id);
                                  }}
                                >
                                  Delete draft
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                        {!gatesConfirmed && (
                          <p id={`plan-${plan.id}-gates`} className="text-xs text-muted-foreground">
                            Before publishing, confirm an active <StepLink href="#studio-profile">profile</StepLink>{' '}
                            and completed <StepLink href="#studio-payouts">payout setup</StepLink>.
                          </p>
                        )}
                        {blockedByActivePlan && <p id={`plan-${plan.id}-blocked`} className="text-xs text-muted-foreground">Archive the active plan before publishing this draft.</p>}
                      </div>
                    )}
                    {plan.status !== 'draft' && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    {plan.status === 'active' && profileReady && (
                      <AnnualPriceAdder
                        plan={plan}
                        refresh={() => queryClient.invalidateQueries({ queryKey: plansKey })}
                        onAdded={() => {
                          // An Archive or End memberships that settled first keeps its notice.
                          const current = queryClient.getQueryData<CuratorPlan[]>(plansKey)?.find((candidate) => candidate.id === plan.id);
                          if (current?.status === 'active') setNotice('Annual price added. Fans can now choose yearly billing.');
                        }}
                      />
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
                              Archiving stops new fans from joining this plan. Existing members are not affected: they keep their current price, access, and renewals until they cancel.
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button type="button" variant="outline" disabled={change.isPending}>End memberships</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>End all your memberships?</AlertDialogTitle>
                            <AlertDialogDescription>
                              New fans can no longer join. Each current member keeps access until the end of the period they already paid for, then their membership ends and they are not charged again. Each member gets one email with their end date. You keep what you earned. This cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Keep memberships</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => {
                                setNotice(null);
                                change.mutate({ kind: 'end-memberships', planId: plan.id });
                              }}
                            >
                              End memberships
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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
              open={formOpen}
              onOpenChange={setCreateOpen}
              className={cn(plansData.length > 0 && 'border-t border-dashed border-border pt-6')}
            >
              <CollapsibleTrigger asChild>
                <button
                  type="button"
                  className="group flex w-full items-center justify-between gap-4 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span className="flex items-start gap-3">
                    <span aria-hidden className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                      <Plus className="size-4 transition-transform group-data-[state=open]:rotate-45 motion-reduce:transition-none" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold">
                        {editingPlan ? `Edit draft: ${editingPlan.name}` : 'Create a draft'}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        The pass in the rail updates as you type.
                      </span>
                    </span>
                  </span>
                  <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180 motion-reduce:transition-none" />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                {!profile && (
                  <p className="mt-6 text-sm">
                    Preview your offer now.{' '}
                    <StepLink href="#studio-profile">Create your free profile</StepLink> to save it as a draft.
                  </p>
                )}
                <form
                  ref={formRef}
                  key={editingPlan?.id ?? 'new'}
                  className="grid gap-8 pt-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setSubmitAttempted(true);
                    if (!profile || busy) return;
                    if (monthlyMinor === null || !validMonthly) {
                      monthlyRef.current?.focus();
                      return;
                    }
                    if (annualEntered && !validAnnual) {
                      annualRef.current?.focus();
                      return;
                    }
                    const data = new FormData(event.currentTarget);
                    setNotice(null);
                    save.mutate({
                      planId: editingPlan?.id ?? null,
                      request: {
                        name: formText(data, 'name'),
                        description: formText(data, 'description'),
                        amountMinor: monthlyMinor,
                        annualAmountMinor: annualEntered ? annualMinor : null,
                        // SAFETY: featureKeys belongs only to checkbox inputs in this form.
                        featureKeys: data.getAll('featureKeys') as string[],
                      },
                    });
                  }}
                >
                  <div className="min-w-0 space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="curator-plan-name">Plan name</Label>
                      <Input
                        id="curator-plan-name"
                        name="name"
                        required
                        maxLength={150}
                        placeholder="Selector Club"
                        defaultValue={editingPlan?.name ?? ''}
                        onChange={(event) => setPreviewName(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="curator-plan-description">Description</Label>
                      <Textarea
                        id="curator-plan-description"
                        name="description"
                        maxLength={2000}
                        placeholder="Two exclusive playlists every week, plus a monthly members-only mix."
                        aria-describedby="curator-plan-description-help"
                        defaultValue={editingPlan?.description ?? ''}
                        onChange={(event) => setPreviewDescription(event.target.value)}
                      />
                      <p id="curator-plan-description-help" className="text-xs text-muted-foreground">
                        What members get and how often. Promise only what you will deliver.
                      </p>
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        {/* The field shows the currency itself; the parenthetical stays in the accessible name. */}
                        <Label htmlFor="curator-plan-monthly">Monthly price<span className="sr-only"> (USD)</span></Label>
                        <PriceField
                          ref={monthlyRef}
                          id="curator-plan-monthly"
                          name="monthlyPrice"
                          unit="/month"
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
                        <fieldset className="flex flex-wrap gap-1.5 pt-0.5">
                          <legend className="sr-only">Suggested monthly prices</legend>
                          {suggestedMonthlyMinor.map((minor) => (
                            <Button
                              key={minor}
                              type="button"
                              variant="outline"
                              size="xs"
                              aria-pressed={monthlyMinor === minor}
                              className="rounded-full font-mono tabular-nums aria-pressed:border-primary aria-pressed:bg-primary/10 aria-pressed:text-foreground"
                              onClick={() => setMonthlyPrice(priceText(minor))}
                            >
                              ${minor / 100}
                            </Button>
                          ))}
                        </fieldset>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="curator-plan-annual">Annual price<span className="sr-only"> (USD, optional)</span></Label>
                        <PriceField
                          ref={annualRef}
                          id="curator-plan-annual"
                          name="annualPrice"
                          unit="/year"
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
                        <p id="curator-plan-annual-help" className="text-xs text-muted-foreground">{annualHelp}</p>
                      </div>
                    </div>

                    <fieldset className="space-y-2.5">
                      <legend className="pb-1 text-sm font-semibold">
                        Included features
                      </legend>
                      {features.data.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No gated features are available.</p>
                      ) : features.data.map((feature) => (
                        <Label
                          htmlFor={`curator-feature-${feature.featureKey}`}
                          key={feature.featureKey}
                          // data-state highlights the row when its checkbox is on
                          className="flex items-start gap-3 rounded-lg border border-border p-3.5 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary/50 has-[[data-state=checked]]:bg-primary/5"
                        >
                          <Checkbox
                            id={`curator-feature-${feature.featureKey}`}
                            className="mt-0.5"
                            name="featureKeys"
                            value={feature.featureKey}
                            defaultChecked={editingPlan?.featureKeys.includes(feature.featureKey) ?? false}
                            onCheckedChange={(checked) => setPreviewFeatures((current) => checked === true
                              ? [...current, feature.featureKey]
                              : current.filter((key) => key !== feature.featureKey))}
                          />
                          <span><span className="font-medium">{feature.displayName}</span><span className="mt-1 block text-muted-foreground">{feature.description}</span></span>
                        </Label>
                      ))}
                    </fieldset>

                    {save.isError && (
                      <p role="alert" className="text-sm text-destructive">
                        {getUserFacingApiErrorMessage(save.error, 'The draft could not be saved.')}
                        {' '}Review the refreshed saved plans before trying again.
                      </p>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <Button
                        type="submit"
                        className="w-full sm:w-auto aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                        aria-disabled={!profile || undefined}
                        disabled={busy}
                      >
                        {save.isPending
                          ? 'Saving draft…'
                          : editingPlan ? 'Save changes' : 'Save draft'}
                      </Button>
                      {editingPlan && (
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:w-auto"
                          disabled={busy}
                          onClick={resetForm}
                        >
                          Cancel edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Live preview and estimate beside the form */}
                  <aside aria-labelledby="economics-title" className="space-y-4 lg:sticky lg:top-24">
                    <div>
                      <h3 id="economics-title" className="text-sm font-semibold">
                        What you earn
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Estimated under today’s policy. Fan charges freeze when you publish; your cut can still change with policy.
                      </p>
                    </div>
                    {monthlyEconomics
                      ? <EconomicsBreakdown economics={monthlyEconomics} currency={pricing.data.currency} interval="month" />
                      : <p className="text-sm text-muted-foreground">Enter a monthly price to see the estimate.</p>}
                    {annualEconomics && <EconomicsBreakdown economics={annualEconomics} currency={pricing.data.currency} interval="year" />}
                    <dl className="divide-y divide-border/70 text-xs">
                      <div className="py-2.5">
                        <dt className="text-muted-foreground">Platform fee on fan payments</dt>
                        <dd className="mt-1 font-mono text-sm tabular-nums">
                          {feeFormatter.format(pricing.data.platformFeeBps / 10_000)}
                        </dd>
                      </div>
                      <div className="py-2.5">
                        <dt className="text-muted-foreground">Payouts</dt>
                        <dd className="mt-1 text-sm">
                          {/* capitalize only the cadence word, not the whole sentence */}
                          <span className="capitalize">{pricing.data.payoutCadence}</span>
                          , after your balance reaches{' '}
                          <span className="font-mono tabular-nums">{money(pricing.data.minPayoutMinor, pricing.data.currency)}</span>. Smaller cleared balances are paid after 90 days.
                        </dd>
                      </div>
                    </dl>
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
