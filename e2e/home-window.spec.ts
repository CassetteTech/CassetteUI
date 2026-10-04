import { expect, test, type Page } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

type Theme = 'light' | 'dark';
const other = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');

// The longer camera move, to dark, lasts 6.58 s of media at 1.8x.
const MOVE_MS = 3660;

// Changes the theme through next-themes, as another tab would, so rapid
// changes reach the scene without waiting on the theme menu.
const switchTheme = (page: Page, theme: string) =>
  page.evaluate((value) => window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: value })), theme);

// The scene is at rest when exactly one layer shows, it is the page theme's
// idle loop, no camera move plays, and the copy has the same theme.
const sceneState = (page: Page) =>
  page.evaluate(() => {
    const layers = [...document.querySelectorAll<HTMLElement>('[data-layer]')];
    return {
      visible: layers.filter((layer) => getComputedStyle(layer).opacity !== '0').map((layer) => layer.dataset.idle ?? `move-${layer.dataset.move}`),
      playingMoves: [...document.querySelectorAll<HTMLVideoElement>('video[data-move]')].filter((video) => !video.paused).length,
      theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light',
      scene: document.querySelector('[data-scene]')?.getAttribute('data-scene'),
    };
  });

const expectAtRest = (page: Page, theme: Theme) =>
  expect.poll(() => sceneState(page), { timeout: MOVE_MS + 5000 }).toEqual({ visible: [theme], playingMoves: 0, theme, scene: theme });

async function openWindow(page: Page, theme: Theme, width = 1440) {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.setViewportSize({ width, height: 900 });
  await mockCassetteApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
  await page.goto('/11', { waitUntil: 'domcontentloaded' });
  await expectAtRest(page, theme);
  return errors;
}

// Each scenario lists the gaps in ms between theme changes, starting from light.
const scenarios: Array<{ name: string; gaps: number[] }> = [
  { name: 'single change', gaps: [0] },
  { name: 'back after 1.5 s', gaps: [0, 1500] },
  { name: 'double change at 100 ms', gaps: [0, 100] },
  { name: 'three quick changes', gaps: [0, 100, 100] },
  { name: 'eight quick changes', gaps: [0, 100, 100, 100, 100, 100, 100, 100] },
  { name: 'back during a quick switch', gaps: [0, 1500, 150] },
  { name: 'change at the end of a move', gaps: [0, MOVE_MS - 100] },
];

for (const { name, gaps } of scenarios) {
  test(`home window scene settles after ${name}`, async ({ page }) => {
    const errors = await openWindow(page, 'light');
    let theme: Theme = 'light';
    for (const gap of gaps) {
      if (gap) await page.waitForTimeout(gap);
      theme = other(theme);
      await switchTheme(page, theme);
    }
    await expectAtRest(page, theme);
    expect(errors).toEqual([]);
  });
}

test('home window scene makes a full round trip from the theme menu', async ({ page }) => {
  const errors = await openWindow(page, 'light');
  const menu = page.getByRole('button', { name: 'Toggle theme' }).first();

  await menu.click();
  await page.getByRole('menuitem', { name: 'Dark' }).click();
  // The move plays over the paused light loop, and the copy keeps the light
  // scene until the camera reaches it.
  await expect.poll(() => sceneState(page)).toMatchObject({ visible: ['light', 'move-dark'], theme: 'dark', scene: 'light' });
  await expectAtRest(page, 'dark');

  await menu.click();
  await page.getByRole('menuitem', { name: 'Light' }).click();
  await expectAtRest(page, 'light');
  expect(errors).toEqual([]);
});

test('home window search opens in the wall and closes on Escape', async ({ page }) => {
  const errors = await openWindow(page, 'light');
  const brand = page.getByTestId('home-window-brand');
  const headline = page.locator('h1');
  const input = page.getByTestId('home-search-input');
  const results = page.getByTestId('search-results');
  const brandTop = async () => Math.round((await brand.boundingBox())!.y);
  const restTop = await brandTop();

  // The wordmark moves to the top of the column, the pitch leaves, and the
  // results open under the bar inside the wall, clear of the window.
  await input.focus();
  await expect(results).toBeVisible();
  await expect(headline).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Watch demo' })).toHaveCount(0);
  await expect.poll(brandTop).toBeLessThan(140);
  expect(restTop).toBeGreaterThan(200);
  const wall = await page.evaluate(() => innerWidth - 0.424 * Math.max(innerWidth, (innerHeight * 16) / 9));
  const panel = (await results.boundingBox())!;
  const bar = (await input.boundingBox())!;
  expect(panel.y).toBeGreaterThan(bar.y + bar.height);
  expect(panel.x + panel.width).toBeLessThanOrEqual(wall);
  await expect(input).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(results).toBeHidden();
  await expect(headline).toBeVisible();
  await expect(headline.locator('..')).not.toHaveAttribute('inert');
  await expect(page.getByRole('button', { name: 'Watch demo' })).toBeVisible();
  await expect.poll(brandTop).toBe(restTop);
  expect(errors).toEqual([]);
});

test('home window scene plays the portrait set on a phone', async ({ page }) => {
  const errors = await openWindow(page, 'light', 390);
  await expect(page.locator('video[data-move="dark"]')).toHaveAttribute('src', /\/portrait\/move-to-dark\.mp4$/);
  await switchTheme(page, 'dark');
  await expect.poll(() => sceneState(page)).toMatchObject({ visible: ['light', 'move-dark'], scene: 'light' });
  await expectAtRest(page, 'dark');
  expect(errors).toEqual([]);
});

test('home window scene follows the system theme', async ({ page }) => {
  const errors = await openWindow(page, 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await switchTheme(page, 'system');
  await expectAtRest(page, 'dark');
  expect(errors).toEqual([]);
});

test('home window scene follows reduced motion switched mid-session', async ({ page }) => {
  const errors = await openWindow(page, 'light');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await switchTheme(page, 'dark');
  await expect(page.locator('[data-scene="dark"]')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expectAtRest(page, 'dark');
  expect(errors).toEqual([]);
});

test('home window scene falls back to the stills when a clip fails to load', async ({ page }) => {
  await page.route(/move-to-dark\.mp4$/, (route) => route.fulfill({ status: 404 }));
  const errors = await openWindow(page, 'light');
  await switchTheme(page, 'dark');
  await expect.poll(() => sceneState(page)).toEqual({ visible: [], playingMoves: 0, theme: 'dark', scene: 'dark' });
  expect(errors).toEqual([]);
});

test('home window scene shows stills only under reduced motion', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page);
  await page.addInitScript(() => localStorage.setItem('theme', 'light'));
  await page.goto('/11', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-scene="light"]')).toBeVisible();

  await switchTheme(page, 'dark');
  await expect(page.locator('[data-scene="dark"]')).toBeVisible();
  const playing = await page.locator('video').evaluateAll((videos: HTMLVideoElement[]) => videos.filter((video) => !video.paused).length);
  expect(playing).toBe(0);
  await expect(page.locator('[data-layer]').first()).toBeHidden();
});
