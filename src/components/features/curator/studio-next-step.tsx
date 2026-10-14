'use client';

/** One next step above Studio Music once a plan is published: an open setup step, then the
    members-only post nudge, then sharing the page. Before the first publish the membership
    invitation above the section links leads instead. */

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { addMusicHref, studioMusicHref, studioPaths } from '@/components/features/curator/studio-routes';
import { StepButton, type LaunchStep } from '@/components/features/curator/studio-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/use-auth';
import { useMemberPostAccess } from '@/hooks/use-curator';
import { profileService } from '@/services/profile';

const membersPostNudgeDays = 14;
const dayMs = 24 * 60 * 60 * 1000;

/** Days since the newest members-only post once they reach `membersPostNudgeDays`, 'never' when
    there is none, else null. Read only for a curator who can post members-only. */
function useMembersPostGap(enabled: boolean) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  // Newest first, so one item is the latest members-only post. Under the activity key, so a new
  // post anywhere refreshes it.
  const latest = useQuery({
    queryKey: ['user-activity', userId, 'studio-members-latest'],
    queryFn: () => profileService.fetchUserActivity(userId!, { pageSize: 1, privacy: 'subscriber' }),
    enabled: enabled && userId !== null,
    staleTime: 0,
  });
  if (!enabled || !latest.data) return null;
  const newest = latest.data.items[0];
  if (!newest) return 'never' as const;
  const days = Math.floor((Date.now() - Date.parse(newest.createdAt)) / dayMs);
  return days >= membersPostNudgeDays ? days : null;
}

/** An open step as one banner: its notice and the button that starts it. */
function StepBanner({ step }: { step: LaunchStep }) {
  return (
    <Alert className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted/40">
      <p>{step.notice}</p>
      <StepButton step={step} view="studio-music" size="sm">
        {step.label}
      </StepButton>
    </Alert>
  );
}

/** Members pay for the posts only they can open, so a long gap since the last one gets a banner. */
function MembersPostNudge({ gap }: { gap: number | 'never' }) {
  return (
    <Alert className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 bg-muted/40">
      <p>
        {gap === 'never' ? 'You have no members-only posts yet.' : `No new members-only post in ${gap} days.`}
        {' '}Members join for the posts only they can open.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild size="sm">
          <Link href={addMusicHref(studioPaths['studio-music'])}>Add music</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href={studioMusicHref({ audience: 'public' })} replace scroll={false}>Choose a public post</Link>
        </Button>
      </div>
    </Alert>
  );
}

export function StudioNextStep({ stepsKnown, setupSteps, musicStep, shareStep }: {
  /** False until every step's state has been read; a step whose state is unread is not open. */
  stepsKnown: boolean;
  /** Design your membership, Set up payouts, Publish your plan. */
  setupSteps: LaunchStep[];
  /** Null while the first music read has failed. */
  musicStep: LaunchStep | null;
  shareStep: LaunchStep;
}) {
  // Shows only above Studio Music, which reads the access; observe that read instead of repeating it.
  const access = useMemberPostAccess(false);
  const membersGap = useMembersPostGap(access.state === 'ready');
  const openStep = stepsKnown ? setupSteps.find((step) => !step.done) : undefined;
  if (openStep) return <StepBanner step={openStep} />;
  // The empty list below asks for the first music.
  if (musicStep?.done === false) return null;
  if (membersGap !== null) return <MembersPostNudge gap={membersGap} />;
  if (stepsKnown && !shareStep.done) return <StepBanner step={shareStep} />;
  return null;
}
