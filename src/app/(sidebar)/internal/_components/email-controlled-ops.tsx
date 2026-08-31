'use client';

import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type {
  InternalEmailLifecycleSweepResult,
  InternalEmailOperationsConfig,
  InternalEmailOutboxReplayResult,
} from '@/types';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Field, Mono, Panel } from './kit';

function SweepResultView({ result }: { result: InternalEmailLifecycleSweepResult }) {
  return (
    <div className="space-y-2">
      <div className="divide-y divide-border">
        <Field label="product updates enabled"><Mono>{String(result.productUpdatesEnabled)}</Mono></Field>
        <Field label="budget expired"><Mono>{String(result.budgetExpired)}</Mono></Field>
        <Field label="recipient snapshots released"><Mono>{result.recipientSnapshotsReleased.toLocaleString()}</Mono></Field>
        <Field label="recipient snapshots deleted"><Mono>{result.recipientSnapshotsDeleted.toLocaleString()}</Mono></Field>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">email types</p>
      {result.emailTypes.length === 0 && <p className="text-[11px] text-muted-foreground">—</p>}
      {result.emailTypes.map((t) => (
        <div key={t.eventType} className="divide-y divide-border/60 rounded-md border border-border bg-muted/40 px-2.5 py-1">
          <Field label="event type"><Mono>{t.eventType}</Mono></Field>
          <Field label="preference excluded"><Mono>{t.preferenceExcluded.toLocaleString()}</Mono></Field>
          <Field label="suppression excluded"><Mono>{t.suppressionExcluded.toLocaleString()}</Mono></Field>
          <Field label="already enqueued"><Mono>{t.alreadyEnqueued.toLocaleString()}</Mono></Field>
          <Field label="enqueued"><Mono>{t.enqueued.toLocaleString()}</Mono></Field>
        </div>
      ))}
    </div>
  );
}

export function EmailControlledOps({ config }: { config: InternalEmailOperationsConfig | null }) {
  // Controlled sweep
  const [sweepReason, setSweepReason] = useState('');
  const [sweepDialogOpen, setSweepDialogOpen] = useState(false);
  const [sweepRunning, setSweepRunning] = useState(false);
  const [sweepResult, setSweepResult] = useState<InternalEmailLifecycleSweepResult | null>(null);

  // Replay
  const [replayOutboxId, setReplayOutboxId] = useState('');
  const [replayReason, setReplayReason] = useState('');
  const [replayConfirmedNonAcceptance, setReplayConfirmedNonAcceptance] = useState(false);
  const [replayDialogOpen, setReplayDialogOpen] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayResult, setReplayResult] = useState<InternalEmailOutboxReplayResult | null>(null);

  const sweepAvailable = config?.controlledSweepAvailable ?? false;

  const handleRunSweep = async () => {
    setSweepDialogOpen(false);
    setSweepRunning(true);
    try {
      const result = await apiService.runInternalEmailControlledSweep({ reason: sweepReason.trim() });
      setSweepResult(result);
      setSweepReason('');
      toast.success('Controlled lifecycle sweep completed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to run controlled sweep');
    } finally {
      setSweepRunning(false);
    }
  };

  const canReplay =
    replayOutboxId.trim().length > 0 && replayReason.trim().length > 0 && replayConfirmedNonAcceptance;

  const handleReplay = async () => {
    setReplayDialogOpen(false);
    setReplaying(true);
    try {
      const result = await apiService.replayInternalEmailOutbox(replayOutboxId.trim(), {
        reviewReason: replayReason.trim(),
        providerNonAcceptanceConfirmed: replayConfirmedNonAcceptance,
      });
      setReplayResult(result);
      toast.success(result.replayed ? 'Dead email re-queued for delivery.' : 'Replay request processed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to replay dead email');
    } finally {
      setReplaying(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* ── Controlled lifecycle sweep ── */}
      <Panel title="Controlled Lifecycle Sweep">
        <div className="space-y-3 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Runs one lifecycle sweep against the configured allowlist through the normal delivery
            pipeline, exactly as the scheduler would.
          </p>
          {sweepAvailable ? (
            <>
              <Input
                placeholder="Reason for this sweep (required)"
                value={sweepReason}
                onChange={(e) => setSweepReason(e.target.value)}
                className="text-xs"
                disabled={sweepRunning}
              />
              <AlertDialog open={sweepDialogOpen} onOpenChange={setSweepDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5"
                    disabled={!sweepReason.trim() || sweepRunning}
                  >
                    <Play className="h-3.5 w-3.5" />
                    {sweepRunning ? 'Running sweep…' : 'Run controlled sweep'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Run controlled lifecycle sweep</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-3 pt-1">
                        <p className="text-[hsl(var(--warning-text))]">
                          A successful run sends real emails and consumes durable send history for
                          eligible allowlisted accounts — those sends will not repeat on later sweeps.
                        </p>
                        <div className="rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">
                          <span className="text-muted-foreground">Reason: </span>
                          {sweepReason.trim()}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => void handleRunSweep()}>
                      Run sweep
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Controlled sweeps are unavailable here: they require a non-production environment with
              a configured allowlist.
            </p>
          )}
          {sweepResult && (
            <div className="border-t border-border pt-2.5">
              <p className="pb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Last sweep result
              </p>
              <SweepResultView result={sweepResult} />
            </div>
          )}
        </div>
      </Panel>

      {/* ── Replay dead email ── */}
      <Panel title="Replay Dead Email">
        <div className="space-y-3 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">
            Re-queues a dead outbox row after manual review. Only use when the provider did not
            accept the original message, so the recipient cannot have received it.
          </p>
          <Input
            placeholder="Outbox ID"
            value={replayOutboxId}
            onChange={(e) => setReplayOutboxId(e.target.value)}
            className="h-8 font-mono text-xs"
            disabled={replaying}
          />
          <Input
            placeholder="Review reason (required)"
            value={replayReason}
            onChange={(e) => setReplayReason(e.target.value)}
            className="text-xs"
            disabled={replaying}
          />
          <label className="flex items-start gap-2 text-xs text-foreground">
            <input
              type="checkbox"
              checked={replayConfirmedNonAcceptance}
              onChange={(e) => setReplayConfirmedNonAcceptance(e.target.checked)}
              disabled={replaying}
              className="mt-0.5 h-3.5 w-3.5 accent-primary"
            />
            <span>
              I verified the provider did not accept this message; replaying cannot deliver a
              duplicate email.
            </span>
          </label>
          <AlertDialog open={replayDialogOpen} onOpenChange={setReplayDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 gap-1.5" disabled={!canReplay || replaying}>
                <RotateCcw className="h-3.5 w-3.5" />
                {replaying ? 'Replaying…' : 'Replay dead email'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Replay dead email</AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3 pt-1">
                    <p>
                      Re-queues outbox row{' '}
                      <span className="break-all font-mono text-foreground">{replayOutboxId.trim()}</span>{' '}
                      for a fresh delivery attempt.
                    </p>
                    <div className="rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">
                      <span className="text-muted-foreground">Reason: </span>
                      {replayReason.trim()}
                    </div>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => void handleReplay()}>Replay</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {replayResult && (
            <div className="border-t border-border pt-2.5">
              <p className="pb-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                Last replay result
              </p>
              <div className="divide-y divide-border">
                <Field label="replayed"><Mono>{String(replayResult.replayed)}</Mono></Field>
                <Field label="queued at utc"><Mono>{replayResult.queuedAtUtc}</Mono></Field>
              </div>
            </div>
          )}
        </div>
      </Panel>
    </div>
  );
}
