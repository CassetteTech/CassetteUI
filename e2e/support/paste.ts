import type { Page } from '@playwright/test';

export async function dispatchPaste(page: Page, testId: string, text: string) {
  await page.locator(`[data-testid="${testId}"]:visible`).first().evaluate((input, value) => {
    const event = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', {
      value: {
        getData: () => value,
      },
    });
    input.dispatchEvent(event);
  }, text);
}
