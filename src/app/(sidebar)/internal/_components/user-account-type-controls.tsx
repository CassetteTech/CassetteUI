'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { accountTypeBadgeVariant, accountTypeBadgeClassName } from './internal-utils';

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
  const hasChanges = currentType !== targetType || effectiveCurrentPermission !== effectiveTargetPermission;
  const canSubmit = hasChanges && accountTypeReason.trim().length > 0 && !updatingAccountType;
  const permissionToggleDisabled = targetType !== 'CassetteTeam';

  const handleConfirm = () => {
    setDialogOpen(false);
    onApplyChanges();
  };

  return (
    <div className="space-y-3 rounded-md border p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        Internal Access Controls
      </p>
      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="internal-target-account-type">
          Target Account Type
        </label>
        <Select
          value={targetType}
          onValueChange={(v) => onTargetTypeChange(v as 'Regular' | 'Verified' | 'CassetteTeam')}
          disabled={updatingAccountType}
        >
          <SelectTrigger id="internal-target-account-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Regular">Regular</SelectItem>
            <SelectItem value="Verified">Verified</SelectItem>
            <SelectItem value="CassetteTeam">CassetteTeam</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between rounded-md border px-3 py-2">
        <div>
          <p className="text-sm font-medium">Can Assign Verified</p>
          <p className="text-xs text-muted-foreground">
            Only available for users with account type `CassetteTeam`.
          </p>
        </div>
        <Switch
          checked={effectiveTargetPermission}
          onCheckedChange={onTargetCanAssignVerifiedChange}
          disabled={permissionToggleDisabled || updatingAccountType}
          aria-label="Toggle can assign verified permission"
        />
      </div>
      <Textarea
        placeholder="Reason for this change (required)"
        value={accountTypeReason}
        onChange={(e) => onReasonChange(e.target.value)}
        rows={3}
      />
      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogTrigger asChild>
          <Button
            disabled={!canSubmit}
            variant="default"
          >
            {updatingAccountType
              ? 'Updating...'
              : 'Apply Changes'}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Internal Access Change</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant={accountTypeBadgeVariant(currentType)} className={accountTypeBadgeClassName(currentType)}>{currentType}</Badge>
                  <span className="text-muted-foreground">&rarr;</span>
                  <Badge variant={accountTypeBadgeVariant(targetType)} className={accountTypeBadgeClassName(targetType)}>{targetType}</Badge>
                </div>
                <div className="text-xs">
                  <span className="font-medium">CanAssignVerified:</span>{' '}
                  {String(effectiveCurrentPermission)} &rarr; {String(effectiveTargetPermission)}
                </div>
                <div className="rounded-md bg-muted p-2 text-xs">
                  <span className="font-medium">Reason:</span> {accountTypeReason.trim()}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
