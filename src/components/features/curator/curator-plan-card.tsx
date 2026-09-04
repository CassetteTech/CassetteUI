'use client';

/** Creates, edits, and manages curator membership plans from server-provided pricing policy. */

import { useContext, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
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
  deleteCuratorPlan,
  fetchCuratorFeatures,
  fetchCuratorPlans,
  fetchCuratorPricing,
  publishCuratorPlan,
  updateCuratorPlan,
  type CuratorPlan,
  type CuratorPlanRequest,
} from '@/services/curator-plans';
import { cn } from '@/lib/utils';
import {
  EconomicsBreakdown,
  FanPreview,
  money,
} from '@/components/features/curator/curator-plan-preview';
import {
  ReceiptRow,
  StudioChip,
  StudioNotice,
  StudioSection,
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

type PlanAction = { kind: 'publish' | 'archive'; planId: string };

const profileQueryKey = ['curator-profile', 'me'] as const;
const payoutQueryKey = ['curator-payout-account', 'current'] as const;
// Server contract bounds for the monthly price (see curatorPlanRequestSchema).
const monthlyMinMinor = 500;
const monthlyMaxMinor = 10_000;
const defaultMonthlyPrice = '5.00';

function priceMinor(value: string): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const minor = Math.round(amount * 100);
  return Number.isSafeInteger(minor) ? minor : null;
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

export function CuratorPlanCard({ profile }: { profile: CuratorProfile | null }) {
  const { user } = useAuthState();
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
  const plansKey = ['curator-plans', profile?.id ?? 'none'] as const;
  const proKey = ['curator-pro-status', user?.id ?? null] as const;
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
  const pro = useQuery({
    queryKey: proKey,
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(user?.id),
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
    mutationFn: ({ kind, planId }: PlanAction) => kind === 'publish'
      ? publishCuratorPlan(planId)
      : archiveCuratorPlan(planId),
    onSuccess: (saved, action) => {
      queryClient.setQueryData<CuratorPlan[]>(plansKey, (current) => replacePlan(current, saved));
      setNotice(action.kind === 'publish'
        ? 'Membership plan published. Fans can join from your public page.'
        : 'Plan archived. New fans can no longer join; existing members keep their price, access, and renewals.');
    },
    onError: () => Promise.all([
      queryClient.invalidateQueries({ queryKey: profileQueryKey }),
      queryClient.invalidateQueries({ queryKey: plansKey }),
      queryClient.invalidateQueries({ queryKey: proKey }),
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
  const monthlyEconomics = validMonthly && pricing.data
    ? calculateCuratorPlanEconomics(monthlyMinor, pricing.data)
    : null;
  const annualEconomics = validAnnual && pricing.data
    ? calculateCuratorPlanEconomics(annualMinor, pricing.data)
    : null;
  const activePlan = plansData?.find((plan) => plan.status === 'active') ?? null;
  const profileReady = profile?.status === 'active';
  const proReady = pro.data?.hasAccess === true;
  const payoutStarted = payout.data != null;
  const gatesConfirmed = profileReady && proReady && payoutStarted &&
    !pro.isPending && !pro.isError && !payout.isPending && !payout.isError;
  const featureNames = new Map(features.data?.map((feature) => [feature.featureKey, feature.displayName]));
  const namesFor = (keys: string[]) => keys.map((key) => featureNames.get(key) ?? key);
  const curatorName = user?.displayName || 'you';
  const corePending = (profile !== null && plans.isPending) || features.isPending || pricing.isPending;
  const coreError = plans.isError || features.isError || pricing.isError;
  const busy = save.isPending || remove.isPending;

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

  return (
    <StudioSection
      id="studio-plan"
      eyebrow="Monetize"
      title="Fan membership plan"
      headingId="curator-plan-title"
      testId="curator-plan-card"
      description="Drafting is free and drafts stay editable until you publish. Active Curator Pro and started payout setup are required only when you publish."
    >
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
            {plansData.length > 0 && (
            <section aria-labelledby="saved-plans-title" className="space-y-4">
              <div>
                <h3 id="saved-plans-title" className="font-teko text-xl font-semibold uppercase tracking-tight">Your plans</h3>
                <p className="mt-1 text-sm text-muted-foreground">Published fan charges are frozen. Exact future earnings can change with your effective policy.</p>
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
                    label="Curator Pro"
                    value={
                      <RequirementValue
                        met={proReady}
                        pending={pro.isPending}
                        onRetry={pro.isError ? () => void pro.refetch() : undefined}
                        metLabel="Active"
                        unmetLabel="Start Curator Pro"
                        href="#studio-pro"
                      />
                    }
                  />
                  <ReceiptRow
                    className="py-2.5"
                    label="Payout setup"
                    value={
                      <RequirementValue
                        met={payoutStarted}
                        pending={payout.isPending}
                        onRetry={payout.isError ? () => void payout.refetch() : undefined}
                        metLabel="Started"
                        unmetLabel="Start payout setup"
                        href="#studio-payouts"
                      />
                    }
                  />
                </dl>
                <p className="text-xs text-muted-foreground">
                  Fans can join once payout setup has started. Payouts themselves begin when your payout account is fully verified.
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
                const monthlyEstimate = plan.serviceFeeMinor === null
                  ? calculateCuratorPlanEconomics(plan.amountMinor, pricing.data)
                  : null;
                const annualEstimate = plan.annualAmountMinor !== null && plan.annualServiceFeeMinor === null
                  ? calculateCuratorPlanEconomics(plan.annualAmountMinor, pricing.data)
                  : null;
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
                            Before publishing, confirm an active <StepLink href="#studio-profile">profile</StepLink>,{' '}
                            <StepLink href="#studio-pro">Curator Pro</StepLink>, and started{' '}
                            <StepLink href="#studio-payouts">payout setup</StepLink>.
                          </p>
                        )}
                        {blockedByActivePlan && <p id={`plan-${plan.id}-blocked`} className="text-xs text-muted-foreground">Archive the active plan before publishing this draft.</p>}
                      </div>
                    )}
                    {plan.status !== 'archived' && !editing && (
                      <FanPreview
                        name={plan.name}
                        description={plan.description}
                        featureNames={namesFor(plan.featureKeys)}
                        curatorName={curatorName}
                        currency={plan.currency}
                        frozen={plan.status === 'active'}
                        monthly={plan.serviceFeeMinor !== null
                          ? { faceMinor: plan.amountMinor, serviceFeeMinor: plan.serviceFeeMinor }
                          : monthlyEstimate && { faceMinor: monthlyEstimate.faceMinor, serviceFeeMinor: monthlyEstimate.serviceFeeMinor }}
                        annual={plan.annualAmountMinor !== null && plan.annualServiceFeeMinor !== null
                          ? { faceMinor: plan.annualAmountMinor, serviceFeeMinor: plan.annualServiceFeeMinor }
                          : annualEstimate && { faceMinor: annualEstimate.faceMinor, serviceFeeMinor: annualEstimate.serviceFeeMinor }}
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
                    </div>
                  </article>
                );
              })}
            </section>
            )}

            {/* Creating a plan is opt-in once plans exist; it opens automatically
                for first-time curators so the next step is obvious. */}
            <Collapsible
              open={createOpen ?? plansData.length === 0}
              onOpenChange={setCreateOpen}
              className={cn(plansData.length > 0 && 'border-t border-dashed border-border pt-6')}
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
                      <span className="block font-teko text-xl font-semibold uppercase tracking-tight">
                        {editingPlan ? `Edit draft: ${editingPlan.name}` : 'Create a draft'}
                      </span>
                      <span className="mt-0.5 block text-sm text-muted-foreground">
                        Preview what fans will see as you type. Drafts can be changed or deleted until you publish.
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
                        Say what members get and how often. Fans read this before they join, so only promise what you will deliver.
                      </p>
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
                    <FanPreview
                      name={previewName}
                      description={previewDescription}
                      featureNames={namesFor(previewFeatures)}
                      curatorName={curatorName}
                      currency={pricing.data.currency}
                      frozen={false}
                      monthly={monthlyEconomics && { faceMinor: monthlyEconomics.faceMinor, serviceFeeMinor: monthlyEconomics.serviceFeeMinor }}
                      annual={annualEconomics && { faceMinor: annualEconomics.faceMinor, serviceFeeMinor: annualEconomics.serviceFeeMinor }}
                    />
                    <div>
                      <h3 id="economics-title" className="font-teko text-xl font-semibold uppercase tracking-tight">
                        What you earn
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Estimated under today’s pricing policy after Cassette’s platform fee, payout operations, and payment processing.
                        Fan charges freeze when you publish; later policy changes can change what you earn per member.
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
                    <p className="text-xs text-muted-foreground">Curator Pro is not subtracted from the estimated earnings.</p>
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
