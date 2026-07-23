'use client';

import Link from 'next/link';
import { Copy, Inbox } from 'lucide-react';
import type { InternalIssueDetail } from '@/types';
import { Field, Mono, Panel, StatusPill } from './kit/primitives';
import { copyToClipboard, formatDate, formatDuration, statusTone } from './internal-utils';

interface IssueDetailPanelProps {
  issue: InternalIssueDetail | null;
  isLoading: boolean;
}

const REPORT_LABELS: Record<string, string> = {
  conversion_issue: 'Conversion Problem',
  missing_track: 'Missing Track/Album',
  wrong_match: 'Wrong Match',
  ui_bug: 'UI/App Bug',
  general_feedback: 'General Feedback',
};

export function IssueDetailPanel({ issue, isLoading }: IssueDetailPanelProps) {
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

  const operational = issue.operationalContext;
  const clientContext = operational.sanitizedClientContext;

  return (
    <Panel title="Issue">
      <div className="space-y-0.5 p-3">
        <p className="text-sm font-semibold text-foreground">{REPORT_LABELS[issue.reportType] ?? issue.reportType}</p>
        <p className="text-[11px] text-muted-foreground">
          {issue.sourceContext} · {issue.username || issue.userEmail || 'Anonymous'} · {formatDate(issue.createdAt)}
        </p>
      </div>

      {clientContext.description && (
        <div className="border-t border-border bg-muted/30 px-3 py-2">
          <p className="text-xs leading-relaxed text-foreground">{clientContext.description}</p>
        </div>
      )}

      <div className="border-t border-border px-3 py-1.5">
        <Field label="ID">
          <span className="inline-flex items-center gap-1">
            <Mono>{issue.id}</Mono>
            <button type="button" onClick={() => void copyToClipboard(issue.id, 'ID')} className="text-muted-foreground hover:text-foreground"><Copy className="h-3 w-3" /></button>
          </span>
        </Field>
        {clientContext.elementType && <Field label="Element"><Mono>{clientContext.elementType}</Mono></Field>}
        {clientContext.routeContext && <Field label="Route"><Mono>{clientContext.routeContext}</Mono></Field>}
        {issue.correlationId && <Field label="Correlation"><Mono>{issue.correlationId}</Mono></Field>}
        {clientContext.sourceDomain && <Field label="Domain">{clientContext.sourceDomain}</Field>}
        {clientContext.sourceLinkHash && <Field label="Source hash"><Mono>{clientContext.sourceLinkHash}</Mono></Field>}
        {(clientContext.screenSize || clientContext.userTimezone) && (
          <Field label="Env">{[clientContext.screenSize, clientContext.userTimezone].filter(Boolean).join(' · ')}</Field>
        )}
      </div>

      {operational.conversionJob && (
        <div className="border-t border-border">
          <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Linked conversion job</div>
          <div className="px-3 pb-2">
            <div className="flex items-center justify-between gap-2">
              <Link href={`/internal/sentinel?view=runtime&job=${encodeURIComponent(operational.conversionJob.jobId)}`} className="break-all font-mono text-[11px] text-domain hover:underline">
                {operational.conversionJob.jobId}
              </Link>
              <StatusPill tone={statusTone(operational.conversionJob.status)} label={operational.conversionJob.status} />
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {[operational.conversionJob.stage, formatDuration(operational.conversionJob.durationMs), formatDate(operational.conversionJob.createdAtUtc)].filter(Boolean).join(' · ')}
            </p>
          </div>
        </div>
      )}

      <div className="border-t border-border">
        <div className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Lifecycle · {operational.recentLifecycleEvents.length}
        </div>
        {operational.recentLifecycleEvents.length === 0 ? (
          <p className="px-3 pb-3 text-xs text-muted-foreground">No retained lifecycle events.</p>
        ) : (
          <div className="divide-y divide-border">
            {operational.recentLifecycleEvents.map((event) => (
              <div key={`${event.operation}-${event.occurredAtUtc}-${event.lambdaRequestId ?? ''}`} className="space-y-1 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{event.operation}</span>
                  <StatusPill tone={statusTone(event.status)} label={event.status} />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {[event.platform, event.elementType, formatDuration(event.durationMs), formatDate(event.occurredAtUtc)].filter(Boolean).join(' · ')}
                </p>
                {event.errorCategory && <p className="text-[11px] text-destructive">{event.errorCategory}</p>}
                {event.lambdaRequestId && <Mono>{event.lambdaRequestId}</Mono>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-border px-3 py-1.5">
        <Field label="Client context">{clientContext.sourceContext}</Field>
        <Field label="Payload keys">{clientContext.payloadKeys.length ? clientContext.payloadKeys.join(', ') : 'None retained'}</Field>
        {clientContext.redactedPayloadKeyCount > 0 && <Field label="Redacted keys">{clientContext.redactedPayloadKeyCount}</Field>}
      </div>
    </Panel>
  );
}
