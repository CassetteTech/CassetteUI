'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { addMusicHref, studioMusicHref, studioPaths } from '@/components/features/curator/studio-routes';
import { StepButton, type LaunchStep } from '@/components/features/curator/studio-shell';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useAuthState } from '@/hooks/use-auth';
import { useObservedMemberPostAccess } from '@/hooks/use-curator';
import { profileQueryKeys } from '@/hooks/use-profile';
import { profileService } from '@/services/profile';

const membersPostNudgeDays = 14;
const dayMs = 24 * 60 * 60 * 1000;

function useMembersPostGap(enabled: boolean) {
  const { user } = useAuthState();
  const userId = user?.id ?? null;
  const latest = useQuery({
    queryKey: profileQueryKeys.studioActivity(userId, 'studio-members-latest'),
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
  stepsKnown: boolean;
  setupSteps: LaunchStep[];
  musicStep: LaunchStep | null;
  shareStep: LaunchStep;
}) {
  const access = useObservedMemberPostAccess();
  const membersGap = useMembersPostGap(access.state === 'ready');
  const openStep = stepsKnown ? setupSteps.find((step) => !step.done) : undefined;
  if (openStep) return <StepBanner step={openStep} />;
  if (musicStep?.done === false) return null;
  if (membersGap !== null) return <MembersPostNudge gap={membersGap} />;
  if (stepsKnown && !shareStep.done) return <StepBanner step={shareStep} />;
  return null;
}
