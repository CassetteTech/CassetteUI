'use client';

import { useState } from 'react';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { cn } from '@/lib/utils';
import { StatusPill, type Tone } from './kit';

interface UserAccountTypeControlsProps {
  currentType: 'Regular' | 'Verified' | 'CassetteTeam' | 'Unknown';
  currentCanAssignVerified: boolean;
  targetType: 'Regular' | 'Verified' | 'CassetteTeam';
  onTargetTypeChange: (value: 'Regular' | 'Verified' | 'CassetteTeam') => void;
  targetCanAssignVerified: boolean;
  onTargetCanAssignVerifiedChange: (value: boolean) => void;
  accountTypeReason: string;
  onReasonChange: (reason: string) => void;
  updatingAccountType: boolean;
  onApplyChanges: () => void;
}

const TYPE_PILL: Record<string, { tone: Tone; label: string }> = {
  CassetteTeam: { tone: 'domain', label: 'Team' },
  Verified: { tone: 'info', label: 'Verified' },
  Regular: { tone: 'neutral', label: 'Regular' },
  Unknown: { tone: 'neutral', label: 'Unknown' },
};

function TypePill({ type }: { type: string }) {
  const cfg = TYPE_PILL[type] ?? TYPE_PILL.Unknown;
  return <StatusPill tone={cfg.tone} label={cfg.label} />;
}

export function UserAccountTypeControls({
  currentType,
  currentCanAssignVerified,
  targetType,
  onTargetTypeChange,
  targetCanAssignVerified,
  onTargetCanAssignVerifiedChange,
  accountTypeReason,
  onReasonChange,
  updatingAccountType,
  onApplyChanges,
}: UserAccountTypeControlsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const effectiveCurrentPermission = currentType === 'CassetteTeam' ? currentCanAssignVerified : false;
  const effectiveTargetPermission = targetType === 'CassetteTeam' ? targetCanAssignVerified : false;
  const typeChanged = currentType !== targetType;
  const permissionChanged = effectiveCurrentPermission !== effectiveTargetPermission;
  const hasChanges = typeChanged || permissionChanged;
  const reasonMissing = accountTypeReason.trim().length === 0;
  const canSubmit = hasChanges && !reasonMissing && !updatingAccountType;
  const permissionToggleDisabled = targetType !== 'CassetteTeam';

  const handleConfirm = () => {
    setDialogOpen(false);
    onApplyChanges();
  };

  const helper = !hasChanges
    ? 'No pending changes.'
    : reasonMissing
      ? 'Add a reason to apply.'
      : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          Internal Access
        </span>
        {hasChanges && <StatusPill tone="warning" label="Unsaved" />}
      </div>

      {/* Target account type */}
      <div className="space-y-1">
        <label htmlFor="internal-target-account-type" className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          Account type
        </label>
        <Select
          value={targetType}
          onValueChange={(v: string) => onTargetTypeChange(v as 'Regular' | 'Verified' | 'CassetteTeam')}
          disabled={updatingAccountType}
        >
          <SelectTrigger id="internal-target-account-type" className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="CassetteTeam">CassetteTeam</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Can assign verified — only meaningful for CassetteTeam */}
      <div className={cn('flex items-center justify-between gap-2 rounded-md border border-border px-2.5 py-1.5', permissionToggleDisabled && 'opacity-50')}>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground">Can assign verified</p>
          <p className="text-[10px] text-muted-foreground">CassetteTeam only</p>
        </div>
        <Switch
          checked={effectiveTargetPermission}
          onCheckedChange={onTargetCanAssignVerifiedChange}
          disabled={permissionToggleDisabled || updatingAccountType}
          aria-label="Toggle can assign verified permission"
        />
      </div>

      {/* Pending-change preview */}
      {hasChanges && (
        <div className="space-y-1.5 rounded-md bg-muted/40 px-2.5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Pending change</p>
          {typeChanged && (
            <div className="flex items-center gap-2 text-xs">
              <TypePill type={currentType} />
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <TypePill type={targetType} />
            </div>
          )}
          {permissionChanged && (
            <div className="flex items-center gap-2 font-mono text-[11px] text-foreground">
              <span className="text-muted-foreground">assign-verified</span>
              <span className="text-muted-foreground">{String(effectiveCurrentPermission)}</span>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{String(effectiveTargetPermission)}</span>
            </div>
          )}
        </div>
      )}

      {/* Reason */}
      <Textarea
        placeholder="Reason for this change (required)"
        value={accountTypeReason}
        onChange={(e) => onReasonChange(e.target.value)}
        rows={2}
        className="resize-none text-xs"
      />

      {/* Apply */}
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button size="sm" className="h-8 w-full" disabled={!canSubmit}>
            {updatingAccountType ? 'Updating…' : 'Apply changes'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm internal access change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-1">
                <div className="flex items-center gap-2">
                  <TypePill type={currentType} />
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                  <TypePill type={targetType} />
                </div>
                <p className="font-mono text-xs text-muted-foreground">
                  assign-verified: {String(effectiveCurrentPermission)} → {String(effectiveTargetPermission)}
                </p>
                <div className="rounded-md bg-muted px-2.5 py-2 text-xs text-foreground">
                  <span className="text-muted-foreground">Reason: </span>{accountTypeReason.trim()}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {helper && <p className="text-center text-[10px] text-muted-foreground">{helper}</p>}
    </div>
  );
}
