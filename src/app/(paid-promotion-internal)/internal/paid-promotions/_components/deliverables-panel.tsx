import { ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Panel, StatusPill } from '@/app/(sidebar)/internal/_components/kit';
import type { InternalPaidPromotionDeliverable } from '@/types';
import { formatDate, formatState, statusTone } from './paid-promotion-utils';

interface DeliverablesPanelProps {
  deliverables: InternalPaidPromotionDeliverable[];
  canMutate: boolean;
  onAdd: () => void;
  onEdit: (deliverable: InternalPaidPromotionDeliverable) => void;
  onRemove: (deliverable: InternalPaidPromotionDeliverable) => void;
}

export function DeliverablesPanel({
  deliverables,
  canMutate,
  onAdd,
  onEdit,
  onRemove,
}: DeliverablesPanelProps) {
  return (
    <Panel
      title="Deliverables"
      className="overflow-hidden"
      actions={(
        <Button type="button" size="sm" variant="outline" disabled={!canMutate} onClick={onAdd}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      )}
    >
      {deliverables.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No deliverables recorded.</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Table>
              <TableCaption className="sr-only">Campaign deliverables</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Planned</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Evidence</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliverables.map((deliverable) => {
                  const mutable = canMutate && deliverable.status !== 'removed';
                  return (
                    <TableRow key={deliverable.id}>
                      <TableCell className="font-medium">{formatState(deliverable.channel)}</TableCell>
                      <TableCell>
                        <StatusPill tone={statusTone(deliverable.status)} label={formatState(deliverable.status)} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(deliverable.plannedAtUtc)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{formatDate(deliverable.publishedAtUtc)}</TableCell>
                      <TableCell>
                        {deliverable.evidenceUrl ? (
                          <a
                            href={deliverable.evidenceUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-sm text-xs text-domain underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            Open <ExternalLink className="h-3 w-3" aria-hidden="true" />
                          </a>
                        ) : '—'}
                      </TableCell>
                      <TableCell className="max-w-64 whitespace-normal text-xs">{deliverable.notes || '—'}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={!mutable}
                            aria-label={`Edit ${formatState(deliverable.channel)} deliverable`}
                            onClick={() => onEdit(deliverable)}
                          >
                            <Pencil aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={!mutable}
                            aria-label={`Remove ${formatState(deliverable.channel)} deliverable`}
                            onClick={() => onRemove(deliverable)}
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border md:hidden" aria-label="Campaign deliverables">
            {deliverables.map((deliverable) => {
              const mutable = canMutate && deliverable.status !== 'removed';
              return (
                <li key={deliverable.id} className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">{formatState(deliverable.channel)}</p>
                    <StatusPill tone={statusTone(deliverable.status)} label={formatState(deliverable.status)} />
                  </div>
                  <dl className="grid grid-cols-2 gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Planned</dt><dd>{formatDate(deliverable.plannedAtUtc)}</dd></div>
                    <div><dt className="text-muted-foreground">Published</dt><dd>{formatDate(deliverable.publishedAtUtc)}</dd></div>
                  </dl>
                  {deliverable.notes && <p className="break-words text-xs">{deliverable.notes}</p>}
                  <div className="flex flex-wrap gap-2">
                    {deliverable.evidenceUrl && (
                      <Button asChild size="sm" variant="outline">
                        <a href={deliverable.evidenceUrl} target="_blank" rel="noreferrer">
                          Evidence <ExternalLink aria-hidden="true" />
                        </a>
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="outline" disabled={!mutable} onClick={() => onEdit(deliverable)}>
                      <Pencil aria-hidden="true" /> Edit
                    </Button>
                    <Button type="button" size="sm" variant="outline" disabled={!mutable} onClick={() => onRemove(deliverable)}>
                      <Trash2 aria-hidden="true" /> Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
