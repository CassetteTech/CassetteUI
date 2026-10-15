import { expect, type Page } from '@playwright/test';

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
  await expect(link).toHaveAttribute('aria-current', 'page');
}
