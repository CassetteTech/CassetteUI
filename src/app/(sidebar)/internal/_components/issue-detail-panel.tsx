'use client';

import Link from 'next/link';
import { Copy, Inbox } from 'lucide-react';
import type { InternalIssueDetail, InternalTargetMatchCandidate } from '@/types';
import { Field, Mono, Panel, StatusPill } from './kit/primitives';
import { copyToClipboard, formatDate, formatDuration, statusTone } from './internal-utils';

interface IssueDetailPanelProps {
  issue: InternalIssueDetail | null;
  isLoading: boolean;
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

function CandidateDetails({ label, candidate }: { label: string; candidate: InternalTargetMatchCandidate }) {
  const metadata = [
    candidate.title,
    candidate.artistNames.length > 0 ? candidate.artistNames.join(', ') : undefined,
    candidate.albumName,
    candidate.durationMs !== null && candidate.durationMs !== undefined ? `${candidate.durationMs} ms` : undefined,
  ].filter(Boolean);

  return (
    <div className="py-1">
      <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <Mono>{candidate.providerTrackId}</Mono>
      {metadata.length > 0 && <p className="text-[11px] leading-relaxed text-foreground">{metadata.join(' · ')}</p>}
      {candidate.components.length > 0 && (
        <div className="mt-1 space-y-0.5 border-l border-border pl-2">
          {candidate.components.map(component => (
            <p key={component.name} className="font-mono text-[10px] text-muted-foreground">
              {component.name}: {component.awardedScore}/{component.availableWeight} · {component.outcome}
              {component.disqualifiers.length > 0 ? ` · ${component.disqualifiers.join(', ')}` : ''}
            </p>
          ))}
        </div>
      )}
      {candidate.disqualifiers.length > 0 && (
        <p className="font-mono text-[10px] text-destructive">{candidate.disqualifiers.join(', ')}</p>
      )}
    </div>
  );
}
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

      {issue.matchQualityContext && (
        <div className="border-t border-border bg-muted/10 px-3 py-2">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">Match quality</p>
            <Mono>outbox v{issue.matchQualityContext.payloadSchemaVersion}</Mono>
          </div>
          {issue.matchQualityContext.decisions.map(decision => (
            <div key={decision.decisionId} className="border-t border-border/70 py-1.5 first:border-t-0">
              <Field label="Target"><Mono>{decision.platform}</Mono></Field>
              <Field label="Outcome">
                <Mono>{decision.outcome}{decision.reasonCode ? ` · ${decision.reasonCode}` : ''}</Mono>
              </Field>
              {decision.method && <Field label="Method"><Mono>{decision.method}</Mono></Field>}
              {decision.territory && <Field label="Territory"><Mono>{decision.territory}</Mono></Field>}
              {decision.confidenceBand && (
                <Field label="Confidence">
                  <Mono>{decision.confidenceBand}{decision.confidence !== null && decision.confidence !== undefined ? ` · ${decision.confidence}` : ''}</Mono>
                </Field>
              )}
              {decision.score !== null && decision.score !== undefined && (
                <Field label="Score">
                  <Mono>
                    {decision.score}
                    {decision.threshold !== null && decision.threshold !== undefined ? ` / threshold ${decision.threshold}` : ''}
                    {decision.runnerUpMargin !== null && decision.runnerUpMargin !== undefined ? ` · margin ${decision.runnerUpMargin}` : ''}
                  </Mono>
                </Field>
              )}
              {(decision.scorerVersion || decision.decisionPolicyVersion) && (
                <Field label="Versions">
                  <Mono>{[decision.scorerVersion, decision.decisionPolicyVersion, decision.decisionConfigurationVersion].filter(Boolean).join(' · ')}</Mono>
                </Field>
              )}
              <Field label="Candidates">
                <Mono>{decision.candidateCount}{decision.candidateSetTruncated ? '+' : ''}</Mono>
              </Field>
              {decision.correctionId && (
                <Field label="Applied correction">
                  <Mono>{decision.correctionId}{decision.correctionVersion ? ` v${decision.correctionVersion}` : ''}</Mono>
                </Field>
              )}
              {decision.selectedCandidate && <CandidateDetails label="Selected candidate" candidate={decision.selectedCandidate} />}
              {decision.runnerUpCandidate && <CandidateDetails label="Runner-up candidate" candidate={decision.runnerUpCandidate} />}
              <Field label="Decision"><Mono>{decision.decisionId}</Mono></Field>
            </div>
          ))}
        </div>
      )}

      {(issue.failedTracks?.length ?? 0) > 0 && (
        <div className="border-t border-border bg-muted/10 px-3 py-2">
          <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-foreground">Playlist failed tracks</p>
          {issue.failedTracks.map((track, index) => (
            <div key={`${track.position}:${track.targetPlatform ?? 'unknown'}:${index}`} className="border-t border-border/70 py-1.5 first:border-t-0">
              <Field label="Track">
                {track.position}. {track.trackName || 'Unknown'}{track.artistName ? ` · ${track.artistName}` : ''}
              </Field>
              <Field label="Failure"><Mono>{track.reasonCode || track.errorReason || 'unknown'}</Mono></Field>
              {track.attemptedMethods.length > 0 && (
                <Field label="Attempted"><Mono>{track.attemptedMethods.join(' · ')}</Mono></Field>
              )}
              {track.targetPlatform && <Field label="Target"><Mono>{track.targetPlatform}</Mono></Field>}
              {track.territory && <Field label="Territory"><Mono>{track.territory}</Mono></Field>}
              <Field label="Identifiers">
                <Mono>target id {track.hadTargetPlatformId ? 'present' : 'absent'} · {track.attemptedIsrcCount} ISRC attempt{track.attemptedIsrcCount === 1 ? '' : 's'}</Mono>
              </Field>
              {track.decisionPolicyVersion && <Field label="Policy"><Mono>{track.decisionPolicyVersion}</Mono></Field>}
              {(track.confidence !== null && track.confidence !== undefined) || track.ambiguous ? (
                <Field label="Decision">
                  <Mono>{track.confidence !== null && track.confidence !== undefined ? `confidence ${track.confidence}` : 'unscored'}{track.ambiguous ? ' · ambiguous' : ''}</Mono>
                </Field>
              ) : null}
            </div>
          ))}
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
