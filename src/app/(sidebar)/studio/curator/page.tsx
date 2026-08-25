'use client';

/** Curator Studio: flat, divider-based sections in two modes. Setup mode fronts
    a numbered "Set up" stepper of only the unfinished steps (finished ones move
    to "Manage" with full functionality); once everything is complete the page
    becomes a dashboard ordered by role, with billing settings grouped last. */

import { Fragment, Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import {
  StudioChip,
  StudioNotice,
  StudioSection,
  StudioStepsContext,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
import { fetchCuratorEarnings } from '@/services/curator-earnings';
import { fetchCuratorPlans } from '@/services/curator-plans';
import { formatPaidPromotionMinorAmount } from '@/services/paid-promotion-lifecycle';
import { getUserFacingApiErrorMessage } from '@/utils/user-facing-api-error';
import { cn } from '@/lib/utils';

const profileQueryKey = ['curator-profile', 'me'] as const;
const memberCountFormatter = new Intl.NumberFormat('en-US');

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
        className="space-y-6"
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

/** Launch-checklist state shared by the desktop rail and the mobile summary.
    Reads the same query keys the section cards use, so React Query dedupes
    the requests and both surfaces stay in sync. */
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

  // Payouts count as done only once transfers are actually active; a started but
  // unfinished account renders as the in-progress "Finish payout setup" step.
  const payoutsActive = payout.data?.transfersCapabilityStatus === 'active';
  const steps = [
    { href: '#studio-profile', label: 'Create your free profile', done: profile?.status === 'active' },
    { href: '#studio-pro', label: 'Start Curator Pro', done: pro.data?.hasAccess === true },
    {
      href: '#studio-payouts',
      label: payout.data != null && !payoutsActive ? 'Finish payout setup' : 'Set up payouts',
      done: payoutsActive,
    },
    { href: '#studio-plan', label: 'Publish a membership plan', done: plans.data?.some((plan) => plan.status === 'active') === true },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  const nextIndex = steps.findIndex((step) => !step.done);
  const isPending = pro.isPending ||
    !payoutFlowActive && payout.isPending ||
    profile !== null && plans.isPending;

  return { steps, doneCount, nextIndex, isPending, flowStep };
}

type LaunchState = ReturnType<typeof useLaunchSteps>;

/** Patreon-style launch checklist card (desktop header rail, setup mode only). */
function LaunchRail({ launch }: { launch: LaunchState }) {
  const { steps, doneCount, nextIndex } = launch;
  const stepsAccordion = useContext(StudioStepsContext);

  return (
    <div className="rounded-none border border-section-dark-fg/15 bg-section-dark-fg/5 p-5 sm:p-6">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">Launch checklist</p>
        <p className="font-mono text-[10px] font-bold tabular-nums opacity-70" aria-hidden>
          {doneCount}/{steps.length}
        </p>
      </div>
      <Progress
        value={(doneCount / steps.length) * 100}
        aria-label={`Launch progress: ${doneCount} of ${steps.length} steps complete`}
        className="mt-3 h-1.5 bg-section-dark-fg/15"
      />
      <ol className="mt-5 space-y-3">
        {steps.map((step, index) => (
          <li key={step.href}>
            <a
              href={step.href}
              // Expand the matching accordion step before the anchor scrolls to it.
              onClick={() => stepsAccordion?.open(step.href.slice(1))}
              className="group flex items-center gap-3"
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-bold',
                  step.done
                    ? 'border-primary bg-primary text-primary-foreground'
                    : index === nextIndex
                      ? 'border-section-dark-fg/70'
                      : 'border-section-dark-fg/25 opacity-50',
                )}
              >
                {step.done ? <Check className="size-3.5" /> : index + 1}
              </span>
              <span
                className={cn(
                  'text-sm underline-offset-4 group-hover:underline',
                  !step.done && index !== nextIndex && 'opacity-60',
                )}
              >
                {step.label}
                {step.done && <span className="sr-only"> (complete)</span>}
              </span>
              {index === nextIndex && (
                <span className="ml-auto font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  Next
                </span>
              )}
            </a>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Compact mobile launch summary: a thin progress bar plus one next-step action.
    The step accordion below is the checklist itself on mobile, so the full
    checklist card stays desktop-only. */
function MobileLaunchSummary({ launch }: { launch: LaunchState }) {
  const { steps, doneCount, nextIndex } = launch;
  const stepsAccordion = useContext(StudioStepsContext);
  const next = steps[nextIndex] ?? null;

  // Dashboard mode: the compact hero shows just the stats row.
  if (nextIndex === -1) return null;

  return (
    <div className="mt-6 lg:hidden">
      <div className="flex items-center gap-3">
        <Progress
          value={(doneCount / steps.length) * 100}
          aria-label={`Launch progress: ${doneCount} of ${steps.length} steps complete`}
          className="h-1 flex-1 bg-section-dark-fg/15"
        />
        <p className="font-mono text-[10px] font-bold tabular-nums opacity-70" aria-hidden>
          {doneCount}/{steps.length}
        </p>
      </div>
      {next && (
        <Button asChild size="sm" className="mt-4 w-full rounded-full">
          {/* Expands the matching accordion step before the anchor scrolls to it. */}
          <a href={next.href} onClick={() => stepsAccordion?.open(next.href.slice(1))}>
            Next: {next.label}
          </a>
        </Button>
      )}
    </div>
  );
}

/** At-a-glance numbers in the header band. Shares the earnings and plans query
    keys with the sections below, so the requests are deduped. */
function HeaderStats({ profile }: { profile: CuratorProfile }) {
  const { user } = useAuthState();
  const earnings = useQuery({
    queryKey: ['curator-earnings', user?.id ?? null, 1, 10],
    queryFn: ({ signal }) => fetchCuratorEarnings(1, 10, signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const plans = useQuery({
    queryKey: ['curator-plans', profile.id],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    staleTime: 0,
  });
  const activePlan = plans.data?.find((plan) => plan.status === 'active') ?? null;

  return (
    <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-4 lg:mt-7 lg:gap-x-10">
      <div>
        <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
          Active members
        </dt>
        <dd className="mt-1 font-teko text-3xl font-bold leading-none tabular-nums lg:text-4xl">
          {earnings.data ? memberCountFormatter.format(earnings.data.activeMemberCount) : '—'}
        </dd>
      </div>
      <div>
        <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
          Live plan
        </dt>
        <dd className="mt-1 font-teko text-3xl font-bold leading-none tabular-nums lg:text-4xl">
          {plans.isPending
            ? '—'
            : activePlan
              ? `${formatPaidPromotionMinorAmount(activePlan.amountMinor, activePlan.currency, 'en-US')}/mo`
              : 'None yet'}
        </dd>
      </div>
    </dl>
  );
}

function StudioHeader({ profile, launch }: { profile: CuratorProfile | null; launch: LaunchState }) {
  const { user } = useAuthState();
  const setupMode = launch.nextIndex !== -1;
  const reduceMotion = useReducedMotion();
  // One orchestrated entrance; disabled entirely under prefers-reduced-motion.
  const entrance = (delay: number) => reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <header className="relative overflow-hidden rounded-none section-dark elev-3">
      {/* brand-red spine along the top edge */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
      {/* oversized watermark anchors the band without adding content */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-4 select-none font-teko text-[11rem] font-bold uppercase leading-none text-section-dark-fg/5"
      >
        Studio
      </span>

      <div
        className={cn(
          'relative grid gap-8 p-5 sm:p-9 lg:items-center',
          setupMode && 'lg:grid-cols-[minmax(0,1fr)_21rem]',
        )}
      >
        <motion.div {...entrance(0)}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
            Curator tools
          </p>
          <h1 className="mt-2 text-balance font-teko text-4xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
            Curator Studio
          </h1>
          {/* Intro copy is desktop-only; the mobile header stays compact. */}
          <p className="mt-4 hidden max-w-md text-pretty text-sm leading-relaxed opacity-80 sm:text-base lg:block">
            Set up your curator identity while keeping every regular Cassette feature. A paid
            subscription is only needed to lock posts or earn membership revenue.
          </p>
          {profile && <HeaderStats profile={profile} />}
          <MobileLaunchSummary launch={launch} />
          <div className="mt-6 flex flex-wrap gap-2">
            {/* Posting is free in both modes, so this stays the loudest action. */}
            <Button
              asChild
              className="w-full font-mono text-[10px] font-bold uppercase tracking-[0.2em] sm:w-auto"
            >
              <Link href="/add-music">New post</Link>
            </Button>
            {profile && user?.username && (
              <Button
                asChild
                variant="outline"
                className="w-full border-section-dark-fg/30 bg-transparent font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-section-dark-fg hover:bg-section-dark-fg/10 hover:text-section-dark-fg sm:w-auto"
              >
                <Link href={`/profile/${encodeURIComponent(user.username)}`}>
                  View profile
                  <ArrowUpRight aria-hidden />
                </Link>
              </Button>
            )}
          </div>
        </motion.div>

        {/* Full checklist card is desktop-only and setup-mode-only; mobile gets
            the compact summary above. */}
        {setupMode && (
          <motion.div {...entrance(0.12)} className="hidden lg:block">
            <LaunchRail launch={launch} />
          </motion.div>
        )}
      </div>
    </header>
  );
}

/** Group label between section stacks: mono eyebrow plus an optional Teko title. */
function GroupHeading({ eyebrow, title }: { eyebrow: string; title?: string }) {
  return (
    <div className="pb-4 pt-12 first:pt-0">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
        {eyebrow}
      </p>
      {title && (
        <h2 className="mt-1.5 font-teko text-3xl font-bold uppercase leading-none tracking-tight">
          {title}
        </h2>
      )}
    </div>
  );
}

function ProfileSectionSkeleton() {
  return (
    <StudioSection
      id="studio-profile"
      eyebrow="Identity"
      title="Your free curator profile"
      headingId="curator-profile-title"
    >
      <output className="sr-only">Loading curator profile…</output>
      <div className="space-y-6" aria-hidden>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
    </StudioSection>
  );
}

/** Role label per launch step; setup mode prefixes these with "Step n". */
function stepRole(id: string) {
  if (id === 'studio-profile') return 'Identity';
  if (id === 'studio-pro') return 'Subscription';
  if (id === 'studio-payouts') return 'Get paid';
  return 'Monetize';
}

function CuratorStudio() {
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });
  const launch = useLaunchSteps(profile.data ?? null);
  let defaultStepId: string | null;
  if (launch.flowStep) defaultStepId = launch.flowStep;
  else if (profile.isError || !profile.isPending && !profile.data) defaultStepId = 'studio-profile';
  else if (profile.isPending || launch.isPending) defaultStepId = null;
  else defaultStepId = launch.steps[launch.nextIndex]?.href.slice(1) ?? 'studio-earnings';
  const setupMode = launch.nextIndex !== -1;
  const incompleteIds = launch.steps.filter((step) => !step.done).map((step) => step.href.slice(1));

  const [openId, setOpenId] = useState<string | null>(null);
  // Once the curator toggles a step themselves, the default never overrides them.
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready || defaultStepId === null) return;
    if (!touched.current) setOpenId(defaultStepId);
    setReady(true);
  }, [defaultStepId, ready]);

  // Setup-mode stepper eyebrows, numbered by position among the unfinished steps.
  const incompleteKey = incompleteIds.join('|');
  const stepsValue = useMemo(() => ({
    openId,
    toggle: (id: string) => {
      touched.current = true;
      setOpenId((current) => (current === id ? null : id));
    },
    open: (id: string) => {
      touched.current = true;
      setOpenId(id);
    },
    eyebrows: incompleteKey === ''
      ? undefined
      : Object.fromEntries(incompleteKey.split('|').map((id, index) => [
          id,
          <Fragment key={id}><span className="text-primary">Step {index + 1}</span> · {stepRole(id)}</Fragment>,
        ])),
  }), [openId, incompleteKey]);

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
    <StudioStepsContext.Provider value={stepsValue}>
      <div
        className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:max-w-6xl lg:py-10"
        data-studio-steps-ready={ready ? 'true' : undefined}
      >
        <StudioHeader profile={profile.data ?? null} launch={launch} />

        <div className="mt-10 grid grid-cols-1 gap-x-14 lg:grid-cols-2 lg:items-start">
          {/* Setup: the account/setup chain leads on mobile; dashboard: money leads. */}
          <div className={cn('min-w-0', setupMode && 'order-last lg:order-none')}>
            {profile.data && <CuratorEarningsCard profile={profile.data} />}
            {profile.data && <CuratorPlanCard profile={profile.data} />}
          </div>
          <div className={cn('min-w-0', setupMode && 'order-first lg:order-none')}>
            {setupMode && <GroupHeading eyebrow="Set up" />}
            {profileSection}
            {!setupMode && <GroupHeading eyebrow="Settings" title="Billing & payouts" />}
            <CuratorProCard />
            <CuratorPayoutCard />
          </div>
        </div>
      </div>
    </StudioStepsContext.Provider>
  );
}

function StudioPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10">
      <output className="sr-only">Loading Curator Studio…</output>
      <div aria-hidden>
        <Skeleton className="h-64 w-full rounded-none" />
        <div className="mt-10 space-y-3">
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
          <Skeleton className="h-24 w-full rounded-none" />
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
