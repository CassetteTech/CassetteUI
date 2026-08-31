'use client';

import { useCallback, useEffect, useState } from 'react';
import { Eye, Mail, Send } from 'lucide-react';
import { toast } from 'sonner';
import type {
  InternalEmailOperationsConfig,
  InternalEmailOutboxFollowStatus,
  InternalEmailTemplatePreview,
  InternalEmailTemplateSummary,
} from '@/types';
import { apiService } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ErrorState } from './error-state';
import { formatDate } from './internal-utils';
import { Panel, StatusPill, DataTable, Field, Mono, RefreshButton, type Column, type Tone } from './kit';

// Bridge retries failed rows with backoff until they go dead, so failed is not terminal.
const TERMINAL_OUTBOX_STATUSES: Record<string, true> = {
  sent: true,
  skipped: true,
  dead: true,
};
const OUTBOX_POLL_INTERVAL_MS = 3000;
const OUTBOX_POLL_MAX_ATTEMPTS = 40; // ~2 minutes at 3s intervals

function emailOutboxStatusTone(status: string): Tone {
  const normalized = status.toLowerCase();
  if (normalized === 'sent') return 'success';
  if (normalized === 'pending') return 'info';
  if (normalized === 'processing') return 'warning';
  if (normalized === 'failed' || normalized === 'dead') return 'critical';
  return 'neutral';
}

function OutboxStatusFields({ status }: { status: InternalEmailOutboxFollowStatus }) {
  return (
    <div className="divide-y divide-border px-3">
      <Field label="Outbox ID"><Mono>{status.outboxId}</Mono></Field>
      <Field label="Event"><Mono>{status.eventId}</Mono></Field>
      <Field label="Status">
        <StatusPill tone={emailOutboxStatusTone(status.status)} label={status.status} />
      </Field>
      <Field label="Attempts">{status.attemptCount}</Field>
      <Field label="Created">{formatDate(status.createdAtUtc)}</Field>
      <Field label="Last attempt">{formatDate(status.lastAttemptAtUtc)}</Field>
      <Field label="Completed">{formatDate(status.completedAtUtc)}</Field>
      {status.lastErrorSummary && (
        <Field label="Last error">
          <span className="text-destructive">{status.lastErrorSummary}</span>
        </Field>
      )}
    </div>
  );
}

export function EmailTemplatesPanel({ config }: { config: InternalEmailOperationsConfig | null }) {
  const [templates, setTemplates] = useState<InternalEmailTemplateSummary[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // Preview dialog
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [preview, setPreview] = useState<InternalEmailTemplatePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<'html' | 'text'>('html');

  // Test send
  const [testSendEventId, setTestSendEventId] = useState<string | null>(null);
  const [testSendReason, setTestSendReason] = useState('');
  const [testSending, setTestSending] = useState(false);

  // Outbox follow
  const [followedOutboxId, setFollowedOutboxId] = useState<string | null>(null);
  const [outboxStatus, setOutboxStatus] = useState<InternalEmailOutboxFollowStatus | null>(null);
  const [outboxLoading, setOutboxLoading] = useState(false);
  const [pollingExhausted, setPollingExhausted] = useState(false);

  const testSendAvailable = config?.testSendAvailable ?? false;

  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    setTemplatesError(null);
    try {
      const response = await apiService.getInternalEmailTemplates();
      setTemplates(response.templates);
    } catch (error) {
      setTemplatesError(error instanceof Error ? error.message : 'Failed to load email templates');
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  useEffect(() => { void loadTemplates(); }, [loadTemplates]);

  // ─── Preview ──────────────────────────────────────────────────────
  const openPreview = async (eventId: string) => {
    setPreviewEventId(eventId);
    setPreview(null);
    setPreviewError(null);
    setPreviewMode('html');
    setPreviewLoading(true);
    try {
      setPreview(await apiService.getInternalEmailTemplatePreview(eventId));
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : 'Failed to load template preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  // ─── Outbox follow ────────────────────────────────────────────────
  const refreshOutboxStatus = useCallback(async (outboxId: string, options?: { silent?: boolean }) => {
    setOutboxLoading(true);
    try {
      const status = await apiService.getInternalEmailOutboxStatus(outboxId);
      setOutboxStatus(status);
      return status;
    } catch (error) {
      if (!options?.silent) {
        toast.error(error instanceof Error ? error.message : 'Failed to load outbox status');
      }
      return null;
    } finally {
      setOutboxLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!followedOutboxId) return;
    let attempts = 0;
    setPollingExhausted(false);
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      if (cancelled) return;
      attempts += 1;
      const status = await refreshOutboxStatus(followedOutboxId, { silent: true });
      if (cancelled) return;
      if (status && TERMINAL_OUTBOX_STATUSES[status.status.toLowerCase()]) return;
      if (attempts >= OUTBOX_POLL_MAX_ATTEMPTS) {
        setPollingExhausted(true);
        return;
      }
      timer = window.setTimeout(() => { void poll(); }, OUTBOX_POLL_INTERVAL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [followedOutboxId, refreshOutboxStatus]);

  // ─── Test send ────────────────────────────────────────────────────
  const handleConfirmTestSend = async () => {
    if (!testSendEventId || !testSendReason.trim()) return;
    setTestSending(true);
    try {
      const response = await apiService.sendInternalEmailTestSend(testSendEventId, {
        reason: testSendReason.trim(),
      });
      toast.success(`Test send queued (outbox ${response.outboxId}).`);
      setOutboxStatus(null);
      setFollowedOutboxId(response.outboxId);
      setTestSendEventId(null);
      setTestSendReason('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to queue test send');
    } finally {
      setTestSending(false);
    }
  };

  const followedTerminal =
    outboxStatus != null && Boolean(TERMINAL_OUTBOX_STATUSES[outboxStatus.status.toLowerCase()]);

  const rowActions = (row: InternalEmailTemplateSummary) => (
    <>
      <Button
        variant="outline"
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={() => void openPreview(row.eventId)}
      >
        <Eye className="h-3 w-3" />
        Preview
      </Button>
      {testSendAvailable && (
        <Button
          variant="outline"
          size="sm"
          className="h-7 gap-1 text-xs"
          disabled={testSending}
          onClick={() => {
            setTestSendReason('');
            setTestSendEventId(row.eventId);
          }}
        >
          <Send className="h-3 w-3" />
          Send test
        </Button>
      )}
    </>
  );

  const columns: Column<InternalEmailTemplateSummary>[] = [
    {
      key: 'name',
      header: 'Template',
      cell: (row) => <span className="font-medium text-foreground">{row.name}</span>,
    },
    {
      key: 'eventId',
      header: 'Event',
      className: 'hidden sm:table-cell',
      cell: (row) => <Mono>{row.eventId}</Mono>,
    },
    {
      key: 'category',
      header: 'Category',
      className: 'hidden md:table-cell w-[140px]',
      cell: (row) => <span className="font-mono text-[11px] text-muted-foreground">{row.category}</span>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      className: 'w-[210px]',
      cell: (row) => (
        <div className="flex items-center justify-end gap-1.5">{rowActions(row)}</div>
      ),
    },
  ];

  const testSendTemplate = templates.find((t) => t.eventId === testSendEventId);

  return (
    <div className="space-y-4">
      <Panel title="Templates">
        {templatesError ? (
          <div className="p-3">
            <ErrorState message={templatesError} onRetry={() => void loadTemplates()} />
          </div>
        ) : (
          <DataTable<InternalEmailTemplateSummary>
            columns={columns}
            rows={templates}
            rowKey={(row) => row.eventId}
            isLoading={templatesLoading}
            skeletonRows={6}
            empty={{ icon: Mail, title: 'No templates', description: 'The template registry returned no entries.' }}
            renderMobile={(row) => (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">{row.name}</span>
                  <span className="font-mono text-[10px] text-muted-foreground">{row.category}</span>
                </div>
                <Mono>{row.eventId}</Mono>
                <div className="flex items-center gap-1.5 pt-1">{rowActions(row)}</div>
              </div>
            )}
          />
        )}
        {!testSendAvailable && !templatesError && (
          <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            Test sends are unavailable here: they require a non-production environment with email
            delivery enabled and a configured allowlist.
          </p>
        )}
      </Panel>

      {/* ── Followed test send ── */}
      {followedOutboxId && (
        <Panel
          title="Test Send Status"
          actions={
            <RefreshButton
              loading={outboxLoading}
              onClick={() => void refreshOutboxStatus(followedOutboxId)}
            />
          }
        >
          {outboxStatus ? (
            <>
              <OutboxStatusFields status={outboxStatus} />
              {!followedTerminal && (
                <p className="border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                  {pollingExhausted
                    ? 'Stopped automatic polling after 2 minutes. Use refresh to check again.'
                    : outboxStatus.status.toLowerCase() === 'failed'
                      ? 'Last attempt failed — Bridge retries with backoff until the row is sent, skipped, or dead. Still polling…'
                      : 'Polling every 3 seconds until the send reaches a terminal state…'}
                </p>
              )}
            </>
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">Loading outbox status…</p>
          )}
        </Panel>
      )}

      {/* ── Preview dialog ── */}
      <Dialog open={previewEventId != null} onOpenChange={(open) => { if (!open) setPreviewEventId(null); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">{previewEventId}</DialogTitle>
            <DialogDescription>
              Rendered with a fixed sample payload through the real template registry and layout.
            </DialogDescription>
          </DialogHeader>
          {previewLoading && <p className="py-6 text-center text-xs text-muted-foreground">Rendering preview…</p>}
          {previewError && (
            <ErrorState
              message={previewError}
              onRetry={() => { if (previewEventId) void openPreview(previewEventId); }}
            />
          )}
          {preview && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted px-2.5 py-2 text-xs">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Subject </span>
                <span className="font-medium text-foreground">{preview.subject}</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant={previewMode === 'html' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPreviewMode('html')}
                >
                  HTML
                </Button>
                <Button
                  variant={previewMode === 'text' ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setPreviewMode('text')}
                >
                  Plain text
                </Button>
              </div>
              {previewMode === 'html' ? (
                <iframe
                  title={`Email preview for ${preview.eventId}`}
                  srcDoc={preview.htmlBody}
                  sandbox=""
                  className="h-[50vh] w-full rounded-md border border-border bg-background"
                />
              ) : (
                <pre className="max-h-[50vh] overflow-auto whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-3 font-mono text-[11px] text-foreground">
                  {preview.textBody}
                </pre>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Test-send confirmation ── */}
      <AlertDialog
        open={testSendEventId != null}
        onOpenChange={(open) => { if (!open) setTestSendEventId(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send test email</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <p>
                  This sends a real{' '}
                  <span className="font-mono text-foreground">{testSendTemplate?.name ?? testSendEventId}</span>{' '}
                  email to your own allowlisted account through the normal delivery pipeline.
                </p>
                <Input
                  placeholder="Reason for this test send (required)"
                  value={testSendReason}
                  onChange={(e) => setTestSendReason(e.target.value)}
                  className="text-xs"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={testSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={!testSendReason.trim() || testSending}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmTestSend();
              }}
            >
              {testSending ? 'Sending…' : 'Send test email'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
