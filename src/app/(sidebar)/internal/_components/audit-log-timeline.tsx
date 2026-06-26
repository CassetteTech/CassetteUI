'use client';

import { ArrowRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { InternalAccountTypeAuditEntry } from '@/types';
import { Panel } from './kit';
import { normalizeAccountType, formatDate } from './internal-utils';

interface AuditLogTimelineProps {
  entries: InternalAccountTypeAuditEntry[];
  isLoading: boolean;
}

export function AuditLogTimeline({ entries, isLoading }: AuditLogTimelineProps) {
  return (
    <Panel title="Audit Log">
      {isLoading ? (
        <div className="space-y-2 p-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : entries.length ? (
        <ScrollArea className="max-h-[320px]">
          <ul className="divide-y divide-border/60">
            {entries.map((entry) => {
              const before = normalizeAccountType(entry.beforeAccountType as string | number);
              const after = normalizeAccountType(entry.afterAccountType as string | number);
              const isUpgrade = after === 'Verified' || after === 'CassetteTeam';
              return (
                <li key={entry.id} className="px-3 py-2">
                  <div className="flex items-center gap-1.5 font-mono text-[11px]">
                    <span className="text-muted-foreground">{before}</span>
                    <ArrowRight className={`h-3 w-3 ${isUpgrade ? 'text-[hsl(var(--success-text))]' : 'text-[hsl(var(--warning-text))]'}`} />
                    <span className="font-medium text-foreground">{after}</span>
                  </div>
                  {entry.reason && <p className="mt-0.5 text-xs text-foreground">{entry.reason}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {entry.actorUsername || entry.actorEmail || entry.actorUserId} · {formatDate(entry.createdAt)}
                  </p>
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      ) : (
        <p className="px-3 py-8 text-center text-xs text-muted-foreground">No audit history.</p>
      )}
    </Panel>
  );
}
