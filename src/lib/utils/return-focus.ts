/** Radix returns focus on close only to a rendered `Trigger`; this focuses `target` instead. */
export function returnFocusOnClose(target: () => HTMLElement | null | undefined) {
  return (event: Event) => {
    const element = target();
    if (!element) return;
    event.preventDefault();
    element.focus();
  };
}

/** The first rendered match, for a control that the phone and desktop layouts both render. */
export function firstVisible(selector: string) {
  return Array.from(document.querySelectorAll<HTMLElement>(selector)).find((element) => element.getClientRects().length > 0);
}
