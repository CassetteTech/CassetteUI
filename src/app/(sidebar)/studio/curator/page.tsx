'use client';

/** Curator Studio: a launch-checklist console over a stepped accordion for the
    free profile, Curator Pro, payouts, membership plans, and earnings. */

import { Suspense, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPayoutCard } from '@/components/features/curator/curator-payout-card';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import { CuratorProCard } from '@/components/features/curator/curator-pro-card';
import {
  StudioChip,
  StudioSection,
  StudioStepsContext,
  type StudioChipTone,
} from '@/components/features/curator/studio-shell';
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
  const mutation = useMutation({
    mutationFn: (request: CuratorProfileRequest) => profile
      ? updateCuratorProfile(request)
      : createCuratorProfile(request),
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(profileQueryKey, savedProfile);
      toast.success(profile ? 'Curator profile updated.' : 'Curator profile created.');
    },
  });

  return (
    <StudioSection
      id="studio-profile"
      eyebrow={<><span className="text-primary">Step 1</span> · Identity</>}
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
        <p className="mb-6 rounded-lg border border-destructive/40 border-l-2 border-l-destructive bg-destructive/10 px-4 py-3 text-sm">
          This curator profile is suspended: {profile.suspensionReason}
        </p>
      )}

      <form
        className="space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
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
            Your changes were not saved. Check the fields and try again.
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

/** Patreon-style launch checklist. Reads the same query keys the section cards
    use, so React Query dedupes the requests and the rail stays in sync. */
function LaunchRail({ profile }: { profile: CuratorProfile | null }) {
  const { user } = useAuthState();
  const searchParams = useSearchParams();
  // During a hosted-onboarding return (?payout=…) the payout card owns the
  // single status request; the rail only reads the cache it seeds.
  const payoutFlowActive = searchParams.has('payout');
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

  const stepsAccordion = useContext(StudioStepsContext);
  const steps = [
    { href: '#studio-profile', label: 'Create your free profile', done: profile?.status === 'active' },
    { href: '#studio-pro', label: 'Start Curator Pro', done: pro.data?.hasAccess === true },
    { href: '#studio-payouts', label: 'Set up payouts', done: payout.data != null },
    { href: '#studio-plan', label: 'Publish a membership plan', done: plans.data?.some((plan) => plan.status === 'active') === true },
  ];
  const doneCount = steps.filter((step) => step.done).length;
  // The first unfinished step is the curator's next action.
  const nextIndex = steps.findIndex((step) => !step.done);

  return (
    <div className="rounded-xl border border-section-dark-fg/15 bg-section-dark-fg/5 p-5 sm:p-6">
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
    <dl className="mt-7 flex flex-wrap gap-x-10 gap-y-4">
      <div>
        <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
          Active members
        </dt>
        <dd className="mt-1 font-teko text-4xl font-bold leading-none tabular-nums">
          {earnings.data ? memberCountFormatter.format(earnings.data.activeMemberCount) : '—'}
        </dd>
      </div>
      <div>
        <dt className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] opacity-70">
          Live plan
        </dt>
        <dd className="mt-1 font-teko text-4xl font-bold leading-none tabular-nums">
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

function StudioHeader({ profile }: { profile: CuratorProfile | null }) {
  const { user } = useAuthState();
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
    <header className="relative overflow-hidden rounded-2xl section-dark elev-3">
      {/* brand-red spine along the top edge */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-primary" />
      {/* oversized watermark anchors the band without adding content */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-12 -right-4 select-none font-teko text-[11rem] font-bold uppercase leading-none text-section-dark-fg/5"
      >
        Studio
      </span>

      <div className="relative grid gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-center">
        <motion.div {...entrance(0)}>
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] opacity-70">
            Curator tools
          </p>
          <h1 className="mt-2 font-teko text-5xl font-bold uppercase leading-none tracking-tight sm:text-6xl">
            Curator Studio
          </h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed opacity-80 sm:text-base">
            Set up your curator identity while keeping every regular Cassette feature. A paid
            subscription is only needed to lock posts or earn membership revenue.
          </p>
          {profile && <HeaderStats profile={profile} />}
          {profile && user?.username && (
            <Button
              asChild
              variant="outline"
              className="mt-6 border-section-dark-fg/30 bg-transparent font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-section-dark-fg hover:bg-section-dark-fg/10 hover:text-section-dark-fg"
            >
              <Link href={`/profile/${encodeURIComponent(user.username)}`}>
                View profile
                <ArrowUpRight aria-hidden />
              </Link>
            </Button>
          )}
        </motion.div>

        <motion.div {...entrance(0.12)}>
          <LaunchRail profile={profile} />
        </motion.div>
      </div>
    </header>
  );
}

/** Decides which accordion step should open first. Uses the same queries the
    checklist and cards subscribe to, so this adds no network requests. */
function useDefaultStepId(profileStatus: {
  isPending: boolean;
  isError: boolean;
  data: CuratorProfile | null | undefined;
}): string | null {
  const { user } = useAuthState();
  const searchParams = useSearchParams();
  // Provider return flows (?pro=… / ?payout=…) land the curator on that step.
  const flowStep = searchParams.has('payout')
    ? 'studio-payouts'
    : searchParams.has('pro') ? 'studio-pro' : null;
  const pro = useQuery({
    queryKey: ['curator-pro-status', user?.id ?? null],
    queryFn: ({ signal }) => apiService.getCuratorProStatus(signal),
    enabled: Boolean(user?.id),
    staleTime: 0,
  });
  const payout = useQuery({
    queryKey: ['curator-payout-account', 'current'],
    queryFn: ({ signal }) => fetchCuratorPayoutAccount(false, signal),
    // During a payout return flow the payout card owns the single status request.
    enabled: flowStep !== 'studio-payouts',
    staleTime: 0,
  });
  const plans = useQuery({
    queryKey: ['curator-plans', profileStatus.data?.id ?? 'none'],
    queryFn: ({ signal }) => fetchCuratorPlans(signal),
    enabled: Boolean(profileStatus.data),
    staleTime: 0,
  });

  if (flowStep) return flowStep;
  if (profileStatus.isError) return 'studio-profile';
  if (profileStatus.isPending) return null;
  if (!profileStatus.data) return 'studio-profile';
  // Wait until the launch state settles, then open the first unfinished step.
  if (pro.isPending || payout.isPending || plans.isPending) return null;
  if (pro.data?.hasAccess !== true) return 'studio-pro';
  if (payout.data == null) return 'studio-payouts';
  if (!plans.data?.some((plan) => plan.status === 'active')) return 'studio-plan';
  return 'studio-earnings';
}

function ProfileSectionSkeleton() {
  return (
    <StudioSection
      id="studio-profile"
      eyebrow={<><span className="text-primary">Step 1</span> · Identity</>}
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

function CuratorStudio() {
  const profile = useQuery({
    queryKey: profileQueryKey,
    queryFn: ({ signal }) => fetchOwnCuratorProfile(signal),
    staleTime: 0,
  });
  const defaultStepId = useDefaultStepId(profile);

  const [openId, setOpenId] = useState<string | null>(null);
  // Once the curator toggles a step themselves, the default never overrides them.
  const touched = useRef(false);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (ready || defaultStepId === null) return;
    if (!touched.current) setOpenId(defaultStepId);
    setReady(true);
  }, [defaultStepId, ready]);

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
  }), [openId]);

  return (
    <StudioStepsContext.Provider value={stepsValue}>
      <div
        className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-10"
        data-studio-steps-ready={ready ? 'true' : undefined}
      >
        <StudioHeader profile={profile.data ?? null} />

        <div className="mt-8 space-y-3">
          {profile.isPending ? (
            <ProfileSectionSkeleton />
          ) : profile.isError ? (
            <StudioSection
              id="studio-profile"
              eyebrow={<><span className="text-primary">Step 1</span> · Identity</>}
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
          )}

          <CuratorProCard />
          <CuratorPayoutCard />
          {profile.data && <CuratorPlanCard profile={profile.data} />}
          {profile.data && <CuratorEarningsCard />}
        </div>
      </div>
    </StudioStepsContext.Provider>
  );
}

export default function CuratorStudioPage() {
  return (
    <RequireAuth>
      <Suspense fallback={null}>
        <CuratorStudio />
      </Suspense>
    </RequireAuth>
  );
}
