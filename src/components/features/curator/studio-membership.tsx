'use client';

/** Studio Membership: everything a curator sells. Before the first publish, the three setup steps
    and the plan form; after it, the members, then the plan. */

import { useContext } from 'react';
import { CuratorEarningsCard } from '@/components/features/curator/curator-earnings-card';
import { CuratorPlanCard } from '@/components/features/curator/curator-plan-card';
import {
  StepButton,
  StudioSection,
  StudioStepsContext,
  type LaunchStep,
} from '@/components/features/curator/studio-shell';
import { TaskSteps } from '@/components/interior/task-steps';
import { Progress } from '@/components/ui/progress';
import type { CuratorProfile } from '@/services/curator';

/** Design, payouts, publish: the steps to a live membership. */
function MembershipSetupCard({ steps }: { steps: LaunchStep[] }) {
  const views = useContext(StudioStepsContext);
  const doneCount = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);
  return (
    <StudioSection
      id="studio-setup"
      title="Membership setup"
      headingId="studio-setup-title"
      chip={<span className="text-xs tabular-nums text-muted-foreground">{doneCount} of {steps.length} done</span>}
    >
      {doneCount === 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          A membership lets fans support your curation with a monthly payment.
        </p>
      )}
      <Progress
        value={(doneCount / steps.length) * 100}
        aria-label={`Membership setup: ${doneCount} of ${steps.length} steps complete`}
        className="h-1.5"
      />
      <TaskSteps
        className="mt-4"
        label="Membership setup"
        steps={steps.map((step, index) => ({ id: String(index), label: step.label, done: step.done }))}
        onSelect={(id) => views?.open(steps[Number(id)].href.slice(1))}
      />
      {next && (
        <StepButton step={next} view="studio-membership" className="mt-4 w-full sm:w-auto">
          Next: {next.label}
        </StepButton>
      )}
    </StudioSection>
  );
}

export function StudioMembership({
  profile,
  setupSteps,
  hasPublished,
  preview,
}: {
  profile: CuratorProfile | null;
  /** Design your membership, Set up payouts, Publish your plan. */
  setupSteps: LaunchStep[];
  /** null until the plans are read; a failed read leaves the plan card to say so and retry. */
  hasPublished: boolean | null;
  /** Whether this view is showing, so the rail previews the plan. */
  preview: boolean;
}) {
  // The plan card keeps its place in the list, so the first publish does not remount it.
  return (
    <div className="space-y-6">
      {hasPublished === false
        ? <MembershipSetupCard steps={setupSteps} />
        : hasPublished && profile && <CuratorEarningsCard profile={profile} />}
      <CuratorPlanCard profile={profile} preview={preview} />
    </div>
  );
}
