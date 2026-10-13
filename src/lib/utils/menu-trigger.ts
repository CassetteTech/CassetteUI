import type { MouseEvent } from 'react';

/** Keeps a double click's second press on a menu trigger. Without it, the press lands on the page
    under the opening menu and selects the nearest word. Focus stays on the trigger for the menu's
    focus return. */
export function keepSecondPressOnTrigger(event: MouseEvent<HTMLElement>) {
  if (event.detail > 1) {
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
  }
}
