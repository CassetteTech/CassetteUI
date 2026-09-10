/** Helper for the Curator Studio dashboard: switches to the view that hosts a
    section before a test interacts with its contents. Inactive views stay
    mounted but hidden, so this is only needed for visibility-dependent actions
    (fill, click, toBeVisible). */

import type { Page } from '@playwright/test';

/** Section ids resolve to the dashboard view that hosts them. */
const viewOf = new Map([
  ['studio-profile', 'studio-overview'],
  ['studio-plan', 'studio-overview'],
  ['studio-pro', 'studio-billing'],
  ['studio-payouts', 'studio-billing'],
]);

export async function openStudioStep(page: Page, stepId: string) {
  // Wait for the page to finish choosing its default view, so a manual
  // switch cannot race the initial auto-select.
  await page.locator('[data-studio-steps-ready="true"]').waitFor();
  const trigger = page.getByTestId(`${viewOf.get(stepId) ?? stepId}-trigger`);
  if ((await trigger.getAttribute('aria-selected')) !== 'true') {
    await trigger.click();
  }
}
