import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

test.describe('home conversion funnel', () => {
  test('auto-converts a supported pasted link', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', fixtureConvertTemplates.homeTrack.originalUrl);

    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    await expect(page.getByText('Midnight City')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apple Music' })).toBeVisible();
  });

  test('shows validation for unsupported pasted links', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', 'https://www.youtube.com/watch?v=not-supported');

    await expect(page).toHaveURL('/');
    await expect(page.getByText("This music service isn't supported yet.")).toBeVisible();
  });

  for (const viewport of [{ width: 1280, height: 800 }, { width: 390, height: 844 }]) {
    test(`shows keyboard focus and an announced, linked error at ${viewport.width}px`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await mockCassetteApp(page);

      await page.goto('/');
      const input = page.getByTestId('home-search-input');
      const bar = input.locator('..');
      await expect(bar).toHaveCSS('box-shadow', 'none');
      await input.focus();
      await expect(bar).not.toHaveCSS('box-shadow', 'none');

      await dispatchPaste(page, 'home-search-input', 'https://www.youtube.com/watch?v=not-supported');
      const error = page.getByRole('alert').filter({ hasText: "This music service isn't supported yet." });
      await expect(error).toBeVisible();
      await expect(input).toHaveAttribute('aria-invalid', 'true');
      await expect(input).toHaveAttribute('aria-describedby', (await error.getAttribute('id'))!);
    });
  }

  test('shows validation for unknown http music links', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', 'https://example.com/music/not-supported');

    await expect(page).toHaveURL('/');
    await expect(page.getByText("This music service isn't supported yet.")).toBeVisible();
  });

  test('preserves the source route when landing on a converted post', async ({ page }) => {
    await mockCassetteApp(page);

    const from = '/profile/miagroove?tab=tracks';
    await page.goto(
      `/post?url=${encodeURIComponent(fixtureConvertTemplates.homeTrack.originalUrl)}&from=${encodeURIComponent(from)}`,
    );

    await expect(page).toHaveURL(
      `/post/post-home-converted?from=${encodeURIComponent(from)}`,
    );
    await expect(page.getByText('Midnight City')).toBeVisible();
  });

  test('advances the conversion steps while the response is pending', async ({ page }) => {
    await mockCassetteApp(page);
    let releaseConversion = () => {};
    const conversionHeld = new Promise<void>((resolve) => {
      releaseConversion = resolve;
    });
    await page.route('**/api/v1/convert', async (route) => {
      await conversionHeld;
      await route.fallback();
    });

    await page.goto(`/post?url=${encodeURIComponent(fixtureConvertTemplates.homeTrack.originalUrl)}`);

    // The skeleton renders both layouts and CSS shows the one for the viewport.
    await expect(page.getByText('Matching streaming services').filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Building your smart link').filter({ visible: true })).toBeVisible();
    releaseConversion();
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });
});
