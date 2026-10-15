'use client';

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { studioViewOf } from '@/components/features/curator/studio-routes';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

export const StudioStepsContext = createContext<{
  open: (sectionId: string) => void;
  passSlot: HTMLElement | null;
} | null>(null);

export type LaunchStep = { href: string; label: string; notice: string; done: boolean };

const isPageStep = (step: LaunchStep) => step.href.startsWith('/');

export function StepButton({ step, view, children, ...props }: { step: LaunchStep; view: string } & ComponentProps<typeof Button>) {
  const views = useContext(StudioStepsContext);
  const arrow = (isPageStep(step) || studioViewOf(step.href.slice(1)) !== view) && <ArrowRight aria-hidden />;
  if (isPageStep(step)) {
    return (
      <Button asChild {...props}>
        <Link href={step.href}>{children}{arrow}</Link>
      </Button>
    );
  }
  return <Button {...props} onClick={() => views?.open(step.href.slice(1))}>{children}{arrow}</Button>;
}

function NextStepCard({ title, action, children }: { title: string; action: ReactNode; children: ReactNode }) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="card-quiet flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 py-4 sm:px-6"
    >
      <div className="min-w-0">
        <h2 id={headingId} className="text-sm font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{children}</p>
      </div>
      {action}
    </section>
  );
}

export function MembershipInvitation({ show, setupSteps, setupStarted, hasMusic, view }: {
  show: boolean;
  setupSteps: LaunchStep[];
  setupStarted: boolean;
  hasMusic: boolean;
  view: string;
}) {
  const views = useContext(StudioStepsContext);
  const next = setupSteps.find((step) => !step.done);
  let card: ReactNode = null;
  if (show && setupStarted && next) {
    card = (
      <NextStepCard
        title="Finish your membership"
        action={<StepButton step={next} view={view} size="sm">{next.label}</StepButton>}
      >
        {`${setupSteps.filter((step) => step.done).length} of ${setupSteps.length} steps done.`}
      </NextStepCard>
    );
  } else if (show && !setupStarted && hasMusic) {
    card = (
      <NextStepCard
        title="Earn from your music"
        action={(
          <Button variant="outline" size="sm" onClick={() => views?.open('studio-plan')}>
            Set up a membership
            <ArrowRight aria-hidden />
          </Button>
        )}
      >
        Fans pay you monthly to open your members-only posts.
      </NextStepCard>
    );
  }
  return (
    <Collapsible open={card !== null}>
      <CollapsibleContent className="motion-reduce:data-[state=closed]:animate-none motion-reduce:data-[state=open]:animate-none">
        <div className="pt-6">{card}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export type StudioChipTone = 'neutral' | 'positive' | 'warning' | 'danger';

export const studioToneText = {
  neutral: 'text-muted-foreground',
  positive: 'text-success-text',
  warning: 'text-warning-text',
  danger: 'text-destructive',
} satisfies Record<StudioChipTone, string>;

export function StudioChip({
  tone = 'neutral',
  className,
  children,
  ...props
}: React.ComponentProps<'span'> & { tone?: StudioChipTone }) {
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium leading-none',
        studioToneText[tone],
        className,
      )}
      {...props}
    >
      <span className="signal-dot" aria-hidden />
      {children}
    </span>
  );
}

export function StudioSection({
  id,
  title,
  headingId,
  description,
  chip,
  tabs,
  testId,
  list = false,
  children,
}: {
  id: string;
  title: string;
  headingId: string;
  description?: ReactNode;
  chip?: ReactNode;
  tabs?: ReactNode;
  testId?: string;
  /** The children are the page's own rows, so they start right under the rule. */
  list?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={headingId}
      tabIndex={-1}
      className="scroll-mt-[calc(var(--navbar-height)+2rem)] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <div className={cn('border-b border-border', !tabs && 'pb-4')}>
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-semibold leading-tight tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            )}
          </div>
          {chip}
        </div>
        {tabs && <div className="mt-3 -mb-px">{tabs}</div>}
      </div>
      <div className={list ? 'pt-2' : 'pt-5'}>{children}</div>
    </section>
  );
}

export type StudioNoticeTone = 'neutral' | 'success' | 'warning';

const noticeTones = {
  neutral: 'border-border bg-muted/40',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
} satisfies Record<StudioNoticeTone, string>;

/** The live region stays mounted (visually collapsed while empty) so swapping the text
    content in actually fires the screen reader announcement. */
export function StudioNotice({
  testId,
  tone = 'neutral',
  action,
  className,
  children,
}: {
  testId?: string;
  tone?: StudioNoticeTone;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const hasContent = children !== null && children !== undefined && children !== false && children !== '';
  return (
    <div
      className={hasContent
        ? cn(
            'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-280 motion-safe:ease-out',
            noticeTones[tone],
            className,
          )
        : 'sr-only'}
    >
      <output data-testid={testId} aria-live="polite">{children}</output>
      {hasContent && action}
    </div>
  );
}

export const studioFigureClassName = 'min-w-0 border-l border-border pl-4';

export function StudioStat({
  label,
  value,
  hint,
  valueTestId,
  className,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueTestId?: string;
  className?: string;
  onClick?: () => void;
}) {
  const labelId = useId();
  const valueId = useId();
  return (
    <div
      className={cn(
        studioFigureClassName,
        onClick && 'group relative rounded-r-sm pr-6 transition-colors has-[button:hover]:border-foreground has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring has-[button:focus-visible]:ring-offset-2 has-[button:focus-visible]:ring-offset-background',
        className,
      )}
    >
      <dt id={labelId} className="text-xs text-muted-foreground">
        {label}
        {onClick && (
          <ArrowUpRight
            aria-hidden
            className="absolute right-0 top-0 size-4 text-muted-foreground/60 transition-colors group-hover:text-foreground group-focus-within:text-foreground"
          />
        )}
      </dt>
      <dd id={valueId} className="mt-1 font-teko text-3xl font-bold leading-none tabular-nums" data-testid={valueTestId}>
        {onClick ? (
          <button
            type="button"
            onClick={onClick}
            aria-labelledby={`${labelId} ${valueId}`}
            className="text-left after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
          >
            {value}
          </button>
        ) : value}
      </dd>
      {hint && <dd className="mt-1.5 text-xs text-muted-foreground">{hint}</dd>}
    </div>
  );
}
