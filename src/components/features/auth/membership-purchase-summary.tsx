'use client';

// Keeps the fan's selected membership purchase visible across sign-in, sign-up,
// and onboarding. The offer is always the curator's current public plan;
// nothing about price is trusted from the redirect URL.

import Link from 'next/link';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { CuratorPageError, fetchCuratorPage, formatCuratorPlanPrice, type CuratorPage } from '@/services/curator';
import type { MembershipIntent } from '@/utils/auth-redirect';

export type MembershipPurchaseContext = UseQueryResult<CuratorPage, Error>;

export function useMembershipPurchaseContext(intent: MembershipIntent | null): MembershipPurchaseContext {
  return useQuery({
    queryKey: ['membership-purchase-context', intent?.username.toLowerCase() ?? null],
    queryFn: ({ signal }) => fetchCuratorPage(intent?.username ?? '', 1, 1, '', signal),
    enabled: intent !== null,
    staleTime: 60_000,
    retry: (count, error) => !(error instanceof CuratorPageError && error.status === 404) && count < 2,
  });
}

type PublicPlan = NonNullable<CuratorPage['membership']>;

// Total the fan is charged per period (plan price plus Cassette service fee)
// for the requested interval; null when that interval is not offered.
function planTotal(plan: PublicPlan, interval: MembershipIntent['interval']) {
  if (interval === 'year') {
    return plan.annualAmountMinor != null && plan.annualServiceFeeMinor != null
      ? formatCuratorPlanPrice(plan.annualAmountMinor, plan.annualServiceFeeMinor, plan.currency)
      : null;
  }
  return formatCuratorPlanPrice(plan.amountMinor, plan.serviceFeeMinor, plan.currency);
}

export function MembershipPurchaseSummary({
  intent,
  context,
  nextStep,
}: {
  intent: MembershipIntent;
  context: MembershipPurchaseContext;
  nextStep: string;
}) {
  const page = context.data;
  const plan = page?.membership ?? null;
  const displayName = page ? page.curator.displayName?.trim() || page.curator.username : `@${intent.username}`;
  const total = plan ? planTotal(plan, intent.interval) : null;
  const curatorHref = `/profile/${encodeURIComponent(intent.username)}`;

  let body: React.ReactNode;
  if (context.isPending) {
    body = <p className="text-sm text-muted-foreground">Loading membership details…</p>;
  } else if (context.isError && context.error instanceof CuratorPageError && context.error.status === 404) {
    body = <p className="text-sm text-muted-foreground">We could not find that curator. You can still continue and browse Cassette.</p>;
  } else if (context.isError) {
    body = <p className="text-sm text-muted-foreground">Membership details are temporarily unavailable. Continue and they will show on the curator page.</p>;
  } else if (!plan) {
    body = (
      <p className="text-sm text-muted-foreground">
        {displayName} is not offering a membership right now. You can still continue and follow their page.
      </p>
    );
  } else if (!total) {
    // The selected interval is no longer offered: say so and send the fan back
    // to pick a real option rather than presenting another price as chosen.
    body = (
      <p className="text-sm text-muted-foreground">
        Annual billing is no longer offered for {plan.name}.{' '}
        <Link href={curatorHref} className="underline underline-offset-4 text-foreground hover:text-primary">
          Choose a billing option
        </Link>{' '}
        before continuing.
      </p>
    );
  } else {
    body = (
      <>
        <p className="text-sm">
          <span className="font-semibold">{plan.name}</span>
          {' · '}
          <span className="tabular-nums" data-testid="membership-purchase-total">
            {total}/{intent.interval}
          </span>
          {intent.interval === 'year' && <span className="text-muted-foreground"> · billed annually</span>}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Includes the service fee. Applicable tax is added at checkout. Renews {intent.interval === 'year' ? 'annually' : 'monthly'}; manage or cancel renewal in billing settings.
        </p>
      </>
    );
  }

  return (
    <section
      aria-label="Membership purchase"
      data-testid="membership-purchase-summary"
      className="mb-6 border-2 border-foreground bg-background p-4 text-left shadow-flat-3"
    >
      <p className="text-sm font-semibold">
        Joining {displayName}
      </p>
      <div className="mt-2">{body}</div>
      <p className="mt-3 text-xs text-muted-foreground">{nextStep}</p>
    </section>
  );
}
