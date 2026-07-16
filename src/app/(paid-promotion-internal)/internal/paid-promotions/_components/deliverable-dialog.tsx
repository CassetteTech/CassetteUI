'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  internalPaidPromotionsService,
  isPaidPromotionDeliverablePostId,
  PAID_PROMOTION_DELIVERABLE_CHANNELS,
} from '@/services/internal-paid-promotions';
import type {
  InternalPaidPromotionDeliverable,
  InternalPaidPromotionDeliverableInput,
  PaidPromotionDeliverableStatus,
} from '@/types';
import { errorMessage, formatState } from './paid-promotion-utils';

interface DeliverableDialogProps {
  campaignId: string;
  deliverable: InternalPaidPromotionDeliverable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (message: string) => Promise<void>;
}

const selectClassName =
  'h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50';

const NEXT_STATUSES: Record<PaidPromotionDeliverableStatus, PaidPromotionDeliverableStatus[]> = {
  planned: ['planned', 'scheduled', 'failed'],
  scheduled: ['scheduled', 'published', 'failed'],
  published: ['published', 'verified', 'failed'],
  verified: ['verified'],
  failed: ['failed'],
  removed: ['removed'],
};

function toLocalDateTime(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toUtcDateTime(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

export function DeliverableDialog({
  campaignId,
  deliverable,
  open,
  onOpenChange,
  onSaved,
}: DeliverableDialogProps) {
  const [channel, setChannel] = useState('instagram');
  const [status, setStatus] = useState<PaidPromotionDeliverableStatus>('planned');
  const [postId, setPostId] = useState('');
  const [plannedAt, setPlannedAt] = useState('');
  const [publishedAt, setPublishedAt] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setChannel(deliverable?.channel ?? 'instagram');
    setStatus(deliverable?.status === 'removed' ? 'planned' : deliverable?.status ?? 'planned');
    setPostId(deliverable?.postId ?? '');
    setPlannedAt(toLocalDateTime(deliverable?.plannedAtUtc ?? null));
    setPublishedAt(toLocalDateTime(deliverable?.publishedAtUtc ?? null));
    setEvidenceUrl(deliverable?.evidenceUrl ?? '');
    setNotes(deliverable?.notes ?? '');
    setFormError(null);
  }, [deliverable, open]);

  const statusOptions = useMemo(
    () => deliverable ? NEXT_STATUSES[deliverable.status].filter((value) => value !== 'removed') :
      (['planned', 'scheduled', 'published', 'verified', 'failed'] as const),
    [deliverable]
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    const trimmedEvidenceUrl = evidenceUrl.trim();
    const trimmedPostId = postId.trim();
    if (trimmedPostId && !isPaidPromotionDeliverablePostId(trimmedPostId)) {
      setFormError('Post ID must use the canonical Cassette post format.');
      return;
    }
    if ((status === 'published' || status === 'verified') && (!publishedAt || !trimmedEvidenceUrl)) {
      setFormError('Published and verified deliverables require a publication time and evidence URL.');
      return;
    }

    const input: InternalPaidPromotionDeliverableInput = {
      postId: trimmedPostId || null,
      channel: channel as InternalPaidPromotionDeliverableInput['channel'],
      status,
      plannedAtUtc: toUtcDateTime(plannedAt),
      publishedAtUtc: toUtcDateTime(publishedAt),
      evidenceUrl: trimmedEvidenceUrl || undefined,
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (deliverable) {
        await internalPaidPromotionsService.updateDeliverable(campaignId, deliverable.id, input);
      } else {
        await internalPaidPromotionsService.createDeliverable(campaignId, input);
      }
      onOpenChange(false);
      await onSaved(deliverable ? 'Deliverable updated from server truth.' : 'Deliverable created from server truth.');
    } catch (nextError) {
      setFormError(errorMessage(nextError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && saving) return;
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[90svh] overflow-y-auto">
        <form className="space-y-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{deliverable ? 'Edit deliverable' : 'Add deliverable'}</DialogTitle>
            <DialogDescription>
              Record the planned channel and advance evidence through its verified lifecycle.
            </DialogDescription>
          </DialogHeader>

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="deliverable-channel">Channel</Label>
              <select
                id="deliverable-channel"
                aria-label="Deliverable channel"
                className={selectClassName}
                value={channel}
                onChange={(event) => setChannel(event.target.value)}
              >
                {PAID_PROMOTION_DELIVERABLE_CHANNELS.map((value) => (
                  <option key={value} value={value}>{formatState(value)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deliverable-status">Status</Label>
              <select
                id="deliverable-status"
                aria-label="Deliverable status"
                className={selectClassName}
                value={status}
                onChange={(event) => setStatus(event.target.value as PaidPromotionDeliverableStatus)}
              >
                {statusOptions.map((value) => (
                  <option key={value} value={value}>{formatState(value)}</option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deliverable-planned-at">Planned time</Label>
              <Input
                id="deliverable-planned-at"
                type="datetime-local"
                value={plannedAt}
                onChange={(event) => setPlannedAt(event.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="deliverable-published-at">Published time</Label>
              <Input
                id="deliverable-published-at"
                type="datetime-local"
                value={publishedAt}
                onChange={(event) => setPublishedAt(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deliverable-post-id">Canonical post ID</Label>
            <Input
              id="deliverable-post-id"
              aria-describedby="deliverable-post-id-description"
              autoComplete="off"
              maxLength={31}
              pattern="p_[0-9]{14}_[0-9a-z]{14}"
              placeholder="p_YYYYMMDDHHmmss_…"
              spellCheck={false}
              value={postId}
              onChange={(event) => setPostId(event.target.value)}
            />
            <p id="deliverable-post-id-description" className="text-xs text-muted-foreground">
              Optional. Bridge verifies that this is the canonical track post for the campaign subject.
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="deliverable-evidence-url">Evidence URL</Label>
            <Input
              id="deliverable-evidence-url"
              type="url"
              maxLength={2048}
              placeholder="https://…"
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="deliverable-notes">Internal notes</Label>
            <Textarea
              id="deliverable-notes"
              maxLength={2000}
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <DialogFooter className="gap-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={saving}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save deliverable'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
