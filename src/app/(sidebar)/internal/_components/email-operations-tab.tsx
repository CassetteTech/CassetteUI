'use client';

import { useCallback, useEffect, useState } from 'react';
import { ShieldCheck, Truck } from 'lucide-react';
import type { InternalEmailOperationsConfig, InternalEmailOperationsSnapshot } from '@/types';
import { apiService } from '@/services/api';
import { ErrorState } from './error-state';
import { formatDate } from './internal-utils';
import { EmailTemplatesPanel } from './email-templates-panel';
import { EmailControlledOps } from './email-controlled-ops';
import { SectionHeader, Panel, StatStrip, Stat, StatusPill, Field, RefreshButton, ErrorBanner } from './kit';

function formatAgeSeconds(value?: number | null) {
  if (value == null) return '—';
  const s = Math.floor(value);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function GatePill({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return <StatusPill tone={on ? 'success' : 'warning'} label={on ? onLabel : offLabel} />;
}

export function EmailOperationsTab() {
  const [config, setConfig] = useState<InternalEmailOperationsConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [snapshot, setSnapshot] = useState<InternalEmailOperationsSnapshot | null>(null);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    setConfigError(null);
    try {
      setConfig(await apiService.getInternalEmailOperationsConfig());
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : 'Failed to load email configuration');
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const loadSnapshot = useCallback(async () => {
    setSnapshotLoading(true);
    setSnapshotError(null);
    try {
      setSnapshot(await apiService.getInternalEmailOperationsSnapshot());
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : 'Failed to load delivery snapshot');
    } finally {
      setSnapshotLoading(false);
    }
  }, []);

  useEffect(() => { void loadConfig(); }, [loadConfig]);
  useEffect(() => { void loadSnapshot(); }, [loadSnapshot]);

  const counts = snapshot?.statusCounts;
  const attempts = snapshot?.attempts;
  const feedback = snapshot?.recentFeedback;

  return (
    <div className="space-y-4">
      <SectionHeader section="Growth" title="Email" />

      {configError && <ErrorState message={configError} onRetry={() => void loadConfig()} />}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* ── Environment & safety gates ── */}
        <Panel
          title="Environment & Safety Gates"
          actions={<RefreshButton loading={configLoading} onClick={() => void loadConfig()} />}
        >
          {config ? (
            <div className="divide-y divide-border px-3">
              <Field label="Environment" icon={ShieldCheck}>
                <StatusPill
                  tone={config.isProduction ? 'critical' : 'info'}
                  label={config.environment}
                />
              </Field>
              <Field label="Email delivery">
                <GatePill on={config.emailEnabled} onLabel="Enabled" offLabel="Disabled" />
              </Field>
              <Field label="Product updates">
                <GatePill on={config.productUpdatesEnabled} onLabel="Enabled" offLabel="Disabled" />
              </Field>
              <Field label="Transport" icon={Truck}>
                <span className="font-mono text-[11px] uppercase">{config.transport}</span>
              </Field>
              <Field label="Allowlist">
                {config.allowedRecipientCount > 0 ? (
                  <StatusPill
                    tone="success"
                    label={`${config.allowedRecipientCount} recipient${config.allowedRecipientCount === 1 ? '' : 's'} configured`}
                  />
                ) : (
                  <StatusPill tone="warning" label="Empty" />
                )}
              </Field>
              <Field label="Postal footer">
                <GatePill on={config.postalAddressConfigured} onLabel="Configured" offLabel="Not configured" />
              </Field>
              <Field label="Test send">
                <GatePill on={config.testSendAvailable} onLabel="Available" offLabel="Unavailable" />
              </Field>
              <Field label="Controlled sweep">
                <GatePill on={config.controlledSweepAvailable} onLabel="Available" offLabel="Unavailable" />
              </Field>
              <Field label="Schedules & alarms">
                <span className="text-xs text-muted-foreground">
                  Not shown here — inspect EventBridge schedules, queue depth, and alarms in AWS per the email operations runbook.
                </span>
              </Field>
            </div>
          ) : (
            <p className="px-3 py-4 text-xs text-muted-foreground">
              {configLoading ? 'Loading configuration…' : 'Configuration unavailable.'}
            </p>
          )}
        </Panel>

        {/* ── Delivery health ── */}
        <Panel
          title="Delivery Health"
          actions={<RefreshButton loading={snapshotLoading} onClick={() => void loadSnapshot()} />}
        >
          {snapshotError && <ErrorBanner message={snapshotError} onRetry={() => void loadSnapshot()} />}
          <StatStrip className="border-b border-border">
            <Stat label="Pending" value={counts?.pending ?? 0} tone={counts?.pending ? 'info' : 'neutral'} />
            <Stat label="Processing" value={counts?.processing ?? 0} tone={counts?.processing ? 'warning' : 'neutral'} />
            <Stat label="Sent" value={counts?.sent ?? 0} tone="success" />
            <Stat label="Failed" value={counts?.failed ?? 0} tone={counts?.failed ? 'critical' : 'neutral'} />
            <Stat label="Dead" value={counts?.dead ?? 0} tone={counts?.dead ? 'critical' : 'neutral'} />
            <Stat label="Skipped" value={counts?.skipped ?? 0} />
          </StatStrip>
          <div className="divide-y divide-border px-3">
            <Field label="Oldest pending">{formatAgeSeconds(snapshot?.oldestPendingAgeSeconds)}</Field>
            <Field label="Oldest actionable">{formatAgeSeconds(snapshot?.oldestActionableAgeSeconds)}</Field>
            <Field label="Attempts">
              {attempts
                ? `${attempts.totalAttempts.toLocaleString()} total · max ${attempts.maximumAttempts} · avg ${attempts.averageAttempts.toFixed(1)} across ${attempts.rowsWithAttempts.toLocaleString()} rows`
                : '—'}
            </Field>
            <Field label={`Feedback (${feedback?.windowHours ?? 24}h)`}>
              {feedback
                ? `${feedback.bounces.toLocaleString()} bounces · ${feedback.complaints.toLocaleString()} complaints · ${feedback.subscriptionEvents.toLocaleString()} subscription events`
                : '—'}
            </Field>
            <Field label="Generated">{snapshot ? formatDate(snapshot.generatedAtUtc) : '—'}</Field>
          </div>
        </Panel>
      </div>

      <EmailTemplatesPanel config={config} />

      <EmailControlledOps config={config} />
    </div>
  );
}
