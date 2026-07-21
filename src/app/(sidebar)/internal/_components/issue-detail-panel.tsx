'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Copy, Inbox, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { InternalIssueDetail } from '@/types';
import { Panel, Field } from './kit';
import { formatDate } from './internal-utils';

interface IssueDetailPanelProps {
  issue: InternalIssueDetail | null;
  isLoading: boolean;
}

interface ParsedPayload {
  description?: string;
  context?: { elementType?: string; title?: string; artist?: string; platforms?: Record<string, unknown>; userTimezone?: string; screenSize?: string; [k: string]: unknown };
  [k: string]: unknown;
}

interface ReviewTargetCandidate {
  platform: string;
  providerId: string;
}

const REPORT_LABELS: Record<string, string> = {
  conversion_issue: 'Conversion Problem',
  missing_track: 'Missing Track/Album',
  wrong_match: 'Wrong Match',
  ui_bug: 'UI/App Bug',
  general_feedback: 'General Feedback',
};

function ExtLink({ href }: { href: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-domain hover:underline">
      <span className="max-w-[180px] truncate">{href}</span>
      <ExternalLink className="h-3 w-3 shrink-0" />
    </a>
  );
}

function Mono({ children }: { children: React.ReactNode }) {
  return <span className="break-all font-mono text-[11px]">{children}</span>;
}

export function IssueDetailPanel({ issue, isLoading }: IssueDetailPanelProps) {
  const [showRaw, setShowRaw] = useState(false);

  const { parsed, formattedJson } = useMemo(() => {
    if (!issue?.payload) return { parsed: null, formattedJson: null };
    try {
      const obj = JSON.parse(issue.payload) as ParsedPayload;
      return { parsed: obj, formattedJson: JSON.stringify(obj, null, 2) };
    } catch {
      return { parsed: null, formattedJson: issue.payload };
    }
  }, [issue?.payload]);

  const copy = async (text: string, label: string) => {
    try { await navigator.clipboard.writeText(text); toast.success(`${label} copied`); }
    catch { toast.error('Failed to copy'); }
  };

  if (isLoading) {
    return (
      <Panel title="Issue">
        <div className="space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />)}
        </div>
      </Panel>
    );
  }

  if (!issue) {
    return (
      <Panel title="Issue">
        <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
          <Inbox className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">Select an issue to inspect.</p>
        </div>
      </Panel>
    );
  }

  const ctx = parsed?.context;
  const review = issue.matchReviewCandidate;
  let reviewTargets: ReviewTargetCandidate[] = [];
  if (review?.targetCandidatesJson) {
    try {
      const value = JSON.parse(review.targetCandidatesJson) as unknown;
      if (Array.isArray(value)) {
        reviewTargets = value.filter((candidate): candidate is ReviewTargetCandidate =>
          typeof candidate === 'object' && candidate !== null &&
          typeof (candidate as ReviewTargetCandidate).platform === 'string' &&
          typeof (candidate as ReviewTargetCandidate).providerId === 'string',
        );
      }
    } catch {
      reviewTargets = [];
    }
  }

  return (
    <Panel title="Issue">
      <div className="space-y-0.5 p-3">
        <p className="text-sm font-semibold text-foreground">{REPORT_LABELS[issue.reportType] ?? issue.reportType}</p>
        <p className="text-[11px] text-muted-foreground">
          {issue.sourceContext} · {issue.username || issue.userEmail || 'Anonymous'} · {formatDate(issue.createdAt)}
        </p>
      </div>

      {parsed?.description && (
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <p className="text-xs leading-relaxed text-foreground">{parsed.description}</p>
        </div>
      )}

      {review && (
        <div className="border-t border-border bg-muted/20 px-3 py-1.5">
          <Field label="Review status"><Mono>{review.status}</Mono></Field>
          {review.title && <Field label="Reported title">{review.title}</Field>}
          {review.artist && <Field label="Reported artist">{review.artist}</Field>}
          {review.sourcePlatform && review.sourceProviderId && (
            <Field label="Source identity"><Mono>{review.sourcePlatform}:{review.sourceProviderId}</Mono></Field>
          )}
          {reviewTargets.map(candidate => (
            <Field key={`${candidate.platform}:${candidate.providerId}`} label="Candidate">
              <Mono>{candidate.platform}:{candidate.providerId}</Mono>
            </Field>
          ))}
          {review.disposition && <Field label="Disposition"><Mono>{review.disposition}</Mono></Field>}
          {review.correctionId && <Field label="Correction"><Mono>{review.correctionId}</Mono></Field>}
          {review.regressionCaseId && <Field label="Regression"><Mono>{review.regressionCaseId}</Mono></Field>}
        </div>
      )}

      <div className="border-t border-border px-3 py-1.5">
        <Field label="ID">
          <span className="inline-flex items-center gap-1">
            <Mono>{issue.id}</Mono>
            <button type="button" onClick={() => void copy(issue.id, 'ID')} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
          </span>
        </Field>
        {ctx?.title && <Field label="Title">{ctx.title}</Field>}
        {ctx?.artist && <Field label="Artist">{ctx.artist}</Field>}
        {ctx?.elementType && <Field label="Element"><Mono>{ctx.elementType}</Mono></Field>}
        {issue.pageUrl && <Field label="Page"><ExtLink href={issue.pageUrl} /></Field>}
        {issue.sourceLink && <Field label="Source"><ExtLink href={issue.sourceLink} /></Field>}
        {issue.routeContext && <Field label="Route"><Mono>{issue.routeContext}</Mono></Field>}
        {issue.correlationId && <Field label="Correlation"><Mono>{issue.correlationId}</Mono></Field>}
        {issue.conversionJobId && <Field label="Job"><Mono>{issue.conversionJobId}</Mono></Field>}
        {issue.sourceDomain && <Field label="Domain">{issue.sourceDomain}</Field>}
        {(ctx?.screenSize || ctx?.userTimezone) && (
          <Field label="Env">{[ctx?.screenSize, ctx?.userTimezone].filter(Boolean).join(' · ')}</Field>
        )}
      </div>

      {formattedJson && (
        <div className="border-t border-border">
          <Collapsible open={showRaw} onOpenChange={setShowRaw}>
            <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground">
              Raw payload
              <ChevronDown className={`h-3 w-3 transition-transform ${showRaw ? 'rotate-180' : ''}`} />
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="relative">
                <button type="button" onClick={() => void copy(formattedJson, 'Payload')} className="absolute right-2 top-2 z-10 text-muted-foreground hover:text-foreground">
                  <Copy className="h-3 w-3" />
                </button>
                <ScrollArea className="max-h-[260px]">
                  <pre className="whitespace-pre-wrap break-all bg-muted/30 px-3 py-2 pr-8 font-mono text-[11px] leading-relaxed">{formattedJson}</pre>
                </ScrollArea>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      )}
    </Panel>
  );
}
