import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

test('converts a pasted add-music link with the drafted description and saves it to the profile', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/studio/music/new');
  await page
    .locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    )
    .fill('Locked in for every late-night drive.');

  await dispatchPaste(
    page,
    'add-music-input',
    fixtureConvertTemplates.addMusicTrack.originalUrl,
  );

  await expect(
    page.locator('p:visible').filter({ hasText: 'Spotify link pasted' }),
  ).toBeVisible();
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  const postMain = page.getByRole('main').last();
  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(postMain).toContainText('Blue Monday');

  await page.goto('/profile/miagroove?tab=tracks');
  await expect(page.getByRole('main').last()).toContainText('Blue Monday');
  await expect(page.getByRole('main').last()).toContainText(
    'Locked in for every late-night drive.',
  );
});

test('commits a typed add-music link on Enter so it can be submitted', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/studio/music/new');
  const input = page.locator('[data-testid="add-music-input"]:visible');
  await input.pressSequentially(fixtureConvertTemplates.addMusicTrack.originalUrl);
  await input.press('Enter');

  await expect(
    page.locator('p:visible').filter({ hasText: 'Spotify link pasted' }),
  ).toBeVisible();
  await expect(
    page.locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    ),
  ).toBeVisible();

  await page
    .locator(
      'textarea[placeholder="Tell us how you feel about the music"]:visible',
    )
    .fill('Typed by hand and still ready to post.');
  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Blue Monday');
  await expect(page.getByRole('main').last()).toContainText('Typed by hand and still ready to post.');
});

test('shows validation feedback for unsupported pasted links without leaving add-music', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  await page.goto('/studio/music/new');
  await dispatchPaste(page, 'add-music-input', 'https://www.youtube.com/watch?v=not-supported');

  await expect(page).toHaveURL('/studio/music/new');
  await expect(
    page.locator('p:visible').filter({
      hasText:
        "This music service isn't supported yet. Please use a link from Spotify, Apple Music, or Deezer.",
    }),
  ).toBeVisible();
});

test('preserves the drafted post after a temporary conversion failure and retries once', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });

  let conversionAttempts = 0;
  await page.route('**/api/v1/convert', async (route) => {
    conversionAttempts += 1;
    if (conversionAttempts === 1) {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'upstream unavailable',
          error_code: 'UPSTREAM_UNAVAILABLE',
        }),
      });
      return;
    }

    await route.fallback();
  });

  await page.goto('/studio/music/new');
  const description = page.locator(
    'textarea[placeholder="Tell us how you feel about the music"]:visible',
  );
  await description.fill('Keep this thought through a retry.');
  await dispatchPaste(
    page,
    'add-music-input',
    fixtureConvertTemplates.addMusicTrack.originalUrl,
  );

  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL('/studio/music/new');
  await expect(
    page.locator('p:visible').filter({
      hasText: 'Cassette is temporarily unavailable. Please try again.',
    }),
  ).toBeVisible();
  await expect(description).toHaveValue('Keep this thought through a retry.');
  await expect(page.locator('p:visible').filter({ hasText: 'Spotify link pasted' })).toBeVisible();

  await page.locator('[data-testid="add-music-submit"]:not([disabled])').last().click();

  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Keep this thought through a retry.');
  expect(conversionAttempts).toBe(2);
});

test('centers pending music on the details card and keeps it there while it converts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });
  let releaseConversion = () => {};
  const conversionHeld = new Promise<void>((resolve) => {
    releaseConversion = resolve;
  });
  await page.route('**/api/v1/convert', async (route) => {
    await conversionHeld;
    await route.fallback();
  });

  await page.goto('/studio/music/new');
  await dispatchPaste(page, 'add-music-input', fixtureConvertTemplates.addMusicTrack.originalUrl);

  const pendingCard = page.locator('[data-search-region] .card-ink').filter({ visible: true });
  const detailsCard = page.locator('.card-quiet').filter({ visible: true }).filter({ has: page.locator('textarea') });
  const centerOffset = async () => {
    const [card, details] = await Promise.all([pendingCard.boundingBox(), detailsCard.boundingBox()]);
    return Math.abs(card!.y + card!.height / 2 - (details!.y + details!.height / 2));
  };
  await expect.poll(centerOffset).toBeLessThan(2);

  // The heading sets itself above the card and the card stays where it was. The form hands
  // the conversion to the post page after a short beat, so it is measured in the same
  // browser task as the click.
  const converting = await page.evaluate(async () => {
    const shown = (element: Element) => element.getClientRects().length > 0;
    // React applies a click within microtasks; the handoff timer runs only in a later task.
    const settle = async () => {
      for (let turn = 0; turn < 5; turn += 1) await Promise.resolve();
    };
    const center = (element: Element | undefined) => {
      const box = element?.getBoundingClientRect();
      return box ? box.top + box.height / 2 : Number.NaN;
    };
    Array.from(document.querySelectorAll<HTMLButtonElement>('[data-testid="add-music-submit"]'))
      .find((button) => shown(button) && !button.disabled)
      ?.click();
    await settle();
    const card = Array.from(document.querySelectorAll('[data-search-region] .card-ink')).find(shown);
    const details = Array.from(document.querySelectorAll('.card-quiet')).find(
      (element) => shown(element) && element.querySelector('textarea'),
    );
    return {
      heading: Array.from(document.querySelectorAll('p')).some(
        (element) => shown(element) && element.textContent === 'Converting Spotify track',
      ),
      offset: Math.abs(center(card) - center(details)),
    };
  });
  expect(converting.heading).toBe(true);
  expect(converting.offset).toBeLessThan(2);

  releaseConversion();
  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
});

test('moves to the post skeleton right after Add to profile and follows the same conversion', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });
  let releaseConversion = () => {};
  const conversionHeld = new Promise<void>((resolve) => {
    releaseConversion = resolve;
  });
  let conversionRequests = 0;
  await page.route('**/api/v1/convert', async (route) => {
    conversionRequests += 1;
    await conversionHeld;
    await route.fallback();
  });
  const { title, artist } = fixtureConvertTemplates.addMusicTrack;
  await page.route('**/api/v1/convert/jobs/by-key/**', (route) =>
    route.fulfill({
      status: 202,
      json: {
        success: false,
        status: 'processing',
        jobId: 'job_add_music',
        stage: 'matching_platforms',
        partialResult: { source: { elementType: 'track', title, artists: [artist], platform: 'spotify' } },
      },
    }),
  );

  await page.goto('/studio/music/new');
  await dispatchPaste(page, 'add-music-input', fixtureConvertTemplates.addMusicTrack.originalUrl);
  await expect(page.locator('p:visible').filter({ hasText: 'Spotify link pasted' })).toBeVisible();
  await page.locator('[data-testid="add-music-submit"]:not([disabled]):visible').click();

  // The skeleton names the music while the conversion is still running.
  await expect(page).toHaveURL(/\/post\?url=/);
  await expect(page.getByRole('heading', { name: title }).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(artist, { exact: true }).filter({ visible: true })).toBeVisible();

  releaseConversion();
  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText(title);
  expect(conversionRequests).toBe(1);
});

test('brings a conversion that fails after the handoff back to the form as it was left', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
  });
  let releaseConversion = () => {};
  const conversionHeld = new Promise<void>((resolve) => {
    releaseConversion = resolve;
  });
  let conversionAttempts = 0;
  await page.route('**/api/v1/convert', async (route) => {
    conversionAttempts += 1;
    if (conversionAttempts > 1) {
      await route.fallback();
      return;
    }
    await conversionHeld;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'upstream unavailable', error_code: 'UPSTREAM_UNAVAILABLE' }),
    });
  });
  const { title, artist } = fixtureConvertTemplates.addMusicTrack;
  await page.route('**/api/v1/convert/jobs/by-key/**', (route) =>
    route.fulfill({
      status: 202,
      json: {
        success: false,
        status: 'processing',
        jobId: 'job_add_music',
        stage: 'matching_platforms',
        partialResult: { source: { elementType: 'track', title, artists: [artist], platform: 'spotify' } },
      },
    }),
  );

  await page.goto('/studio/music/new');
  const description = page.locator('textarea[placeholder="Tell us how you feel about the music"]:visible');
  await description.fill('Keep this thought through a late failure.');
  await page.getByRole('radio', { name: 'Private' }).click();
  await dispatchPaste(page, 'add-music-input', fixtureConvertTemplates.addMusicTrack.originalUrl);
  await page.locator('[data-testid="add-music-submit"]:not([disabled]):visible').click();
  await expect(page).toHaveURL(/\/post\?url=/);

  releaseConversion();
  await expect(page).toHaveURL('/studio/music/new');
  await expect(page.getByRole('alert').filter({ hasText: 'Cassette is temporarily unavailable. Please try again.' })).toBeVisible();
  await expect(description).toHaveValue('Keep this thought through a late failure.');
  await expect(page.getByRole('radio', { name: 'Private' })).toBeChecked();
  await expect(page.locator('p:visible').filter({ hasText: 'Spotify link pasted' })).toBeVisible();

  await page.locator('[data-testid="add-music-submit"]:not([disabled]):visible').click();
  await expect(page).toHaveURL(/\/post\/post-created-track(\?.*)?$/);
  await expect(page.getByRole('main').last()).toContainText('Keep this thought through a late failure.');
  expect(conversionAttempts).toBe(2);
});
