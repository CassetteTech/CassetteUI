import { expect, test } from '@playwright/test';

import {
  fixtureCuratorPage,
  fixtureUsers,
} from './support/cassette-fixtures';
import { expectNoHorizontalOverflow } from './support/layout';
import { mockCassetteApp } from './support/mock-cassette-app';

const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const NAME = fixtureUsers.playlistCurator.displayName;
const LONG_BIO = 'Daily playlists for every mood, with notes on why each song made the cut. New members-only mixes every Friday, plus the occasional deep cut from the archive.';


test.describe('curator page on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('a compact header: one identity row, two bio lines, Show more for the rest, no gradient card', async ({ page }) => {
    await mockCassetteApp(page, {
      curatorPage: fixtureCuratorPage,
      users: [{ ...fixtureUsers.playlistCurator, bio: LONG_BIO, musicConnections: ['Spotify'] }],
    });
    await page.goto(CURATOR_PATH);

    const header = page.locator('header').filter({ has: page.getByRole('button', { name: /profile picture/ }) });
    await expect(header).toBeVisible();
    const row = (await header.getByRole('button', { name: /profile picture/ }).boundingBox())!;
    for (const control of [
      header.getByText(NAME, { exact: true }).first(),
      header.getByText(`@${fixtureCuratorPage.curator.username}`, { exact: true }),
      header.getByRole('button', { name: `Follow ${NAME}`, exact: true }),
      header.getByRole('button', { name: 'Share profile' }),
    ]) {
      const box = (await control.boundingBox())!;
      expect(box.y).toBeGreaterThanOrEqual(row.y - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(row.y + row.height + 1);
    }
    // The name is set in Inter, not Teko.
    expect(await header.getByText(NAME, { exact: true }).first().evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/teko/i);
    await expect(header.locator('.card-quiet, .bg-rose-300\\/75')).toHaveCount(0);

    const bio = header.getByText(LONG_BIO, { exact: true });
    const lineHeight = await bio.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
    const clamp = (await bio.locator('..').boundingBox())!.height;
    expect(Math.abs(clamp - 2 * lineHeight)).toBeLessThanOrEqual(1);
    await expect(header.getByText('Spotify', { exact: true })).toHaveCount(0);
    await header.getByRole('button', { name: 'Show more' }).click();
    await expect(header.getByText('Spotify', { exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true');
    await expectNoHorizontalOverflow(page);
  });
});
