'use client';

/** The one-tap confirmation for a Follow or Join that arrived in the URL from an in-app browser.
    A link can be shared, so the URL alone never acts for a signed-in fan. */

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
  /** The page control that takes keyboard focus when the dialog closes; the dialog has no trigger to return to. */
  returnFocusSelector: string;
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) onDismiss(); }}>
      <AlertDialogContent
        data-testid="carried-action-confirmation"
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          // The phone and desktop layouts each render the control; focus the visible one.
          const target = Array.from(document.querySelectorAll<HTMLElement>(returnFocusSelector))
            .find((element) => element.getClientRects().length > 0);
          target?.focus();
        }}
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
