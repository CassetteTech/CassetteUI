'use client';

/** Curator Studio: a dashboard with a view rail (Overview, Members, Payouts &
    billing). Every view stays mounted so section queries dedupe and Stripe
    return flows resolve whichever view is showing. The free curator profile is
    created with one click from the launch checklist; it has no editable fields. */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, CreditCard, HandCoins, LayoutDashboard } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPayoutHistory } from '@/components/features/curator/curator-payout-history';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import { StudioOverview, type LaunchStep } from '@/components/features/curator/studio-overview';
import {
  StudioChip,
  StudioSection,
  StudioStepsContext,
  studioViewOf,
  type StudioView,
} from '@/components/features/curator/studio-shell';
import { CopyButton } from '@/components/interior/copy-button';
import { CoralGlow } from '@/components/ui/coral-glow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import {
  createCuratorProfile,
  fetchCuratorPayoutAccount,
  fetchOwnCuratorProfile,
  type CuratorProfile,
} from '@/services/curator';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';

const profileQueryKey = ['curator-profile', 'me'] as const;

const views: ReadonlyArray<{ id: StudioView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'studio-overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'studio-earnings', label: 'Members', icon: HandCoins },
  { id: 'studio-billing', label: 'Payouts & billing', icon: CreditCard },
];

/** Launch-checklist state shared by the header, the overview, and the default
    view. Reads the same query keys the section cards use, so React Query
    dedupes the requests and every surface stays in sync. */
function useLaunchSteps(profile: CuratorProfile | null) {
  const { user } = useAuthState();
  const searchParams = useSearchParams();
  // Provider return flows land on their owning section. During a payout return,
  // the payout card owns the single refresh request.
  const flowStep = searchParams.has('payout')
    ? 'studio-payouts'
    : searchParams.has('pro') ? 'studio-pro' : null;
  const payoutFlowActive = flowStep === 'studio-payouts';
  const pro = useQuery({
    queryKey: ['curator-pro-status', user?.id ?? null],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const payout = useQuery({
    queryKey: ['curator-payout-account', 'current'],
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(false, signal),
    enabled: !payoutFlowActive,
    staleTime: 0,
  });
  const plans = useQuery({
    queryKey: ['curator-plans', profile?.id ?? 'none'],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: Boolean(profile),
    staleTime: 0,
  });

  // Accepting members needs payout setup to have started; transfers going
  // active is payout readiness, which the payout card tracks separately so a
  // published plan never reads as launch-incomplete because of verification lag.
  const payoutStarted = payout.data != null;
  const hasPlan = plans.data?.some((plan) => plan.status !== 'archived') === true;
  const hasActivePlan = plans.data?.some((plan) => plan.status === 'active') === true;
  const steps: LaunchStep[] = [
    { href: '#studio-profile', label: 'Create your free profile', done: profile?.status === 'active' },
    { href: '#studio-plan', label: 'Prepare and preview your offer', done: hasPlan },
    { href: '#studio-pro', label: 'Start Curator Pro', done: pro.data?.hasAccess === true },
    { href: '#studio-payouts', label: 'Start payout setup', done: payoutStarted },
    { href: '#studio-plan', label: 'Publish your membership plan', done: hasActivePlan },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const nextIndex = steps.findIndex((step) => !step.done);
  const isPending = pro.isPending ||
    !payoutFlowActive && payout.isPending ||
    profile !== null && plans.isPending;

  return {
    steps,
    doneCount,
    nextIndex,
    isPending,
    flowStep,
    pro: pro.data,
    payoutStarted,
  };
}

type LaunchState = ReturnType<typeof useLaunchSteps>;

const todayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StudioHeader({ pro }: { pro: LaunchState['pro'] }) {
  const { user } = useAuthState();
  const username = user?.username ?? null;
  const publicPath = username ? `/profile/${encodeURIComponent(username)}` : null;
  const firstName = user?.displayName.trim().split(/\s+/)[0] || username;
  const now = new Date();

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {firstName && (
          <p className="mb-1.5 flex flex-wrap items-baseline gap-x-2 text-sm text-muted-foreground">
            <span>{greeting(now.getHours())}, {firstName}.</span>
            <time dateTime={now.toISOString().slice(0, 10)} className="font-mono text-xs tabular-nums">
              {todayFormatter.format(now)}
            </time>
          </p>
        )}
        <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
          Curator Studio
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pro && (
          <StudioChip tone={pro.hasAccess ? (pro.cancelAtPeriodEnd ? 'warning' : 'positive') : 'neutral'}>
            {pro.hasAccess ? 'Curator Pro' : 'Free profile'}
          </StudioChip>
        )}
        {username && <span className="mr-2 truncate text-sm text-muted-foreground">@{username}</span>}
        {publicPath && (
          <>
            <CopyButton
              label="Copy page link"
              copiedLabel="Link copied"
              value={() => `${window.location.origin}${publicPath}`}
            />
            <Button asChild variant="outline" size="sm">
              <Link href={publicPath}>
                View public page
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          </>
        )}
      </div>
    </header>
  );
}

function CuratorStudio() {
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });
  const launch = useLaunchSteps(profile.data ?? null);
  const queryClient = useQueryClient();
  // The free profile has no fields, so "create your free profile" anywhere on the page is one click.
  const createProfile = useMutation({
    mutationFn: () => createCuratorProfile({ headline: null, about: null, declaredGenres: [], declaredPlatforms: [] }),
    onSuccess: (saved) => queryClient.setQueryData(profileQueryKey, saved),
  });
  let defaultView: StudioView | null;
  if (launch.flowStep) defaultView = studioViewOf(launch.flowStep);
  else if (profile.isError) defaultView = 'studio-overview';
  else if (profile.isPending || launch.isPending) defaultView = null;
  else if (launch.nextIndex !== -1) defaultView = studioViewOf(launch.steps[launch.nextIndex].href.slice(1));
  else defaultView = 'studio-overview';

  const [view, setView] = useState<StudioView>('studio-overview');
  // Once the curator picks a view themselves, the default never overrides them.
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready || defaultView === null) return;
    if (!touched.current) setView(defaultView);
    setReady(true);
  }, [defaultView, ready]);

  const { mutate: createProfileNow } = createProfile;
  const open = useMemo(() => ({
    open: (sectionId: string) => {
      touched.current = true;
      setView(studioViewOf(sectionId));
      if (sectionId === 'studio-profile' && !queryClient.getQueryData(profileQueryKey)) createProfileNow();
    },
  }), [createProfileNow, queryClient]);

  return (
    <StudioStepsContext.Provider value={open}>
      <CoralGlow
        className="studio-surface min-h-full w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
        data-studio-steps-ready={ready ? 'true' : undefined}
      >
        <StudioHeader pro={launch.pro} />

        <Tabs value={view} onValueChange={(next) => open.open(next)} className="mt-6 gap-6">
          {/* Underline tabs across the top; content takes the full width below. */}
          <TabsList
            aria-label="Studio views"
            className="tab-scroll-fade -mx-4 flex h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-4 py-0 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
          >
            {views.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                data-testid={`${item.id}-trigger`}
                className="-mb-px h-10 flex-none gap-2 rounded-none border-0 border-b-2 border-transparent px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                <item.icon aria-hidden className="size-4 shrink-0" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-w-0">
            <TabsContent value="studio-overview" forceMount tabIndex={-1} className="space-y-6 data-[state=inactive]:hidden">
              {createProfile.isPending && (
                <output className="block text-sm text-muted-foreground">Creating your free profile…</output>
              )}
              {createProfile.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {getUserFacingApiErrorMessage(createProfile.error, 'Your free profile was not created. Try again.')}
                </p>
              )}
              {profile.isPending ? (
                <OverviewSkeleton />
              ) : profile.isError ? (
                <StudioSection id="studio-overview-error" eyebrow="Overview" title="Curator Studio" headingId="studio-overview-error-title">
                  <div className="space-y-4">
                    <p role="alert">Could not load your curator profile.</p>
                    <Button variant="outline" onClick={() => profile.refetch()}>Try again</Button>
                  </div>
                </StudioSection>
              ) : (
                <StudioOverview
                  profile={profile.data ?? null}
                  steps={launch.steps}
                  doneCount={launch.doneCount}
                  nextIndex={launch.nextIndex}
                  pro={launch.pro}
                />
              )}
            </TabsContent>
            <TabsContent value="studio-earnings" forceMount tabIndex={-1} className="data-[state=inactive]:hidden">
              {profile.data ? (
                <CuratorEarningsCard profile={profile.data} />
              ) : (
                <StudioSection
                  id="studio-earnings"
                  eyebrow="Performance"
                  title="Members & earnings"
                  headingId="curator-earnings-title"
                  description="Membership activity and payout history appear here once you have a curator profile."
                >
                  <Button variant="outline" onClick={() => open.open('studio-profile')}>
                    Create your free profile
                  </Button>
                </StudioSection>
              )}
            </TabsContent>
            <TabsContent value="studio-billing" forceMount tabIndex={-1} className="space-y-6 data-[state=inactive]:hidden">
              <CuratorProCard />
              <CuratorPayoutCard />
              <CuratorPayoutHistory enabled={launch.payoutStarted && Boolean(profile.data)} />
            </TabsContent>
          </div>
        </Tabs>
      </CoralGlow>
    </StudioStepsContext.Provider>
  );
}

/** Mirrors the Pro overview layout so the page does not reflow when data lands. */
function OverviewSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="card-quiet px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Skeleton className="h-72 w-full rounded-xl lg:col-span-2" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    </div>
  );
}

function StudioPageSkeleton() {
  return (
    <div className="w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
      <output className="sr-only">Loading Curator Studio…</output>
      <div aria-hidden>
        <Skeleton className="h-12 w-72" />
        <Skeleton className="mt-6 h-10 w-80" />
        <Skeleton className="mt-6 h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}

export default function CuratorStudioPage() {
  return (
    <RequireAuth>
      <Suspense fallback={<StudioPageSkeleton />}>
        <CuratorStudio />
      </Suspense>
    </RequireAuth>
  );
}
