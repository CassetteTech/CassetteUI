'use client';

/** Curator Studio: a dashboard with a view rail (Overview, Members, Payouts &
    billing). Every view stays mounted so section queries dedupe and Stripe
    return flows resolve whichever view is showing. Bridge creates the curator
    profile with the first plan draft or payout setup; it has no editable fields. */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CreditCard, HandCoins, LayoutDashboard } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPayoutHistory } from '@/components/features/curator/curator-payout-history';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import { OverviewSkeleton, StudioOverview, type LaunchStep } from '@/components/features/curator/studio-overview';
import {
  StudioSection,
  StudioStepsContext,
  studioViewOf,
  type StudioView,
} from '@/components/features/curator/studio-shell';
import { CopyButton } from '@/components/interior/copy-button';
import { CoralGlow } from '@/components/ui/coral-glow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabUnderline } from '@/components/ui/tab-underline';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthState } from '@/hooks/use-auth';
import { useSharedPositionHold } from '@/hooks/use-shared-position';
import {
  fetchCuratorPayoutAccount,
  fetchOwnCuratorProfile,
  type CuratorProfile,
} from '@/services/curator';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { profileService } from '@/services/profile';

const profileQueryKey = ['curator-profile', 'me'] as const;
// No server record says a page was shared, so this browser remembers the curator copying its link.
const pageLinkCopiedKey = (userId: string) => `cassette:studio-page-link-copied:${userId}`;

function readPageLinkCopied(userId: string) {
  try {
    return localStorage.getItem(pageLinkCopiedKey(userId)) === 'true';
  } catch {
    return false;
  }
}

/** The first launch step. The owner's own read counts every post they made, so one item finishes it.
    A failed first read says nothing about the page, so the step is left out until a retry answers. */
function useMusicStep(userId: string | null) {
  const music = useQuery({
    queryKey: ['curator-studio-music', userId],
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1 }),
    enabled: userId !== null,
    staleTime: 0,
  });
  const unknown = music.isError && music.data === undefined;
  const step: LaunchStep | null = unknown ? null : {
    href: '/add-music',
    label: 'Add your first music',
    notice: 'Your page has no music yet.',
    done: (music.data?.totalItems ?? 0) > 0,
  };
  return { step, isPending: music.isPending, retry: unknown ? () => void music.refetch() : null };
}

/** Whether this user copied their page link in this browser. Read on each render, so a change of
    signed-in user never carries another user's answer over; the state covers a visit without storage. */
function usePageLinkCopied(userId: string | null) {
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const copied = userId !== null && (copiedUserId === userId || readPageLinkCopied(userId));
  const markCopied = () => {
    if (!userId) return;
    setCopiedUserId(userId);
    try {
      localStorage.setItem(pageLinkCopiedKey(userId), 'true');
    } catch {
      // The step stays done for this visit.
    }
  };
  return [copied, markCopied] as const;
}

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
  const userId = user?.id ?? null;
  const music = useMusicStep(userId);
  const searchParams = useSearchParams();
  // Provider return flows land on their owning section. During a payout return,
  // the payout card owns the single refresh request.
  const flowStep = searchParams.has('payout')
    ? 'studio-payouts'
    : searchParams.has('pro') ? 'studio-pro' : null;
  const payoutFlowActive = flowStep === 'studio-payouts';
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
  const [pageLinkCopied, markPageLinkCopied] = usePageLinkCopied(userId);

  // Publishing needs a payout account Stripe has verified for transfers.
  const payoutStarted = payout.data != null;
  const payoutReady = payout.data?.transfersCapabilityStatus === 'active';
  const hasPlan = plans.data?.some((plan) => plan.status !== 'archived') === true;
  const hasActivePlan = plans.data?.some((plan) => plan.status === 'active') === true;
  const hasPublished = plans.data?.some((plan) => plan.status !== 'draft') === true;
  const planSteps: LaunchStep[] = [
    { href: '#studio-plan', label: 'Design your membership', notice: 'You have no membership plan.', done: hasPlan },
    { href: '#studio-payouts', label: 'Set up payouts', notice: 'Payout setup is not complete.', done: payoutReady },
    { href: '#studio-plan', label: 'Publish your plan', notice: 'No membership plan is live.', done: hasActivePlan },
  ];
  const musicSteps = music.step ? [music.step] : [];
  // Content first for a new curator: the page needs music before a paid plan has anything to offer.
  // After the first publish, payout recovery comes before content. Sharing comes last.
  const steps: LaunchStep[] = [
    ...(hasPublished ? [...planSteps, ...musicSteps] : [...musicSteps, ...planSteps]),
    // Done once the page link is copied in this browser; the notice does not claim the page was never shared.
    { href: '#studio-share', label: 'Share your page', notice: 'Copy your page link to share it with fans.', done: pageLinkCopied },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const nextIndex = steps.findIndex((step) => !step.done);
  const isPending = !payoutFlowActive && payout.isPending ||
    profile !== null && plans.isPending ||
    music.isPending;

  return {
    steps,
    doneCount,
    nextIndex,
    isPending,
    flowStep,
    // Earnings exist only for a curator who has published at least once. Unknown
    // (null) while the first plan read is in flight, so the overview holds its
    // skeleton instead of guessing at the launch checklist.
    hasPublished: profile !== null && plans.isPending ? null : hasPublished,
    payoutStarted,
    payoutReady,
    markPageLinkCopied,
    // Set only while the first music read has failed; cached music survives a failed refresh.
    retryMusic: music.retry,
    // False while a step input has no answer yet (pending, or failed with nothing cached),
    // so an unknown payout state never reads as an open step.
    stepsKnown: payout.data !== undefined && (profile === null || plans.data !== undefined),
  };
}

const todayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StudioHeader({ onPageLinkCopied }: { onPageLinkCopied: () => void }) {
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
        {username && <p className="mt-2.5 truncate font-mono text-xs text-muted-foreground">@{username}</p>}
      </div>
      {publicPath && (
        /* The Share your page step lands here; focusable so the step can move focus to it. */
        <div
          id="studio-share"
          tabIndex={-1}
          className="flex scroll-mt-24 flex-wrap items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <CopyButton
            label="Copy page link"
            copiedLabel="Link copied"
            value={() => `${window.location.origin}${publicPath}`}
            onCopied={onPageLinkCopied}
          />
          <Button asChild variant="outline" size="sm">
            <Link href={publicPath}>
              View public page
              <ArrowUpRight aria-hidden />
            </Link>
          </Button>
        </div>
      )}
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
  // A visit that starts from a payout return keeps setup first, so its notice and next step stay put when payouts turn active.
  const [payoutReturn] = useState(launch.flowStep === 'studio-payouts');
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
  const [passSlot, setPassSlot] = useState<HTMLElement | null>(null);
  // The plan card, and with it the rail pass, mounts after this read; the pass leaving the
  // previous page waits in the rail for it.
  useSharedPositionHold('membership-pass', profile.isPending, passSlot);
  useEffect(() => {
    if (ready || defaultView === null) return;
    if (!touched.current) setView(defaultView);
    setReady(true);
  }, [defaultView, ready]);

  const open = useMemo(() => ({
    open: (sectionId: string) => {
      touched.current = true;
      setView(studioViewOf(sectionId));
      // One frame lets a newly shown view lay out before its section scrolls into view.
      requestAnimationFrame(() => {
        const section = document.getElementById(sectionId);
        if (!section) return;
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        section.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
        // A collapsible that is animating closed is still in the DOM; its fields are about to go.
        const field = section.querySelector<HTMLElement>(':is(input, textarea, select):not([data-state="closed"] *)');
        (field ?? section).focus({ preventScroll: true });
      });
    },
    passSlot,
  }), [passSlot]);
  // After a payout return, the notice offers whichever plan step comes next.
  const planStep = launch.stepsKnown
    ? launch.steps.find((step) => step.href === '#studio-plan' && !step.done)
    : undefined;
  const payoutSetup = <CuratorPayoutCard key="payout-setup" nextStep={planStep} />;
  const payoutHistory = <CuratorPayoutHistory key="payout-history" enabled={launch.payoutStarted && Boolean(profile.data)} />;

  return (
    <StudioStepsContext.Provider value={open}>
      <CoralGlow
        afterglow
        className="studio-surface min-h-full w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10"
        data-studio-steps-ready={ready ? 'true' : undefined}
      >
        <StudioHeader onPageLinkCopied={launch.markPageLinkCopied} />

        {/* A tab only switches the view; focus stays on the tab for arrow-key navigation. */}
        <Tabs
          value={view}
          onValueChange={(next) => {
            touched.current = true;
            setView(studioViewOf(next));
          }}
          className="mt-6 gap-6"
        >
            {/* Underline tabs across the top; content takes the full width below. */}
            <TabsList
              aria-label="Studio views"
              className="tab-scroll-fade relative -mx-4 flex h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none border-b border-border bg-transparent px-4 py-0 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
            >
              <TabUnderline value={view} />
              {views.map((item) => (
                <TabsTrigger
                  key={item.id}
                  value={item.id}
                  data-testid={`${item.id}-trigger`}
                  className="h-10 flex-none gap-2 rounded-none border-0 px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:shadow-none dark:data-[state=active]:bg-transparent"
                >
                  {/* Icons drop out on phones so all three views fit without scrolling. */}
                  <item.icon aria-hidden className="hidden size-4 shrink-0 sm:block" />
                  <span className="tab-label" data-label={item.label}>{item.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

          {/* Below the tabs line, the membership pass takes the same right rail as on the public page and stays put across views. */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <div className="min-w-0">
              <TabsContent value="studio-overview" forceMount tabIndex={-1} className="space-y-6 data-[state=inactive]:hidden">
                {profile.isPending ? (
                  <OverviewSkeleton />
                ) : profile.data === undefined ? (
                  /* Only a first read that failed replaces the overview; a failed background refresh keeps
                     the overview and plan card mounted with the last answer, so a draft in progress survives. */
                  <StudioSection id="studio-overview-error" title="Curator Studio" headingId="studio-overview-error-title">
                    <div className="space-y-4">
                      <p role="alert">Could not load your curator profile.</p>
                      <Button variant="outline" onClick={() => profile.refetch()}>Try again</Button>
                    </div>
                  </StudioSection>
                ) : (
                  <>
                    {/* "No profile" can go stale once a first draft creates one; if that read then fails,
                        say so here rather than show an empty Studio. */}
                    {profile.isError && profile.data === null && (
                      <div className="flex flex-wrap items-center gap-3">
                        <p role="alert" className="text-sm text-destructive">Could not load your curator profile.</p>
                        <Button variant="outline" size="sm" onClick={() => profile.refetch()}>Try again</Button>
                      </div>
                    )}
                    {launch.retryMusic && (
                      <div className="flex flex-wrap items-center gap-3">
                        <p role="alert" className="text-sm text-destructive">Could not check the music on your page.</p>
                        <Button variant="outline" size="sm" onClick={launch.retryMusic}>Try again</Button>
                      </div>
                    )}
                    <StudioOverview
                      profile={profile.data ?? null}
                      steps={launch.steps}
                      doneCount={launch.doneCount}
                      nextIndex={launch.nextIndex}
                      hasPublished={launch.hasPublished}
                      stepsKnown={launch.stepsKnown}
                    />
                  </>
                )}
              </TabsContent>
              <TabsContent value="studio-earnings" forceMount tabIndex={-1} className="data-[state=inactive]:hidden">
                {profile.data ? (
                  <CuratorEarningsCard profile={profile.data} />
                ) : (
                  <StudioSection
                    id="studio-earnings"
                    title="Members"
                    headingId="curator-earnings-title"
                    description="Members and their payments show up here once you publish a plan."
                  >
                    <Button variant="outline" onClick={() => open.open('studio-plan')}>
                      Design your membership
                    </Button>
                  </StudioSection>
                )}
              </TabsContent>
              <TabsContent value="studio-billing" forceMount tabIndex={-1} className="space-y-6 data-[state=inactive]:hidden">
                {/* Setup leads until payouts are active; then balances lead and setup is one line.
                    The keys move both cards without remounting, so a provider return survives the swap. */}
                {launch.payoutReady && !payoutReturn ? [payoutHistory, payoutSetup] : [payoutSetup, payoutHistory]}
                <CuratorProCard />
              </TabsContent>
            </div>
            {/* The pass arrives by portal. On wide screens the empty slot keeps its box, so a pass held
                over from the previous page can wait on the spot the plan pass will fill. */}
            <aside
              ref={setPassSlot}
              aria-label="Membership plan"
              className="max-lg:empty:hidden lg:sticky lg:top-6"
            />
          </div>
        </Tabs>
      </CoralGlow>
    </StudioStepsContext.Provider>
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
