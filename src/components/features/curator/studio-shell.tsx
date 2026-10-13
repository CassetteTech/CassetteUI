'use client';

/** Shared Curator Studio chrome: the view context, setup steps, the membership invitation, soft
    section cards, status chips, notices, and figures. */

import { createContext, useContext, useId, type ComponentProps, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { studioViewOf } from '@/components/features/curator/studio-routes';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

/** Lets any section link open the view that holds its target. The Overview,
    Membership, and Payouts views stay mounted (hidden when inactive) across the
    Studio URLs, so queries, a plan draft, and provider return flows keep running
    regardless of which view is showing. */
export const StudioStepsContext = createContext<{
  /** Opens the section's view, scrolls the section into view, and focuses its first field or the section. */
  open: (sectionId: string) => void;
  /** Rail element the pass is portaled into; one fixed spot across every view. */
  passSlot: HTMLElement | null;
} | null>(null);

/** `href` is a Studio section ("#studio-plan") or another page ("/studio/music/new").
    `notice` is the one sentence a banner shows when the step is open. */
export type LaunchStep = { href: string; label: string; notice: string; done: boolean };

const isPageStep = (step: LaunchStep) => step.href.startsWith('/');

/** A section step opens in Studio; a page step is a link to that page. A step on another page or
    view ends in a forward arrow; a step on `view`, the view showing it, scrolls in place. */
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

/** One next step as a quiet card: what it is, one line on why, and its button. */
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

/** The membership invitation above the section links until a plan is published: once the page has
    music, an invitation to set one up; with setup under way, its progress and next step. It shows
    on every view, so the links never move between views. The setup reads answer after the first
    paint, so the card opens in place and the links slide down; a cached answer shows it from the
    first paint. */
export function MembershipInvitation({ show, setupSteps, setupStarted, hasMusic, view }: {
  /** False until every setup answer is in, and once a plan is published. */
  show: boolean;
  /** Design your membership, Set up payouts, Publish your plan. */
  setupSteps: LaunchStep[];
  /** A plan draft or a payout account exists. */
  setupStarted: boolean;
  hasMusic: boolean;
  /** The view showing, so the next step's button knows whether it leaves it. */
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
        {/* Not the setup card's sentence: both show on the Membership view. */}
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

/** Text color per status tone; ledger rows print the status in it without a chip. */
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
      {/* signal-dot renders in currentColor, so it follows the tone automatically */}
      <span className="signal-dot" aria-hidden />
      {children}
    </span>
  );
}

/** One studio section: a soft card with a title, an optional trailing control,
    and a description. Sections are always expanded; the dashboard decides which
    view (and therefore which sections) is visible. A plain section drops the card
    and keeps the title over a rule, for lists of music that read as the page itself;
    its tabs, when given, sit on that rule. */
export function StudioSection({
  id,
  title,
  headingId,
  description,
  chip,
  tabs,
  testId,
  plain = false,
  children,
}: {
  id: string;
  title: string;
  headingId: string;
  description?: ReactNode;
  chip?: ReactNode;
  /** Plain sections only: a tab row whose active underline covers the header rule. */
  tabs?: ReactNode;
  testId?: string;
  plain?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      data-testid={testId}
      aria-labelledby={headingId}
      // Focusable so a step link can move focus here; scroll-mt keeps anchored jumps clear of any sticky chrome above.
      tabIndex={-1}
      className={cn(
        'scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        plain ? 'rounded-md' : 'card-quiet',
      )}
    >
      <div className={cn('border-b border-border/70', plain ? (tabs ? null : 'pb-4') : 'px-5 py-4 sm:px-6')}>
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
        {/* -mb-px lays the tab row's bottom on the rule, so the active underline covers it. */}
        {plain && tabs && <div className="mt-3 -mb-px">{tabs}</div>}
      </div>
      <div className={plain ? 'pt-2' : 'px-5 py-5 sm:px-6 sm:py-6'}>{children}</div>
    </section>
  );
}

export type StudioNoticeTone = 'neutral' | 'success' | 'warning';

// Brand red reads as an error, so no tone uses it.
const noticeTones = {
  neutral: 'border-border bg-muted/40',
  success: 'border-success/30 bg-success/10',
  warning: 'border-warning/30 bg-warning/10',
} satisfies Record<StudioNoticeTone, string>;

/** Inline confirmation banner; keeps the <output> semantics tests and screen readers rely on.
    The live region stays mounted (visually collapsed while empty) so swapping the text
    content in actually fires the announcement. */
export function StudioNotice({
  testId,
  tone = 'neutral',
  action,
  className,
  children,
}: {
  testId?: string;
  tone?: StudioNoticeTone;
  /** Next-step controls beside the sentence, outside the live region. */
  action?: ReactNode;
  /** Applied only while the notice has visible content. */
  className?: string;
  children: ReactNode;
}) {
  const hasContent = children !== null && children !== undefined && children !== false && children !== '';
  return (
    <div
      className={hasContent
        ? cn(
            // A short rise explains that the banner is new; reduced motion gets the static cue alone.
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

/** A figure inside a section has no panel of its own: a hairline at its left
    edge and the grid gap separate it from its neighbours. */
export const studioFigureClassName = 'min-w-0 border-l border-border/70 pl-4';

/** One figure: small label, big Teko number, optional hint. Rendered as dt/dd,
    so the figure's div is the parent of both label and value. With `onClick`
    the figure opens the view that owns the number: the button sits in the
    value, and its ::after stretches the hit area over the whole figure. */
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
          /* Corner arrow marks the figure as a way into the view behind the number. */
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
