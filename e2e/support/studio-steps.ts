/** Helper for the Curator Studio dashboard: opens the URL of the view that
    hosts a section before a test interacts with its contents. The Overview,
    Membership, and Payouts views stay mounted but hidden on the other URLs, so
    this is only needed for visibility-dependent actions (fill, click,
    toBeVisible). */

import { expect, type Page } from '@playwright/test';

/** Section ids resolve to the dashboard view that hosts them. */
const viewOf = new Map([
  ['studio-setup', 'studio-membership'],
  ['studio-plan', 'studio-membership'],
  ['studio-members', 'studio-membership'],
  ['studio-pro', 'studio-billing'],
  ['studio-payouts', 'studio-billing'],
]);

export async function openStudioStep(page: Page, stepId: string) {
  const link = page.getByTestId(`${viewOf.get(stepId) ?? stepId}-trigger`);
  if ((await link.getAttribute('aria-current')) !== 'page') {
    await link.click();
  }
  // The link navigates; wait until its view shows, so the next locator cannot match the view being left.
  await expect(link).toHaveAttribute('aria-current', 'page');
}
