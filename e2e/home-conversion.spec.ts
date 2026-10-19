import { expect, test } from '@playwright/test';
import { fixtureConvertTemplates, fixtureUsers } from './support/cassette-fixtures';
import { holdRoute } from './support/held-requests';
import { mockCassetteApp } from './support/mock-cassette-app';
import { dispatchPaste } from './support/paste';

test.describe('home conversion funnel', () => {
  test('auto-converts a supported pasted link', async ({ page }) => {
    await mockCassetteApp(page);

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', fixtureConvertTemplates.homeTrack.originalUrl);

    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    await expect(page.getByRole('heading', { name: 'Midnight City' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apple Music' })).toBeVisible();
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
      await expect(page).toHaveURL('/');
    });
  }

  test('preserves the source route when landing on a converted post', async ({ page }) => {
    await mockCassetteApp(page);

    const from = '/profile/miagroove?tab=tracks';
    await page.goto(
      `/post?url=${encodeURIComponent(fixtureConvertTemplates.homeTrack.originalUrl)}&from=${encodeURIComponent(from)}`,
    );

    await expect(page).toHaveURL(
      `/post/post-home-converted?from=${encodeURIComponent(from)}`,
    );
    await expect(page.getByRole('heading', { name: 'Midnight City' })).toBeVisible();
  });

  test('converts a direct link with percent escapes exactly as written', async ({ page }) => {
    const link = 'https://music.apple.com/us/album/100%25-pure%2Fmix/404040?i=404041';
    await mockCassetteApp(page, {
      convertTemplates: [{ ...fixtureConvertTemplates.homeTrack, originalUrl: link }],
    });
    const convert = page.waitForRequest(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/convert',
    );

    await page.goto(`/post?url=${encodeURIComponent(link)}`);

    expect((await convert).postDataJSON().sourceLink).toBe(link);
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });

  test('hands a signed-in paste to the conversion page with its session and the link as pasted', async ({ page, context, baseURL }) => {
    const link = 'https://music.apple.com/us/album/caf%C3%A9-nights/303030?i=303031';
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      convertTemplates: [{ ...fixtureConvertTemplates.homeTrack, originalUrl: link }],
    });
    await context.addCookies([{ name: 'e2e_session_marker', value: 'signed-in', url: baseURL! }]);
    const convert = page.waitForRequest(
      (request) => request.method() === 'POST' && new URL(request.url()).pathname === '/api/v1/convert',
    );

    const session = page.waitForResponse('**/api/auth/session');
    await page.goto('/');
    await session;
    await dispatchPaste(page, 'home-search-input', link);

    const request = await convert;
    expect(request.postDataJSON().sourceLink).toBe(link);
    expect((await request.allHeaders()).cookie ?? '').toContain('e2e_session_marker=signed-in');
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });

  test("draws a signed-in conversion where the owner's post lands", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await mockCassetteApp(page, { currentUser: fixtureUsers.member });
    let releaseConversion = () => {};
    const conversionHeld = new Promise<void>((resolve) => {
      releaseConversion = resolve;
    });
    await page.route('**/api/v1/convert', async (route) => {
      await conversionHeld;
      await route.fallback();
    });

    const session = page.waitForResponse('**/api/auth/session');
    await page.goto('/');
    await session;
    await dispatchPaste(page, 'home-search-input', fixtureConvertTemplates.homeTrack.originalUrl);
    await expect(page).toHaveURL(/\/post\?url=/);

    const drawnCard = await page.locator('[data-grow-target]').filter({ visible: true }).boundingBox();
    releaseConversion();
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    await expect(page.getByTestId('post-studio-panel')).toBeVisible();
    const postCard = await page.getByRole('main').last().locator('.card-ink').first().boundingBox();
    expect(Math.abs(postCard!.x - drawnCard!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(postCard!.width - drawnCard!.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(postCard!.y - drawnCard!.y)).toBeLessThanOrEqual(8);
  });

  test("shows a playlist's name and tracks while its songs are matched", async ({ page }) => {
    const playlistUrl = 'https://open.spotify.com/playlist/staged-playlist-1';
    const tracks = [
      { title: 'Blue Monday', artists: ['New Order'], duration: '7:29' },
      { title: 'Nightcall', artists: ['Kavinsky'], duration: '4:18' },
    ];
    await mockCassetteApp(page, {
      convertTemplates: [{
        ...fixtureConvertTemplates.homeTrack,
        postId: 'post-home-playlist',
        musicElementId: 'playlist-home-1',
        elementType: 'Playlist',
        title: 'Late Drives',
        artist: '',
        originalUrl: playlistUrl,
        convertedUrls: { spotify: playlistUrl },
        trackCount: tracks.length,
        tracks,
      }],
    });
    let releaseConversion = () => {};
    const conversionHeld = new Promise<void>((resolve) => {
      releaseConversion = resolve;
    });
    await page.route('**/api/v1/convert', async (route) => {
      await conversionHeld;
      await route.fallback();
    });
    const source = { elementType: 'playlist', title: 'Late Drives', artists: [], platform: 'spotify', tracks };
    const reported = [
      { stage: 'fetching_source', partialResult: null },
      { stage: 'matching_tracks', tracksProcessed: 1, tracksTotal: 2, partialResult: { source } },
    ];
    let step = 0;
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) =>
      route.fulfill({ status: 202, json: { success: false, status: 'processing', jobId: 'job_playlist', ...reported[step] } }),
    );

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', playlistUrl);
    await expect(page).toHaveURL(/\/post\?url=/);

    step = 1;
    await expect(page.getByRole('heading', { name: 'Late Drives' }).filter({ visible: true })).toBeVisible();
    for (const track of tracks) {
      await expect(page.getByText(track.title, { exact: true }).filter({ visible: true })).toBeVisible();
    }
    await expect(page.getByText('2 tracks, 12 min', { exact: true }).filter({ visible: true })).toBeVisible();

    releaseConversion();
    await expect(page).toHaveURL(/\/post\/post-home-playlist$/);
    await expect(page.getByText('Nightcall', { exact: true }).filter({ visible: true })).toBeVisible();
  });

  test('builds the post in stages from the conversion job while the response is pending', async ({ page }) => {
    const track = fixtureConvertTemplates.homeTrack;
    await mockCassetteApp(page);
    let releaseConversion = () => {};
    const conversionHeld = new Promise<void>((resolve) => {
      releaseConversion = resolve;
    });
    await page.route('**/api/v1/convert', async (route) => {
      await conversionHeld;
      await route.fallback();
    });
    const source = { elementType: 'track', title: track.title, artists: [track.artist], platform: 'spotify' };
    const reported = [
      { stage: 'parsing_source', partialResult: null },
      { stage: 'matching_platforms', partialResult: { source } },
      { stage: 'matching_platforms', partialResult: { source, platforms: { applemusic: track.convertedUrls.appleMusic } } },
    ];
    let step = 0;
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) =>
      route.fulfill({ status: 202, json: { success: false, status: 'processing', jobId: 'job_staged', ...reported[step] } }),
    );

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', track.originalUrl);
    await expect(page).toHaveURL(/\/post\?url=/);

    const visible = (text: string) => page.getByText(text, { exact: true }).filter({ visible: true });
    const loading = page.getByTestId('pending-link-indicator').filter({ visible: true });
    await expect(visible('Reading your link')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Spotify' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apple Music' })).toHaveCount(0);
    // Each service still waiting for its link loads from the first paint.
    await expect(loading).toHaveCount(2);

    step = 1;
    await expect(page.getByRole('heading', { name: track.title }).filter({ visible: true })).toBeVisible();
    await expect(visible('Matching across services')).toBeVisible();

    step = 2;
    await expect(page.getByRole('link', { name: 'Apple Music' }).filter({ visible: true })).toBeVisible();
    await expect(loading).toHaveCount(1);

    releaseConversion();
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
    await expect(page.getByRole('link', { name: 'Deezer' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByTestId('pending-link-indicator')).toHaveCount(0);
  });

  test('stops loading a service the finished post has no link for', async ({ page }) => {
    const { spotify, appleMusic } = fixtureConvertTemplates.homeTrack.convertedUrls;
    const track = { ...fixtureConvertTemplates.homeTrack, convertedUrls: { spotify, appleMusic } };
    await mockCassetteApp(page, { convertTemplates: [track] });
    const releaseConversion = await holdRoute(page, '**/api/v1/convert');
    const source = { elementType: 'track', title: track.title, artists: [track.artist], platform: 'spotify' };
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) => route.fulfill({
      status: 202,
      json: { success: false, status: 'processing', jobId: 'job_unmatched', stage: 'matching_platforms', partialResult: { source } },
    }));
    const releaseLanding = await holdRoute(
      page,
      (url) => url.pathname === `/post/${track.postId}`,
      (request) => request.headers()['rsc'] === '1',
    );

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', track.originalUrl);
    const deezerRow = page.getByText('Deezer', { exact: true }).filter({ visible: true });
    const loading = page.getByTestId('pending-link-indicator').filter({ visible: true });
    await expect(deezerRow).toBeVisible();
    await expect(loading).toHaveCount(2);

    releaseConversion();
    await expect(page.getByRole('link', { name: 'Apple Music' }).filter({ visible: true })).toBeVisible();
    await expect(deezerRow).toHaveCount(0);
    await expect(loading).toHaveCount(0);

    releaseLanding();
    await expect(page).toHaveURL(new RegExp(`/post/${track.postId}$`));
    await expect(page.getByRole('heading', { name: track.title })).toBeVisible();
    await expect(page.getByTestId('pending-link-indicator')).toHaveCount(0);
  });

  test('settles the staged post to the finished post before it lands', async ({ page }) => {
    const track = { ...fixtureConvertTemplates.homeTrack, duration: '4:03', albumName: "Hurry Up, We're Dreaming" };
    await mockCassetteApp(page, { convertTemplates: [track] });
    let releaseConversion = () => {};
    const conversionHeld = new Promise<void>((resolve) => {
      releaseConversion = resolve;
    });
    await page.route('**/api/v1/convert', async (route) => {
      await conversionHeld;
      await route.fallback();
    });
    // The last poll knew the source and Apple Music; Deezer landed after it.
    const source = { elementType: 'track', title: track.title, artists: [track.artist], platform: 'spotify' };
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) => route.fulfill({
      status: 202,
      json: {
        success: false,
        status: 'processing',
        jobId: 'job_settle',
        stage: 'finalizing',
        partialResult: { source, platforms: { applemusic: track.convertedUrls.appleMusic } },
      },
    }));
    // Holds the post route, so the hand-off skeleton stays on screen.
    const releaseLanding = await holdRoute(
      page,
      (url) => url.pathname === `/post/${track.postId}`,
      (request) => request.headers()['rsc'] === '1',
    );

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', track.originalUrl);
    await expect(page.getByRole('link', { name: 'Apple Music' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Deezer' })).toHaveCount(0);

    releaseConversion();
    await expect(page.getByRole('link', { name: 'Deezer' }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('4:03', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText(track.albumName, { exact: true }).filter({ visible: true })).toBeVisible();

    releaseLanding();
    await expect(page).toHaveURL(/\/post\/post-home-converted$/);
  });

  test('stops reading the conversion job once it is ready', async ({ page }) => {
    const track = fixtureConvertTemplates.homeTrack;
    await mockCassetteApp(page);
    await page.route('**/api/v1/convert', () => {});
    let jobReads = 0;
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) => {
      jobReads += 1;
      return route.fulfill({ json: { success: true, status: 'ready', jobId: 'job_done', postId: track.postId } });
    });

    await page.goto('/');
    await dispatchPaste(page, 'home-search-input', track.originalUrl);
    await expect.poll(() => jobReads).toBe(1);
    await page.waitForTimeout(1500);
    expect(jobReads).toBe(1);
  });

  test('lays out a short link by the element type Bridge reads', async ({ page }) => {
    const shortUrl = 'https://spotify.link/cassetteShortPlaylist';
    const tracks = [
      { title: 'Blue Monday', artists: ['New Order'], duration: '7:29' },
      { title: 'Nightcall', artists: ['Kavinsky'], duration: '4:18' },
    ];
    await mockCassetteApp(page, {
      convertTemplates: [{
        ...fixtureConvertTemplates.homeTrack,
        postId: 'post-short-playlist',
        musicElementId: 'playlist-short-1',
        elementType: 'Playlist',
        title: 'Short Drives',
        artist: '',
        originalUrl: shortUrl,
        convertedUrls: { spotify: shortUrl },
        trackCount: tracks.length,
        tracks,
      }],
    });
    await page.route('**/api/v1/convert', () => {});
    const source = { elementType: 'playlist', title: 'Short Drives', artists: [], platform: 'spotify', tracks };
    await page.route('**/api/v1/convert/jobs/by-key/**', (route) => route.fulfill({
      status: 202,
      json: {
        success: false,
        status: 'processing',
        jobId: 'job_short',
        stage: 'matching_tracks',
        tracksProcessed: 1,
        tracksTotal: 2,
        partialResult: { source },
      },
    }));

    await page.goto(`/post?url=${encodeURIComponent(shortUrl)}`);

    await expect(page.getByText('2 tracks, 12 min', { exact: true }).filter({ visible: true })).toBeVisible();
    await expect(page.getByText('Spotify · playlist', { exact: true }).filter({ visible: true })).toBeVisible();
  });
});
