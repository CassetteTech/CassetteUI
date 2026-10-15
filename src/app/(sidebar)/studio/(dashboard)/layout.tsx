'use client';

import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
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
import { StudioAudience } from '@/components/features/curator/studio-audience';
import { StudioNextStep } from '@/components/features/curator/studio-next-step';
import { MembershipInvitation, StudioStepsContext, type LaunchStep } from '@/components/features/curator/studio-shell';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CoralGlow } from '@/components/ui/coral-glow';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { TabUnderline } from '@/components/ui/tab-underline';
import { useAuthState } from '@/hooks/use-auth';
import { profileQueryKeys, useUserBio } from '@/hooks/use-profile';
import { cn } from '@/lib/utils';
import { useSharedPositionHold } from '@/hooks/use-shared-position';
import {
  fetchOwnCuratorProfile,
  type CuratorProfile,
} from '@/services/curator';
import { useCuratorPlans, usePayoutAccount } from '@/hooks/use-curator';
import { profileService } from '@/services/profile';
import { tryStorage } from '@/lib/best-effort';

const profileQueryKey = ['curator-profile', 'me'] as const;
const pageLinkCopiedKey = (userId: string) => `cassette:studio-page-link-copied:${userId}`;

function readPageLinkCopied(userId: string) {
  try {
    return localStorage.getItem(pageLinkCopiedKey(userId)) === 'true';
  } catch {
    return false;
  }
}

function useMusicStep(userId: string | null) {
  const music = useQuery({
    queryKey: profileQueryKeys.studioActivity(userId, 'studio-has-music'),
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1 }),
    enabled: userId !== null,
    staleTime: 0,
  });
  const unknown = music.isError && music.data === undefined;
  const step: LaunchStep | null = unknown ? null : {
    href: addMusicHref(studioPaths['studio-music']),
    label: 'Add your first music',
    notice: 'Your page has no music yet.',
    done: (music.data?.totalItems ?? 0) > 0,
  };
  return { step, retry: unknown ? () => void music.refetch() : null };
}

function usePageLinkCopied(userId: string | null) {
  const [copiedUserId, setCopiedUserId] = useState<string | null>(null);
  const copied = userId !== null && (copiedUserId === userId || readPageLinkCopied(userId));
  const markCopied = () => {
    if (!userId) return;
    setCopiedUserId(userId);
    tryStorage(() => localStorage.setItem(pageLinkCopiedKey(userId), 'true'), undefined);
  };
  return [copied, markCopied] as const;
}

function useLaunchSteps(profile: CuratorProfile | null) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const music = useMusicStep(userId);
  const { account: payout, payoutReturn: payoutFlowActive } = usePayoutAccount();
  const plans = useCuratorPlans(profile?.id ?? null);
  const [pageLinkCopied, markPageLinkCopied] = usePageLinkCopied(userId);

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
    // (null) while the first plan read is in flight, so no view guesses at it.
    hasPublished: profile !== null && plans.isPending ? null : hasPublished,
    // Null until the plans are read, so the rail never shows a pass it would swap.
    hasActivePlan: plansKnown ? hasActivePlan : null,
    plansKnown,
    payoutStarted,
    payoutReady,
    markPageLinkCopied,
    retryMusic: music.retry,
    // False while a step input has no answer yet (pending, or failed with nothing cached),
    // so an unknown payout state never reads as an open step.
    stepsKnown: payout.data !== undefined && plansKnown,
  };
}

function StudioProfilePass({ slot, show, offersMembershipSetup }: {
  slot: HTMLElement | null;
  show: boolean;
  offersMembershipSetup: boolean;
}) {
  const { user } = useAuthState();
  const bio = useUserBio(show ? user?.username : undefined);
  useSharedPositionHold('membership-pass', show && bio.isPending, slot);
  if (!show || !slot || !bio.data) return null;
  return createPortal(
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2.5 motion-safe:duration-450 motion-safe:ease-out-quart">
      <ProfileIdentityPass user={bio.data} offersMembershipSetup={offersMembershipSetup} />
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

const wideQuery = '(min-width: 1024px)';
function subscribeToWide(onChange: () => void) {
  const query = window.matchMedia(wideQuery);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

function useWideLayout() {
  return useSyncExternalStore(subscribeToWide, () => window.matchMedia(wideQuery).matches, () => false);
}

function StudioShareLinks({ onPageLinkCopied, className }: { onPageLinkCopied: () => void; className?: string }) {
  const { user } = useAuthState();
  const username = user?.username ?? null;
  if (!username) return null;
  const publicPath = `/profile/${encodeURIComponent(username)}`;
  return (
    <div
      id="studio-share"
      tabIndex={-1}
      className={cn(
        'flex scroll-mt-24 flex-wrap items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
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
      <Button asChild variant="ghost" size="sm">
        <Link href={`${publicPath}/edit`}>Edit profile</Link>
      </Button>
    </div>
  );
}

function StudioRailShareLinks({ onPageLinkCopied }: { onPageLinkCopied: () => void }) {
  const sentinel = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => setStuck(entry.boundingClientRect.top < 0));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <>
      <div ref={sentinel} aria-hidden className="absolute -top-6 h-px w-full" />
      <div className={cn('sticky top-0 z-10 -mt-6 pt-6 pb-3 transition-colors', stuck && 'bg-background')}>
        <StudioShareLinks onPageLinkCopied={onPageLinkCopied} />
      </div>
    </>
  );
}

function StudioHeader({ onPageLinkCopied, share }: { onPageLinkCopied: () => void; share: boolean }) {
  const { user } = useAuthState();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const musicQuery = pathname === studioPaths['studio-music'] ? searchParams.toString() : '';
  const addMusicFrom = musicQuery ? `${pathname}?${musicQuery}` : pathname ?? studioPaths['studio-music'];
  const username = user?.username ?? null;
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
        {share && <StudioShareLinks onPageLinkCopied={onPageLinkCopied} />}
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

function revealSection(sectionId: string) {
  const section = document.getElementById(sectionId) ?? document.getElementById('studio-profile-error');
  if (!section) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  section.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  // A collapsible that is animating closed is still in the DOM; its fields are about to go.
  const field = section.querySelector<HTMLElement>(':is(input, textarea, select):not([data-state="closed"] *)');
  (field ?? section).focus({ preventScroll: true });
}

/** Underline links across the top; the active one carries the underline and aria-current. They
    are controls, so they start no browser link drag (a click that moves a few pixels still opens
    the view) and a drag across them selects no text. */
function StudioSectionLinks({ view }: { view: StudioView }) {
  return (
    <nav
      aria-label="Studio sections"
      className="tab-scroll-fade relative -mx-4 mt-6 flex select-none gap-1 overflow-x-auto border-b border-border px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
    >
      <TabUnderline value={view} />
      {studioViews.map((id) => {
        const active = id === view;
        return (
          <Link
            key={id}
            href={studioPaths[id]}
            scroll={false}
            draggable={false}
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
  const view = studioViewOfPath(pathname) ?? 'studio-music';
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });
  const launch = useLaunchSteps(profile.data ?? null);
  const [payoutReturn] = useState(launch.payoutFlowActive);
  const [passSlot, setPassSlot] = useState<HTMLElement | null>(null);
  const [railEntered, setRailEntered] = useState(false);
  useSharedPositionHold('membership-pass', profile.isPending, passSlot);
  const wide = useWideLayout();

  const pendingSection = useRef<string | null>(null);
  const shownView = useRef(view);
  useEffect(() => {
    const viewChanged = shownView.current !== view;
    shownView.current = view;
    const sectionId = pendingSection.current;
    if (sectionId === null) return;
    if (studioViewOf(sectionId) !== view) {
      if (viewChanged) pendingSection.current = null;
      return;
    }
    if (profile.isPending && !document.getElementById(sectionId)) return;
    pendingSection.current = null;
    requestAnimationFrame(() => revealSection(sectionId));
  }, [view, profile.isPending]);

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
  const planStep = launch.stepsKnown
    ? launch.setupSteps.find((step) => step.href === '#studio-plan' && !step.done)
    : undefined;
  const payoutSetup = <CuratorPayoutCard key="payout-setup" nextStep={planStep} />;
  const profileLoaded = !profile.isPending && profile.data !== undefined;
  const profileError = !profile.isPending && (profile.data === undefined || (profile.isError && profile.data === null)) && (
    <div
      id="studio-profile-error"
      tabIndex={-1}
      className="mb-6 flex scroll-mt-24 flex-wrap items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <p role="alert" className="text-sm text-destructive">Could not load your curator profile.</p>
      <Button variant="outline" size="sm" onClick={() => profile.refetch()}>Try again</Button>
    </div>
  );
  const payoutHistory = <CuratorPayoutHistory key="payout-history" enabled={launch.payoutStarted && Boolean(profile.data)} />;
  const openMembers = () => open.open(
    launch.hasPublished ? 'studio-members' : launch.plansKnown ? 'studio-setup' : 'studio-plan',
  );

  return (
    <StudioStepsContext.Provider value={open}>
      <CoralGlow afterglow className="min-h-full w-full px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <StudioHeader onPageLinkCopied={launch.markPageLinkCopied} share={!wide} />
        {/* Waits for the profile read too: until it answers, no plan reads as no publish. */}
        <MembershipInvitation
          show={profileLoaded && launch.stepsKnown && launch.hasPublished === false}
          setupSteps={launch.setupSteps}
          setupStarted={launch.setupStarted}
          hasMusic={launch.musicStep?.done === true}
          view={view}
        />
        <StudioSectionLinks view={view} />

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
          <div className="min-w-0">
            {profileError}
            {profile.data?.suspensionReason && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>This curator profile is suspended: {profile.data.suspensionReason}</AlertDescription>
              </Alert>
            )}
            {launch.retryMusic && (
              <div className="mb-6 flex flex-wrap items-center gap-3">
                <p role="alert" className="text-sm text-destructive">Could not check the music on your page.</p>
                <Button variant="outline" size="sm" onClick={launch.retryMusic}>Try again</Button>
              </div>
            )}
            {profile.data && (
              <div className="mb-6 lg:hidden">
                <StudioAudience onOpenMembers={openMembers} />
              </div>
            )}
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
              {launch.payoutReady && !payoutReturn ? [payoutHistory, payoutSetup] : [payoutSetup, payoutHistory]}
              <CuratorProCard />
            </div>
            {view === 'studio-music' && launch.hasPublished === true && (
              <div className="mb-6 empty:hidden">
                <StudioNextStep
                  stepsKnown={launch.stepsKnown}
                  setupSteps={launch.setupSteps}
                  musicStep={launch.musicStep}
                  shareStep={launch.shareStep}
                />
              </div>
            )}
            {children}
          </div>
          <div className="max-lg:contents lg:relative lg:flex lg:flex-col lg:gap-6 lg:self-stretch">
            {wide && <StudioRailShareLinks onPageLinkCopied={launch.markPageLinkCopied} />}
            <div className="max-lg:contents lg:sticky lg:flex lg:flex-col lg:gap-6">
              <aside
                ref={setPassSlot}
                aria-label={view === 'studio-membership' ? 'Membership plan' : 'Your public pass'}
                className="peer max-lg:empty:hidden"
              />
              {profile.data && (
                <div
                  className={cn(
                    'max-lg:hidden peer-data-[shared-pending]:hidden',
                    !railEntered && 'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2.5 motion-safe:duration-450 motion-safe:ease-out-quart',
                  )}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget) setRailEntered(true);
                  }}
                >
                  <StudioAudience onOpenMembers={openMembers} />
                </div>
              )}
            </div>
          </div>
          {/* After a failed profile read the plan is unknown, so no pass shows rather than a wrong one. */}
          <StudioProfilePass
            slot={passSlot}
            show={profileLoaded && view !== 'studio-membership' && launch.hasActivePlan === false}
            offersMembershipSetup={launch.musicStep?.done === true}
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
