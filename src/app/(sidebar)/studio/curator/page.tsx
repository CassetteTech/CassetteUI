'use client';

/** Curator Studio: a dashboard with a view rail (Overview, Profile, Membership
    plan, Members & earnings, Billing & payouts). Every view stays mounted so
    section queries dedupe and Stripe return flows resolve whichever view is
    showing. Before launch the page opens on the next checklist step; after
    launch it opens on the overview. */

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  Ticket,
  UserRound,
} from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import { StudioOverview, type LaunchStep } from '@/components/features/curator/studio-overview';
import {
  StudioChip,
  StudioNotice,
  StudioSection,
  StudioStepsContext,
  studioViewOf,
  type StudioChipTone,
  type StudioView,
} from '@/components/features/curator/studio-shell';
import { CopyButton } from '@/components/interior/copy-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useAuthState } from '@/hooks/use-auth';
import { apiService } from '@/services/api';
import {
  createCuratorProfile,
  fetchCuratorPayoutAccount,
  fetchOwnCuratorProfile,
  updateCuratorProfile,
  type CuratorProfile,
  type CuratorProfileRequest,
} from '@/services/curator';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { cn } from '@/lib/utils';

const profileQueryKey = ['curator-profile', 'me'] as const;

const views: ReadonlyArray<{ id: StudioView; label: string; icon: typeof LayoutDashboard }> = [
  { id: 'studio-overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'studio-profile', label: 'Profile', icon: UserRound },
  { id: 'studio-plan', label: 'Membership plan', icon: Ticket },
  { id: 'studio-earnings', label: 'Members & earnings', icon: HandCoins },
  { id: 'studio-billing', label: 'Billing & payouts', icon: CreditCard },
];

function formText(data: FormData, name: string): string {
  // SAFETY: every requested name belongs to a text input in this form.
  return ((data.get(name) as string | null) ?? '').trim();
}

function commaSeparated(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

const profileChipTone = {
  active: 'positive',
  suspended: 'danger',
  retired: 'warning',
} satisfies Record<CuratorProfile['status'], StudioChipTone>;

function CuratorProfileForm({ profile }: { profile: CuratorProfile | null }) {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: (request: CuratorProfileRequest) => profile
      ? updateCuratorProfile(request)
      : createCuratorProfile(request),
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(profileQueryKey, savedProfile);
      setNotice(profile ? 'Curator profile updated.' : 'Curator profile created.');
    },
  });

  return (
    <StudioSection
      id="studio-profile"
      eyebrow="Identity"
      title="Your free curator profile"
      headingId="curator-profile-title"
      description="Curator Pro is not required to create, edit, or keep this profile."
      chip={
        <StudioChip tone={profile ? profileChipTone[profile.status] : 'neutral'} className={cn(profile && 'capitalize')}>
          {profile?.status ?? 'Not created'}
        </StudioChip>
      }
    >
      {profile?.suspensionReason && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>
            This curator profile is suspended: {profile.suspensionReason}
          </AlertDescription>
        </Alert>
      )}

      <StudioNotice testId="curator-profile-notice" className="mb-6">{notice}</StudioNotice>

      <form
        className="max-w-2xl space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          setNotice(null);
          const data = new FormData(event.currentTarget);
          mutation.mutate({
            headline: formText(data, 'headline') || null,
            about: formText(data, 'about') || null,
            declaredGenres: commaSeparated(formText(data, 'genres')),
            declaredPlatforms: commaSeparated(formText(data, 'platforms')),
          });
        }}
      >
        <div className="space-y-2">
          <Label htmlFor="curator-headline">Headline</Label>
          <Input
            id="curator-headline"
            name="headline"
            maxLength={2000}
            defaultValue={profile?.headline ?? ''}
            placeholder="Independent curator sharing late-night electronic finds"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="curator-about">About</Label>
          <Textarea
            id="curator-about"
            name="about"
            maxLength={2000}
            defaultValue={profile?.about ?? ''}
            placeholder="Tell listeners what you curate and why."
            className="min-h-28"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="curator-genres">Genres</Label>
            <Input
              id="curator-genres"
              name="genres"
              maxLength={2000}
              defaultValue={profile?.declaredGenres.join(', ') ?? ''}
              placeholder="Electronic, ambient, jazz"
              aria-describedby="curator-genres-help"
            />
            <p id="curator-genres-help" className="text-xs text-muted-foreground">Separate entries with commas.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="curator-platforms">Platforms</Label>
            <Input
              id="curator-platforms"
              name="platforms"
              maxLength={2000}
              defaultValue={profile?.declaredPlatforms.join(', ') ?? ''}
              placeholder="Spotify, Apple Music, SoundCloud"
              aria-describedby="curator-platforms-help"
            />
            <p id="curator-platforms-help" className="text-xs text-muted-foreground">Separate entries with commas.</p>
          </div>
        </div>

        {mutation.isError && (
          <p role="alert" className="text-sm text-destructive">
            {getUserFacingApiErrorMessage(mutation.error, 'Your changes were not saved. Check the fields and try again.')}
          </p>
        )}

        <Button type="submit" size="lg" disabled={mutation.isPending}>
          {mutation.isPending
            ? 'Saving…'
            : profile ? 'Save changes' : 'Create curator profile'}
        </Button>
      </form>
    </StudioSection>
  );
}

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
    payout: payoutFlowActive ? undefined : payout.data,
    plans: profile ? plans.data : [],
  };
}

type LaunchState = ReturnType<typeof useLaunchSteps>;

function StudioHeader({ launch, onOpen }: { launch: LaunchState; onOpen: (sectionId: string) => void }) {
  const { user } = useAuthState();
  const { steps, doneCount, nextIndex, pro } = launch;
  const next = steps[nextIndex] ?? null;
  const username = user?.username ?? null;
  const publicPath = username ? `/profile/${encodeURIComponent(username)}` : null;

  return (
    <header>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
            Curator Studio
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
            {pro && (
              <StudioChip tone={pro.hasAccess ? (pro.cancelAtPeriodEnd ? 'warning' : 'positive') : 'neutral'}>
                {pro.hasAccess ? 'Curator Pro' : 'Free profile'}
              </StudioChip>
            )}
            {username && <span className="truncate">@{username}</span>}
          </div>
        </div>
        {publicPath && (
          <div className="flex flex-wrap gap-2">
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
          </div>
        )}
      </div>

      {/* Compact launch progress rides along on every view until setup is complete. */}
      {next && (
        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 rounded-xl border border-border bg-card px-4 py-3 elev-soft">
          <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
            <Progress
              value={(doneCount / steps.length) * 100}
              aria-label={`Launch progress: ${doneCount} of ${steps.length} steps complete`}
              className="h-1.5 flex-1"
            />
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{doneCount}/{steps.length}</span>
          </div>
          <Button size="sm" className="w-full sm:w-auto" onClick={() => onOpen(next.href.slice(1))}>
            Next: {next.label}
            <ArrowRight aria-hidden />
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
  let defaultView: StudioView | null;
  if (launch.flowStep) defaultView = studioViewOf(launch.flowStep);
  else if (profile.isError || !profile.isPending && !profile.data) defaultView = 'studio-profile';
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

  const open = useMemo(() => ({
    open: (sectionId: string) => {
      touched.current = true;
      setView(studioViewOf(sectionId));
    },
  }), []);

  const profileSection = profile.isPending ? (
    <ProfileSectionSkeleton />
  ) : profile.isError ? (
    <StudioSection
      id="studio-profile"
      eyebrow="Identity"
      title="Your free curator profile"
      headingId="curator-profile-title"
    >
      <div className="space-y-4">
        <p role="alert">Could not load your curator profile.</p>
        <Button variant="outline" onClick={() => profile.refetch()}>Try again</Button>
      </div>
    </StudioSection>
  ) : (
    <CuratorProfileForm key={profile.data?.id ?? 'new'} profile={profile.data} />
  );

  return (
    <StudioStepsContext.Provider value={open}>
      <div
        className="studio-surface mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10"
        data-studio-steps-ready={ready ? 'true' : undefined}
      >
        <StudioHeader launch={launch} onOpen={open.open} />

        <Tabs
          value={view}
          onValueChange={(next) => open.open(next)}
          orientation="vertical"
          className="mt-8 gap-6 lg:flex-row lg:items-start"
        >
          {/* Rail: horizontal scroller on small screens, vertical list on desktop. */}
          <TabsList
            aria-label="Studio views"
            className="tab-scroll-fade -mx-4 flex h-auto w-auto justify-start gap-1 overflow-x-auto rounded-none bg-transparent px-4 py-0 sm:-mx-6 sm:px-6 lg:[mask-image:none] lg:sticky lg:top-6 lg:mx-0 lg:w-56 lg:shrink-0 lg:flex-col lg:items-stretch lg:border-r lg:border-border lg:px-0 lg:pr-4"
          >
            {views.map((item) => (
              <TabsTrigger
                key={item.id}
                value={item.id}
                data-testid={`${item.id}-trigger`}
                className="h-9 flex-none justify-start gap-2.5 rounded-lg border-0 px-3 text-sm font-normal text-muted-foreground shadow-none transition-colors hover:text-foreground data-[state=active]:bg-card data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=active]:elev-soft lg:w-full"
              >
                <item.icon aria-hidden className="size-4 shrink-0 data-[state=active]:text-primary" />
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="min-w-0 flex-1">
            <TabsContent value="studio-overview" forceMount className="data-[state=inactive]:hidden">
              {profile.isPending ? (
                <OverviewSkeleton />
              ) : (
                <StudioOverview
                  profile={profile.data ?? null}
                  steps={launch.steps}
                  doneCount={launch.doneCount}
                  nextIndex={launch.nextIndex}
                  pro={launch.pro}
                  payout={launch.payout}
                  plans={launch.plans}
                />
              )}
            </TabsContent>
            <TabsContent value="studio-profile" forceMount className="data-[state=inactive]:hidden">
              {profileSection}
            </TabsContent>
            {/* Always mounted so every checklist anchor resolves, even before a profile exists. */}
            <TabsContent value="studio-plan" forceMount className="data-[state=inactive]:hidden">
              <CuratorPlanCard profile={profile.data ?? null} />
            </TabsContent>
            <TabsContent value="studio-earnings" forceMount className="data-[state=inactive]:hidden">
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
            <TabsContent value="studio-billing" forceMount className="space-y-6 data-[state=inactive]:hidden">
              <CuratorProCard />
              <CuratorPayoutCard />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </StudioStepsContext.Provider>
  );
}

function ProfileSectionSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border border-border bg-card p-6 elev-soft">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-3 h-6 w-64" />
      <div className="mt-8 space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-9 w-1/2" />
      </div>
    </div>
  );
}

/** Mirrors the Pro overview layout so the page does not reflow when data lands. */
function OverviewSkeleton() {
  return (
    <div aria-hidden className="space-y-6">
      <div className="flex flex-wrap divide-y divide-border rounded-xl border border-border bg-card elev-soft sm:divide-x sm:divide-y-0">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="min-w-0 flex-1 basis-40 px-4 py-3.5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}

function StudioPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <output className="sr-only">Loading Curator Studio…</output>
      <div aria-hidden>
        <Skeleton className="h-12 w-72" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
          <div className="space-y-2">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
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
