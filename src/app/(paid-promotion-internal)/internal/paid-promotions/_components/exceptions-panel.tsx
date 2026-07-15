import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Panel, StatusPill } from '@/app/(sidebar)/internal/_components/kit';
import type { InternalPaidPromotionException } from '@/types';
import { formatDate, formatState, statusTone } from './paid-promotion-utils';

const RESOLVABLE_EXCEPTION_KINDS = new Set([
  'dispute_opened',
  'orphan_session',
  'stuck_pending',
]);

export function ExceptionsPanel({
  exceptions,
  onResolve,
}: {
  exceptions: InternalPaidPromotionException[];
  onResolve: (exception: InternalPaidPromotionException) => void;
}) {
  return (
    <Panel title="Exceptions">
      {exceptions.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No campaign exceptions.</p>
      ) : (
        <ul className="divide-y divide-border" aria-label="Campaign exceptions">
          {exceptions.map((exception) => (
            <li key={exception.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--warning-text))]" aria-hidden="true" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{formatState(exception.kind)}</p>
                    <StatusPill tone={statusTone(exception.status)} label={formatState(exception.status)} />
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {exception.id} · opened {formatDate(exception.createdAtUtc)}
                  </p>
                  {exception.paymentId && (
                    <p className="font-mono text-[10px] text-muted-foreground">Payment {exception.paymentId}</p>
                  )}
                </div>
              </div>
              {exception.status === 'open' && RESOLVABLE_EXCEPTION_KINDS.has(exception.kind) && (
                <Button type="button" size="sm" variant="outline" onClick={() => onResolve(exception)}>
                  Verify resolution
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
