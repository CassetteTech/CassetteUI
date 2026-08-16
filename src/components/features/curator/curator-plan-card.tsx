'use client';

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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type PlanAction = { kind: 'publish' | 'archive'; planId: string };

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
    <div className="rounded-md border bg-muted/30 p-4">
      <h4 className="font-semibold capitalize">Per {interval}</h4>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Your price</dt><dd>{money(economics.faceMinor, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Fan service fee</dt><dd>{money(economics.serviceFeeMinor, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Fan pays</dt><dd className="font-semibold">{money(economics.fanChargeMinor, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Cassette platform fee</dt><dd>−{money(economics.platformFeeMinor, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Payout operations fee</dt><dd>−{money(economics.payoutOpsFeeMinor, currency)}</dd></div>
        <div><dt className="text-muted-foreground">Payment processing</dt><dd>−{money(economics.processingFeeMinor, currency)}</dd></div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Estimated curator accrual</dt>
          <dd className="text-lg font-semibold">{money(economics.curatorAccrualMinor, currency)}</dd>
        </div>
      </dl>
    </div>
  );
}

export function CuratorPlanCard({ profile }: { profile: CuratorProfile }) {
  const { user } = useAuthState();
  const queryClient = useQueryClient();
  const formRef = useRef<HTMLFormElement>(null);
  const [monthlyPrice, setMonthlyPrice] = useState('5.00');
  const [annualPrice, setAnnualPrice] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const profileKey = ['curator-profile', 'me'] as const;
  const plansKey = ['curator-plans', profile.id] as const;
  const proKey = ['curator-pro-status', user?.id ?? null] as const;
  const payoutKey = ['curator-payout-account', 'current'] as const;
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
    queryKey: payoutKey,
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
      queryClient.invalidateQueries({ queryKey: profileKey }),
      queryClient.invalidateQueries({ queryKey: plansKey }),
      queryClient.invalidateQueries({ queryKey: proKey }),
      queryClient.invalidateQueries({ queryKey: payoutKey }),
    ]),
  });

  const monthlyMinor = priceMinor(monthlyPrice);
  const annualMinor = annualPrice.trim() ? priceMinor(annualPrice) : null;
  const validMonthly = monthlyMinor !== null && monthlyMinor >= 500 && monthlyMinor <= 10_000;
  const validAnnual = annualMinor !== null && monthlyMinor !== null && annualMinor <= monthlyMinor * 12;
  const monthlyEconomics = validMonthly && pricing.data
    ? calculateCuratorPlanEconomics(monthlyMinor, pricing.data)
    : null;
  const annualEconomics = validAnnual && pricing.data
    ? calculateCuratorPlanEconomics(annualMinor, pricing.data)
    : null;
  const activePlan = plans.data?.find((plan) => plan.status === 'active') ?? null;
  const profileReady = profile.status === 'active';
  const proReady = pro.data?.hasAccess === true;
  const payoutReady = payout.data?.transfersCapabilityStatus === 'active';
  const gatesConfirmed = profileReady && proReady && payoutReady &&
    !pro.isPending && !pro.isError && !payout.isPending && !payout.isError;
  const featureNames = new Map(features.data?.map((feature) => [feature.featureKey, feature.displayName]));
  const corePending = plans.isPending || features.isPending || pricing.isPending;
  const coreError = plans.isError || features.isError || pricing.isError;

  return (
    <Card data-testid="curator-plan-card" aria-labelledby="curator-plan-title">
      <CardHeader>
        <h2 id="curator-plan-title" className="text-xl font-semibold">Fan membership plan</h2>
        <p className="text-sm text-muted-foreground">
          Drafting is free. Active Curator Pro and ready payouts are required only when you publish.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {notice && (
          <output aria-live="polite" data-testid="curator-plan-notice" className="block rounded-md border bg-muted/40 p-3 text-sm">
            {notice}
          </output>
        )}

        {corePending ? (
          <output className="text-sm text-muted-foreground">Loading membership plan tools…</output>
        ) : coreError || !plans.data || !features.data || !pricing.data ? (
          <div className="space-y-3">
            <p role="alert" className="text-sm text-destructive">
              Membership plan tools are unavailable. Your free profile, Curator Pro, and payout controls still work.
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
            <section aria-labelledby="plan-prerequisites-title" className="rounded-md border p-4">
              <h3 id="plan-prerequisites-title" className="font-semibold">Publishing requirements</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-muted-foreground">Free profile</dt><dd>{profileReady ? 'Active' : 'Not active'}</dd></div>
                <div><dt className="text-muted-foreground">Curator Pro</dt><dd>{pro.isPending ? 'Checking…' : proReady ? 'Active' : pro.isError ? 'Unavailable' : 'Required'}</dd></div>
                <div><dt className="text-muted-foreground">Payout transfers</dt><dd>{payout.isPending ? 'Checking…' : payoutReady ? 'Ready' : payout.isError ? 'Unavailable' : 'Not ready'}</dd></div>
              </dl>
            </section>

            <form
              ref={formRef}
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                const amountMinor = priceMinor(monthlyPrice);
                const annualAmountMinor = annualPrice.trim() ? priceMinor(annualPrice) : null;
                if (amountMinor === null || (annualPrice.trim() && annualAmountMinor === null)) return;
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
              <div>
                <h3 className="font-semibold">Create a draft</h3>
                <p className="mt-1 text-sm text-muted-foreground">Draft prices and benefits cannot be edited or deleted after saving.</p>
              </div>

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
                    id="curator-plan-monthly"
                    name="monthlyPrice"
                    type="number"
                    inputMode="decimal"
                    min="5"
                    max="100"
                    step="0.01"
                    required
                    value={monthlyPrice}
                    onChange={(event) => setMonthlyPrice(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curator-plan-annual">Annual price (USD, optional)</Label>
                  <Input
                    id="curator-plan-annual"
                    name="annualPrice"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    max={monthlyMinor === null ? '1200' : String(monthlyMinor * 0.12)}
                    step="0.01"
                    value={annualPrice}
                    onChange={(event) => setAnnualPrice(event.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">At most 12 monthly payments.</p>
                </div>
              </div>

              <fieldset className="space-y-3">
                <legend className="font-medium">Included Cassette features</legend>
                {features.data.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No gated features are available.</p>
                ) : features.data.map((feature) => (
                  <Label htmlFor={`curator-feature-${feature.featureKey}`} key={feature.featureKey} className="flex items-start gap-3 rounded-md border p-3 text-sm font-normal">
                    <input id={`curator-feature-${feature.featureKey}`} className="mt-0.5 size-4 accent-primary" type="checkbox" name="featureKeys" value={feature.featureKey} />
                    <span><span className="font-medium">{feature.displayName}</span><span className="mt-1 block text-muted-foreground">{feature.description}</span></span>
                  </Label>
                ))}
              </fieldset>

              <section aria-labelledby="economics-title" className="space-y-4">
                <div>
                  <h3 id="economics-title" className="font-semibold">Current-policy estimate</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Fan charges freeze when you publish. Future pricing-policy changes can change later accruals.
                  </p>
                </div>
                {monthlyEconomics && <EconomicsBreakdown economics={monthlyEconomics} currency={pricing.data.currency} interval="month" />}
                {annualEconomics && <EconomicsBreakdown economics={annualEconomics} currency={pricing.data.currency} interval="year" />}
                <dl className="grid gap-3 rounded-md border p-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Current Curator Pro base price</dt>
                    <dd>{money(pricing.data.curatorProMonthlyPriceMinor, pricing.data.currency)}/month, billed separately</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Payout schedule</dt>
                    <dd className="capitalize">{pricing.data.payoutCadence}, after your balance reaches {money(pricing.data.minPayoutMinor, pricing.data.currency)}</dd>
                  </div>
                </dl>
                <p className="text-xs text-muted-foreground">Curator Pro is not subtracted from the estimated accrual.</p>
              </section>

              {create.isError && (
                <p role="alert" className="text-sm text-destructive">
                  The draft save could not be confirmed. Review the refreshed saved plans before trying again.
                </p>
              )}
              <Button type="submit" disabled={create.isPending}>{create.isPending ? 'Saving draft…' : 'Save draft'}</Button>
            </form>

            <section aria-labelledby="saved-plans-title" className="space-y-4 border-t pt-6">
              <div>
                <h3 id="saved-plans-title" className="font-semibold">Saved plans</h3>
                <p className="mt-1 text-sm text-muted-foreground">Published fan charges are frozen. Exact future accruals can change with your effective policy.</p>
              </div>
              {change.isError && (
                <p role="alert" className="text-sm text-destructive">
                  The plan action could not be confirmed. Review the refreshed plan state and try again if needed.
                </p>
              )}
              {plans.data.length === 0 ? (
                <p className="text-sm text-muted-foreground">No plans yet.</p>
              ) : plans.data.map((plan) => {
                const blockedByActivePlan = activePlan !== null && activePlan.id !== plan.id;
                const canPublish = plan.status === 'draft' && gatesConfirmed && !blockedByActivePlan;
                const changing = change.isPending && change.variables?.planId === plan.id;
                return (
                  <article key={plan.id} className="space-y-4 rounded-md border p-4" data-testid={`curator-plan-${plan.status}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><h4 className="font-semibold">{plan.name}</h4><p className="mt-1 text-sm text-muted-foreground">{plan.description || 'No description.'}</p></div>
                      <Badge variant={plan.status === 'active' ? 'default' : 'outline'} className="capitalize">{plan.status}</Badge>
                    </div>
                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                      <div><dt className="text-muted-foreground">Monthly price</dt><dd>{money(plan.amountMinor, plan.currency)}</dd></div>
                      <div>
                        <dt className="text-muted-foreground">Monthly fan charge</dt>
                        <dd>{plan.serviceFeeMinor === null ? 'Set when published' : `${money(plan.amountMinor + plan.serviceFeeMinor, plan.currency)} (frozen)`}</dd>
                      </div>
                      {plan.annualAmountMinor !== null && (
                        <>
                          <div><dt className="text-muted-foreground">Annual price</dt><dd>{money(plan.annualAmountMinor, plan.currency)}</dd></div>
                          <div>
                            <dt className="text-muted-foreground">Annual fan charge</dt>
                            <dd>{plan.annualServiceFeeMinor === null ? 'Set when published' : `${money(plan.annualAmountMinor + plan.annualServiceFeeMinor, plan.currency)} (frozen)`}</dd>
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
                          disabled={!canPublish || change.isPending}
                          onClick={() => {
                            setNotice(null);
                            change.mutate({ kind: 'publish', planId: plan.id });
                          }}
                        >
                          {changing ? 'Publishing…' : 'Publish plan'}
                        </Button>
                        {!gatesConfirmed && <p className="text-xs text-muted-foreground">Confirm an active profile, Curator Pro, and ready payout transfers before publishing.</p>}
                        {blockedByActivePlan && <p className="text-xs text-muted-foreground">Archive the active plan before publishing this draft.</p>}
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
                  </article>
                );
              })}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
