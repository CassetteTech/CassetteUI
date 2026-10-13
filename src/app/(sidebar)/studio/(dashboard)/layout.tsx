'use client';

/** Curator Studio, shared by every dashboard URL: the header, the section links,
    and the right rail. The Overview, Membership, and Payouts & billing views live
    here and stay mounted, hidden while another URL is open, so section queries
    dedupe, a plan draft survives a section change, and Stripe return flows
    resolve on whichever view shows. Other sections, such as Music, are ordinary
    pages and render as `children`. Bridge creates the curator profile with the
    first plan draft or payout setup; it has no editable fields. */

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Plus } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPayoutHistory } from '@/components/features/curator/curator-payout-history';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import { StudioMembership } from '@/components/features/curator/studio-membership';
import { OverviewSkeleton, StudioOverview } from '@/components/features/curator/studio-overview';
import { StudioStepsContext, type LaunchStep } from '@/components/features/curator/studio-shell';
import { ProfileIdentityPass } from '@/components/features/profile/profile-identity-pass';
import {
  addMusicHref,
  studioLabels,
  studioPaths,
  studioViewOf,
  studioViewOfPath,
  studioViews,
  type StudioView,
} from '@/components/features/curator/studio-routes';
import { CopyButton } from '@/components/interior/copy-button';
import { CoralGlow } from '@/components/ui/coral-glow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabUnderline } from '@/components/ui/tab-underline';
import { useAuthState } from '@/hooks/use-auth';
import { useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
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

/** The music step. The owner's own read counts every post they made, so one item finishes it.
    A failed first read says nothing about the page, so the step is left out until a retry answers.
    Under the activity key, so adding or deleting a post anywhere refreshes the step. */
function useMusicStep(userId: string | null) {
  const music = useQuery({
    queryKey: ['user-activity', userId, 'studio-has-music'],
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1 }),
    enabled: userId !== null,
    staleTime: 0,
  });
  const unknown = music.isError && music.data === undefined;
  const step: LaunchStep | null = unknown ? null : {
    href: addMusicHref(studioPaths['studio-overview']),
    label: 'Add your first music',
    notice: 'Your page has no music yet.',
    done: (music.data?.totalItems ?? 0) > 0,
  };
  return { step, retry: unknown ? () => void music.refetch() : null };
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

/** Setup state shared by the Overview, the Membership view, the payout card, and the rail. Reads
    the same query keys the section cards use, so React Query dedupes the requests and every
    surface stays in sync. */
function useLaunchSteps(profile: CuratorProfile | null) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const music = useMusicStep(userId);
  // During a payout provider return, the payout card owns the single refresh request.
  const payoutFlowActive = useSearchParams().has('payout');
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
  const setupSteps: LaunchStep[] = [
    { href: '#studio-plan', label: 'Design your membership', notice: 'You have no membership plan.', done: hasPlan },
    { href: '#studio-payouts', label: 'Set up payouts', notice: 'Payout setup is not complete.', done: payoutReady },
    { href: '#studio-plan', label: 'Publish your plan', notice: 'No membership plan is live.', done: hasActivePlan },
  ];
  // Done once the page link is copied in this browser; the notice does not claim the page was never shared.
  const shareStep: LaunchStep = {
    href: '#studio-share',
    label: 'Share your page',
    notice: 'Copy your page link to share it with fans.',
    done: pageLinkCopied,
  };
  // Without a profile there is no plan; with one, the answer waits for the plan read.
  const plansKnown = profile === null || plans.data !== undefined;

  return {
    setupSteps,
    musicStep: music.step,
    shareStep,
    setupStarted: hasPlan || payoutStarted,
    payoutFlowActive,
    // Earnings exist only for a curator who has published at least once. Unknown
    // (null) while the first plan read is in flight, so the overview holds its
    // skeleton instead of guessing at the next step.
    hasPublished: profile !== null && plans.isPending ? null : hasPublished,
    // Null until the plans are read, so the rail never shows a pass it would swap.
    hasActivePlan: plansKnown ? hasActivePlan : null,
    plansKnown,
    payoutStarted,
    payoutReady,
    markPageLinkCopied,
    // Set only while the first music read has failed; cached music survives a failed refresh.
    retryMusic: music.retry,
    // False while a step input has no answer yet (pending, or failed with nothing cached),
    // so an unknown payout state never reads as an open step.
    stepsKnown: payout.data !== undefined && plansKnown,
  };
}

/** The pass visitors see on the public page while no plan is live: the profile pass. The plan card
    portals the live plan's pass instead, and the plan preview on the Membership view. */
function StudioProfilePass({ slot, show }: { slot: HTMLElement | null; show: boolean }) {
  const { user } = useAuthState();
  const bio = useUserBio(show ? user?.username : undefined);
  // Until the bio read answers, the pass leaving the previous page waits in the rail for it.
  useSharedPositionHold('membership-pass', show && bio.isPending, slot);
  if (!show || !slot || !bio.data) return null;
  return createPortal(
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2.5 motion-safe:duration-450 motion-safe:ease-out-quart">
      <ProfileIdentityPass user={bio.data} />
    </div>,
    slot,
  );
}

const todayFormatter = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

function greeting(hour: number) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function StudioHeader({ onPageLinkCopied }: { onPageLinkCopied: () => void }) {
  const { user } = useAuthState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Music keeps its filters, so a post added from a tab returns to that tab. Other views keep
  // only their path; their queries belong to provider returns.
  const musicQuery = pathname === studioPaths['studio-music'] ? searchParams.toString() : '';
  const addMusicFrom = musicQuery ? `${pathname}?${musicQuery}` : pathname ?? studioPaths['studio-overview'];
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
      <div className="flex flex-wrap items-center gap-2">
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
        <Button asChild size="sm">
          <Link href={addMusicHref(addMusicFrom)}>
            <Plus aria-hidden />
            Add music
          </Link>
        </Button>
      </div>
    </header>
  );
}

/** Scrolls a section into view and focuses its first field, or the section itself. */
function revealSection(sectionId: string) {
  const section = document.getElementById(sectionId);
  if (!section) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  // A collapsible that is animating closed is still in the DOM; its fields are about to go.
  const field = section.querySelector<HTMLElement>(':is(input, textarea, select):not([data-state="closed"] *)');
  (field ?? section).focus({ preventScroll: true });
}

/** Underline links across the top; the active one carries the underline and aria-current. */
function StudioSectionLinks({ view }: { view: StudioView }) {
  return (
    <nav
      aria-label="Studio sections"
      className="tab-scroll-fade relative -mx-4 mt-6 flex gap-1 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <TabUnderline value={view} />
      {studioViews.map((id) => {
        const active = id === view;
        return (
          <Link
            key={id}
            href={studioPaths[id]}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            data-state={active ? 'active' : 'inactive'}
            data-testid={`${id}-trigger`}
            className={cn(
              'inline-flex h-10 flex-none items-center whitespace-nowrap px-3 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
              active && 'font-medium text-foreground',
            )}
          >
            <span className="tab-label" data-label={studioLabels[id]}>{studioLabels[id]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function StudioDashboard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const view = studioViewOfPath(pathname) ?? 'studio-overview';
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });
  const launch = useLaunchSteps(profile.data ?? null);
  // A visit that starts from a payout return keeps setup first, so its notice and next step stay put when payouts turn active.
  const [payoutReturn] = useState(launch.payoutFlowActive);
  const [passSlot, setPassSlot] = useState<HTMLElement | null>(null);
  // The plan card, and with it the rail pass, mounts after this read; the pass leaving the
  // previous page waits in the rail for it.
  useSharedPositionHold('membership-pass', profile.isPending, passSlot);

  // A section on another view waits until that view's URL is open, then scrolls and takes focus.
  const pendingSection = useRef<string | null>(null);
  useEffect(() => {
    const sectionId = pendingSection.current;
    if (sectionId === null || studioViewOf(sectionId) !== view) return;
    pendingSection.current = null;
    // One frame lets a newly shown view lay out before its section scrolls into view.
    requestAnimationFrame(() => revealSection(sectionId));
  }, [view]);

  const open = useMemo(() => ({
    open: (sectionId: string) => {
      const target = studioViewOf(sectionId);
      if (target === view) {
        requestAnimationFrame(() => revealSection(sectionId));
        return;
      }
      pendingSection.current = sectionId;
      router.push(studioPaths[target], { scroll: false });
    },
    passSlot,
  }), [passSlot, router, view]);
  // After a payout return, the notice offers whichever plan step comes next.
  const planStep = launch.stepsKnown
    ? launch.setupSteps.find((step) => step.href === '#studio-plan' && !step.done)
    : undefined;
  const payoutSetup = <CuratorPayoutCard key="payout-setup" nextStep={planStep} />;
  // One message for a profile read that failed, above every view. A first read that failed leaves
  // the Overview and Membership empty; a failed refresh keeps their last answer, so a draft in
  // progress survives. "No profile" can go stale once a first draft creates one, so a failed read
  // after it is said too.
  const profileLoaded = !profile.isPending && profile.data !== undefined;
  const profileError = !profile.isPending && (profile.data === undefined || (profile.isError && profile.data === null)) && (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <p role="alert" className="text-sm text-destructive">Could not load your curator profile.</p>
      <Button variant="outline" size="sm" onClick={() => profile.refetch()}>Try again</Button>
    </div>
  );
  const payoutHistory = <CuratorPayoutHistory key="payout-history" enabled={launch.payoutStarted && Boolean(profile.data)} />;

  return (
    <StudioStepsContext.Provider value={open}>
      <CoralGlow afterglow className="studio-surface min-h-full w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <StudioHeader onPageLinkCopied={launch.markPageLinkCopied} />
        <StudioSectionLinks view={view} />

        {/* Below the links, the membership pass takes the same right rail as on the public page and stays put across views. */}
        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0">
            {profileError}
            <div className={cn('space-y-6', view !== 'studio-overview' && 'hidden')}>
              {profile.isPending ? (
                <OverviewSkeleton />
              ) : profileLoaded && (
                <>
                  {launch.retryMusic && (
                    <div className="flex flex-wrap items-center gap-3">
                      <p role="alert" className="text-sm text-destructive">Could not check the music on your page.</p>
                      <Button variant="outline" size="sm" onClick={launch.retryMusic}>Try again</Button>
                    </div>
                  )}
                  <StudioOverview
                    active={view === 'studio-overview'}
                    profile={profile.data ?? null}
                    hasPublished={launch.hasPublished}
                    plansKnown={launch.plansKnown}
                    stepsKnown={launch.stepsKnown}
                    setupSteps={launch.setupSteps}
                    setupStarted={launch.setupStarted}
                    musicStep={launch.musicStep}
                    shareStep={launch.shareStep}
                  />
                </>
              )}
            </div>
            <div className={cn('space-y-6', view !== 'studio-membership' && 'hidden')}>
              {profile.isPending ? (
                <Skeleton aria-hidden className="h-80 w-full rounded-xl" />
              ) : profileLoaded && (
                <>
                  <StudioMembership
                    profile={profile.data ?? null}
                    setupSteps={launch.setupSteps}
                    hasPublished={launch.plansKnown ? launch.hasPublished : null}
                    preview={view === 'studio-membership'}
                  />
                </>
              )}
            </div>
            <div className={cn('space-y-6', view !== 'studio-billing' && 'hidden')}>
              {/* Setup leads until payouts are active; then balances lead and setup is one line.
                  The keys move both cards without remounting, so a provider return survives the swap. */}
              {launch.payoutReady && !payoutReturn ? [payoutHistory, payoutSetup] : [payoutSetup, payoutHistory]}
              <CuratorProCard />
            </div>
            {children}
          </div>
          {/* The pass arrives by portal. On wide screens the empty slot keeps its box, so a pass held
              over from the previous page can wait on the spot the next pass will fill. */}
          <aside
            ref={setPassSlot}
            aria-label={view === 'studio-membership' ? 'Membership plan' : 'Your public pass'}
            className="max-lg:empty:hidden lg:sticky lg:top-6"
          />
          <StudioProfilePass
            slot={passSlot}
            show={!profile.isPending && view !== 'studio-membership' && launch.hasActivePlan === false}
          />
        </div>
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

export default function CuratorStudioLayout({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <Suspense fallback={<StudioPageSkeleton />}>
        <StudioDashboard>{children}</StudioDashboard>
      </Suspense>
    </RequireAuth>
  );
}
