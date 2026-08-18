/** Helper for the Curator Studio step accordion: expands a step before a test
    interacts with its contents. Collapsed steps stay mounted, so this is only
    needed for visibility-dependent actions (fill, click, toBeVisible). */

import type { Page } from '@playwright/test';

export async function openStudioStep(page: Page, stepId: string) {
  // Wait for the page to finish choosing its default-open step, so a manual
  // toggle cannot race the initial auto-open.
  await page.locator('[data-studio-steps-ready="true"]').waitFor();
  const trigger = page.getByTestId(`${stepId}-trigger`);
  if ((await trigger.getAttribute('aria-expanded')) === 'false') {
    await trigger.click();
  }
}
