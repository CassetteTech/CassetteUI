import { expect, test, type Page } from '@playwright/test';
import { mockCassetteApp } from './support/mock-cassette-app';

type Theme = 'light' | 'dark';
const other = (theme: Theme): Theme => (theme === 'dark' ? 'light' : 'dark');

// The longer camera move, to dark, lasts 6.58 s of media at 1.8x.
const MOVE_MS = 3660;

const switchTheme = (page: Page, theme: string) =>
  page.evaluate((value) => window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: value })), theme);

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

async function openWindow(page: Page, theme: Theme, viewport = { width: 1440, height: 900 }) {
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  await page.setViewportSize(viewport);
  await mockCassetteApp(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expectAtRest(page, theme);
  return errors;
}

const scenarios: Array<{ name: string; gaps: number[] }> = [
  { name: 'single change', gaps: [0] },
  { name: 'back after 1.5 s', gaps: [0, 1500] },
  { name: 'double change at 100 ms', gaps: [0, 100] },
  { name: 'three quick changes', gaps: [0, 100, 100] },
  { name: 'eight quick changes', gaps: [0, 100, 100, 100, 100, 100, 100, 100] },
  { name: 'back during a quick switch', gaps: [0, 1500, 150] },
  { name: 'change at the end of a move', gaps: [0, MOVE_MS - 100] },
];

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  for (const { name, gaps } of scenarios) {
    test(`home window scene settles after ${name} at ${viewport.width}px`, async ({ page }) => {
      const errors = await openWindow(page, 'light', viewport);
      let theme: Theme = 'light';
      for (const gap of gaps) {
        if (gap) await page.waitForTimeout(gap);
        theme = other(theme);
        await switchTheme(page, theme);
      }
      await expectAtRest(page, theme);
      await expect.poll(() => page.evaluate((value) => {
        const colour = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
        return colour('[data-theme-fill]') === colour(`[data-theme-probe="${value}"]`);
      }, theme)).toBe(true);
      expect(errors).toEqual([]);
    });
  }
}

// The theme menu changes the theme inside a document view transition, which
// the storage event used elsewhere does not.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`home window scene makes a full round trip from the theme menu at ${viewport.width}px`, async ({ page }) => {
    const errors = await openWindow(page, 'light', viewport);
    const menu = page.getByRole('button', { name: 'Toggle theme' }).first();

    await menu.click();
    await page.getByRole('menuitem', { name: 'Dark' }).click();
    await expect.poll(() => sceneState(page)).toMatchObject(viewport.width >= 1024
      ? { visible: ['light', 'move-dark'], theme: 'dark', scene: 'light' }
      : { visible: ['dark', 'light'], playingMoves: 0, theme: 'dark' });
    await expectAtRest(page, 'dark');

    await menu.click();
    await page.getByRole('menuitem', { name: 'Light' }).click();
    await expectAtRest(page, 'light');
    expect(errors).toEqual([]);
  });
}

test('home window search opens in the wall and closes on Escape', async ({ page }) => {
  const errors = await openWindow(page, 'light');
  const brand = page.getByTestId('home-window-brand');
  const headline = page.locator('h1');
  const input = page.getByTestId('home-search-input');
  const results = page.getByTestId('search-results');
  const brandTop = async () => Math.round((await brand.boundingBox())!.y);
  const restTop = await brandTop();

  await input.focus();
  await expect(results).toBeVisible();
  await expect(headline).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'See how it works' })).toHaveCount(0);
  await expect.poll(brandTop).toBeLessThan(Math.min(140, restTop - 30));
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
  await expect(page.getByRole('link', { name: 'See how it works' })).toBeVisible();
  await expect.poll(brandTop).toBe(restTop);
  expect(errors).toEqual([]);
});

test('home window scene crossfades the portrait idle loops on a phone', async ({ page }) => {
  const errors = await openWindow(page, 'light', { width: 390, height: 844 });
  await expect(page.locator('video[data-idle="light"]')).toHaveAttribute('src', /\/portrait\/idle-light\.mp4$/);
  await expect(page.locator('video[data-move]')).toHaveCount(0);
  await switchTheme(page, 'dark');
  // Early in the fade the incoming loop is translucent, the hero's fill is
  // between the two theme colours, the dark scrim is on its way in, and the
  // copy still wears the old theme.
  const early = await page.waitForFunction(() => {
    const style = (selector: string) => getComputedStyle(document.querySelector(selector)!);
    const loop = Number(style('[data-idle="dark"]').opacity);
    return loop > 0 && loop < 0.5
      ? {
          loop,
          scrim: Number(style('[data-theme-layer="dark"]').opacity),
          fill: style('[data-theme-fill]').backgroundColor,
          light: style('[data-theme-probe="light"]').backgroundColor,
          dark: style('[data-theme-probe="dark"]').backgroundColor,
          scene: document.querySelector('[data-scene]')?.getAttribute('data-scene'),
        }
      : null;
  });
  // SAFETY: waitForFunction resolves only once the predicate returned this object.
  const snapshot = (await early.jsonValue()) as { loop: number; scrim: number; fill: string; light: string; dark: string; scene: string };
  expect(snapshot.scene).toBe('light');
  expect(snapshot.scrim).toBeGreaterThan(0);
  expect(snapshot.scrim).toBeLessThan(1);
  expect(snapshot.fill).not.toBe(snapshot.light);
  expect(snapshot.fill).not.toBe(snapshot.dark);
  await expect.poll(() => sceneState(page)).toMatchObject({ visible: ['dark', 'light'], playingMoves: 0 });
  await expectAtRest(page, 'dark');
  await expect(page.locator('[data-theme-layer="dark"]').first()).toHaveCSS('opacity', '1');
  await expect.poll(() => page.evaluate(() => {
    const colour = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return colour('[data-theme-fill]') === colour('[data-theme-probe="dark"]');
  })).toBe(true);
  expect(errors).toEqual([]);
});

test('home window search opens as a full-screen sheet on a phone', async ({ page }) => {
  const errors = await openWindow(page, 'light', { width: 390, height: 844 });
  const input = page.getByTestId('home-search-input');
  const results = page.getByTestId('search-results');
  const sheet = page.getByTestId('home-search-sheet');
  const barTop = async () => Math.round((await input.boundingBox())!.y);
  // The bar's entrance is still running when the scene comes to rest.
  const entrance = page.getByTestId('home-search-entrance');
  await expect.poll(() => entrance.evaluate((node) => `${getComputedStyle(node).opacity} ${getComputedStyle(node).transform}`)).toBe('1 none');
  const restTop = await barTop();
  expect(restTop).toBeGreaterThan(400);

  await input.focus();
  await expect(sheet).toHaveAttribute('data-open', 'true');
  await expect(results).toBeVisible();
  await expect.poll(barTop).toBeLessThan(80);
  expect(await sheet.boundingBox()).toMatchObject({ x: 0, y: 0, width: 390, height: 844 });
  // The bar rises past the list once its glide settles, and stays above it.
  await expect.poll(async () => {
    const bar = (await input.boundingBox())!;
    const panel = (await results.boundingBox())!;
    return panel.y > bar.y + bar.height;
  }).toBe(true);
  await expect(input).toBeFocused();
  await expect(sheet).toHaveAttribute('aria-modal', 'true');

  // A query with no matches keeps the header and its close control.
  await input.fill('zzzz');
  await expect(page.getByText('No results found')).toBeVisible();
  const close = page.getByRole('button', { name: 'Close search results' });
  await expect(close).toBeVisible();

  // Tab stays inside the sheet and Escape closes it from anywhere in it.
  await page.keyboard.press('Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(input).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(close).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(results).toBeHidden();
  await expect(sheet).not.toHaveAttribute('data-open', 'true');
  await expect.poll(barTop).toBe(restTop);
  expect(errors).toEqual([]);
});

test('home window scene waits for a slow idle loop before it dresses the hero', async ({ page }) => {
  // The light loop takes 1.2 s to start playing.
  await page.addInitScript(() => {
    // oxlint-disable-next-line typescript/unbound-method -- the original play runs with each element as `this` below.
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () {
      const delay = this.getAttribute('src')?.includes('idle-light') ? 1200 : 0;
      return new Promise<void>((resolve, reject) => setTimeout(() => play.call(this).then(resolve, reject), delay));
    };
  });
  const errors = await openWindow(page, 'dark', { width: 390, height: 844 });
  // The first request starts the slow loop; the quick ones that follow must
  // join that startup rather than dress the hero while the loop is not playing.
  for (const theme of ['light', 'dark', 'light'] as const) {
    await switchTheme(page, theme);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => {
    const colour = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return {
      fillIsDark: colour('[data-theme-fill]') === colour('[data-theme-probe="dark"]'),
      lightLoop: Number(getComputedStyle(document.querySelector('[data-idle="light"]')!).opacity),
    };
  })).toEqual({ fillIsDark: true, lightLoop: 0 });
  await expectAtRest(page, 'light');
  await expect.poll(() => page.evaluate(() => {
    const colour = (selector: string) => getComputedStyle(document.querySelector(selector)!).backgroundColor;
    return colour('[data-theme-fill]') === colour('[data-theme-probe="light"]');
  })).toBe(true);
  expect(errors).toEqual([]);
});

// The portrait stills keep the window and the desk objects in the top 57% of
// the picture, so the copy must start below that line on every phone and tablet.
const SILL = 0.57;
for (const viewport of [{ width: 390, height: 844 }, { width: 375, height: 667 }, { width: 768, height: 1024 }]) {
  for (const theme of ['light', 'dark'] as const) {
    test(`home window copy starts under the window sill in ${theme} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      const errors = await openWindow(page, theme, viewport);
      const sources = await page.locator('img[data-still]').evaluateAll((images: HTMLImageElement[]) => images.map((image) => image.currentSrc));
      expect(sources.every((source) => source.includes('-portrait'))).toBe(true);
      // The sill in viewport coordinates, from the drawn picture of the theme's still.
      const sill = await page.locator('img[data-still]').evaluateAll((images: HTMLImageElement[], { theme, fraction }) => {
        const image = images.find((candidate) => candidate.currentSrc.includes(`window-${theme}-portrait`))!;
        const rect = image.getBoundingClientRect();
        const scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        const drawn = image.naturalHeight * scale;
        return rect.top + (rect.height - drawn) / 2 + drawn * fraction;
      }, { theme, fraction: SILL });
      const brand = (await page.getByTestId('home-window-brand').boundingBox())!;
      expect(brand.y).toBeGreaterThanOrEqual(sill);
      await expect(page.getByRole('figure', { name: /Paste a Spotify, Apple Music, or Deezer link/ })).toBeHidden();
      expect(errors).toEqual([]);
    });
  }
}

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
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-scene="light"]')).toBeVisible();

  await switchTheme(page, 'dark');
  await expect(page.locator('[data-scene="dark"]')).toBeVisible();
  const playing = await page.locator('video').evaluateAll((videos: HTMLVideoElement[]) => videos.filter((video) => !video.paused).length);
  expect(playing).toBe(0);
  await expect(page.locator('[data-layer]').first()).toBeHidden();
});
