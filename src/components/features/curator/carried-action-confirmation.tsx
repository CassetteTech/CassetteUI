'use client';

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
import { firstVisible } from '@/lib/utils/return-focus';

export function CarriedActionConfirmation({
  open,
  onDismiss,
  onConfirm,
  title,
  description,
  confirmLabel,
  returnFocusSelector,
}: {
  open: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  returnFocusSelector: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <AlertDialogContent
        data-testid="carried-action-confirmation"
        returnFocusTo={() => firstVisible(returnFocusSelector)}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Not now</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
