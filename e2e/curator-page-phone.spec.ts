import { expect, test, type Page } from '@playwright/test';

import {
  CURATOR_SUBSCRIBER_SENTINEL,
  fixtureActiveMembershipStatus,
  fixtureCuratorPage,
  fixtureFreeCuratorPage,
  fixtureIncompleteMembershipStatus,
  fixtureMemberCuratorPage,
  fixtureNoMembershipStatus,
  fixtureUsers,
} from './support/cassette-fixtures';
import { expectNoHorizontalOverflow } from './support/layout';
import { mockCassetteApp } from './support/mock-cassette-app';
import { returnFromProvider } from './support/provider-return';

const CURATOR_PATH = `/profile/${fixtureCuratorPage.curator.username}`;
const CHECKOUT_URL = 'https://checkout.stripe.test/membership-session';
const NAME = fixtureUsers.playlistCurator.displayName;
const LONG_BIO = 'Daily playlists for every mood, with notes on why each song made the cut. New members-only mixes every Friday, plus the occasional deep cut from the archive.';

const phonePass = (page: Page) => page.getByTestId('curator-membership-compact');
const posts = (page: Page) => page.locator('[data-testid="profile-music"]:visible').first();
const top = async (page: Page, locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!.y;

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

  for (const theme of ['light', 'dark'] as const) {
    test(`header controls draw an ink focus indicator, not red, in the ${theme} theme`, async ({ page }) => {
      await page.addInitScript((value) => localStorage.setItem('theme', value), theme);
      await mockCassetteApp(page, {
        curatorPage: fixtureCuratorPage,
        users: [{ ...fixtureUsers.playlistCurator, bio: LONG_BIO }],
      });
      await page.goto(CURATOR_PATH);
      const header = page.locator('header').filter({ has: page.getByRole('button', { name: /profile picture/ }) });
      const avatar = header.getByRole('button', { name: /profile picture/ });
      await expect(avatar).toBeVisible();
      await expect(page.locator('html')).toHaveClass(new RegExp(theme));

      // Tab from the avatar through Follow, Share, and Show more; each focus mark uses the ink color.
      await avatar.focus();
      const marks: Array<{ label: string; ink: boolean; red: boolean }> = [];
      for (let step = 0; step < 4; step += 1) {
        if (step > 0) await page.keyboard.press('Tab');
        marks.push(await page.evaluate(() => {
          const el = document.activeElement;
          if (!(el instanceof HTMLElement) || !el.parentElement) throw new Error('No focused control');
          // Read the settled focus style, not a frame of the button's color transition.
          for (const animation of el.getAnimations()) animation.finish();
          const probe = document.createElement('span');
          el.parentElement.append(probe);
          const rgb = (color: string) => {
            probe.style.color = color;
            return getComputedStyle(probe).color.match(/\d+/g)!.slice(0, 3).join(', ');
          };
          const ink = rgb('hsl(var(--foreground))');
          const reds = [rgb('hsl(350 76% 52%)'), rgb('hsl(349 89% 65%)')];
          probe.remove();
          const style = getComputedStyle(el);
          const drawn = [style.boxShadow, style.outlineStyle === 'none' ? '' : style.outlineColor, style.borderColor].join(' ');
          return {
            label: el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '',
            ink: drawn.includes(ink),
            red: reds.some((red) => drawn.includes(red)),
          };
        }));
      }
      expect(marks.map((mark) => mark.label)).toEqual([
        `View ${NAME}'s profile picture`,
        `Follow ${NAME}`,
        'Share profile',
        'Show more',
      ]);
      for (const mark of marks) expect(mark, mark.label).toMatchObject({ ink: true, red: false });
    });
  }

  test('a non-member sees the plain offer above the posts, first in reading and keyboard order', async ({ page }) => {
    await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });
    await page.goto(CURATOR_PATH);

    const pass = phonePass(page);
    await expect(pass).toBeVisible();
    await expect(pass).toContainText(fixtureCuratorPage.membership!.name);
    await expect(pass).toContainText('$5.50/month · 1 member post');
    // The phone pass is a plain card: no red head and no wallet pass.
    await expect(page.locator('[data-shared-tint="head"]:visible')).toHaveCount(0);
    await expect(page.locator('[data-testid="curator-membership-card"]:visible')).toHaveCount(0);
    expect(await top(page, pass)).toBeLessThan(await top(page, posts(page)));
    expect(await pass.evaluate((el) => {
      const music = document.querySelector('[data-testid="profile-music"]')!;
      return Boolean(el.compareDocumentPosition(music) & Node.DOCUMENT_POSITION_FOLLOWING);
    })).toBe(true);

    // Keyboard: Share in the header, then the Music and Liked tabs, then Join before any post.
    const join = pass.getByRole('button', { name: `Join ${NAME}`, exact: true });
    await page.getByRole('button', { name: 'Share profile' }).focus();
    const reached: string[] = [];
    for (let step = 0; step < 6; step += 1) {
      await page.keyboard.press('Tab');
      reached.push(await page.evaluate(() => document.activeElement?.textContent?.trim() ?? ''));
      if (await join.evaluate((el) => el === document.activeElement)) break;
    }
    await expect(join).toBeFocused();
    expect(reached.some((text) => text.includes('Sunday Morning Selects'))).toBe(false);

    // Plan details hold the description, billing choice, and benefits.
    await expect(pass.getByText('Annual', { exact: true })).toHaveCount(0);
    await pass.getByRole('button', { name: 'Plan details' }).click();
    await expect(pass.getByText(fixtureCuratorPage.membership!.benefits[0].name)).toBeVisible();
    await pass.getByText('Annual', { exact: true }).click();
    await expect(pass).toContainText('$55.00/year · 1 member post');
    await join.click();
    await expect(page).toHaveURL(/\/auth\/signin\?redirect=.*interval%3Dyear/);
  });

  test('back from Checkout before payment confirms: the pending pass takes focus', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureIncompleteMembershipStatus,
    });
    await page.goto(`${CURATOR_PATH}?membership=return`);

    const heading = phonePass(page).getByRole('heading', { name: 'Confirming your payment' });
    await expect(heading).toBeFocused();
    await expect(phonePass(page)).toBeInViewport();
    await expect(phonePass(page)).toContainText('Your 1 member post opens here when it is done.');
    await expect(phonePass(page).getByRole('button', { name: /join/i })).toHaveCount(0);
    await expect(phonePass(page).getByRole('button', { name: 'Check status' })).toBeVisible();
  });

  test('back from Checkout with an active membership: "You\'re in" scrolls into view with the newest member posts', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.viewer,
      curatorPage: fixtureCuratorPage,
      membershipStatus: fixtureNoMembershipStatus,
      membershipPollSequence: [fixtureActiveMembershipStatus],
      membershipActiveCuratorPage: fixtureMemberCuratorPage,
    });
    await page.goto(CURATOR_PATH);
    await returnFromProvider(page, CHECKOUT_URL, `${CURATOR_PATH}?membership=return`);
    await phonePass(page).getByRole('button', { name: `Join ${NAME}`, exact: true }).click();

    const pass = phonePass(page);
    const heading = pass.getByRole('heading', { name: 'You\'re in' });
    await expect(heading).toBeFocused();
    await expect(heading).toBeInViewport();
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
    expect(await heading.evaluate((el) => getComputedStyle(el).fontFamily)).not.toMatch(/teko/i);
    await expect(pass).toContainText(`Welcome to ${NAME}'s membership. 1 members-only post is open to you.`);
    const newest = pass.getByRole('list', { name: 'Newest members-only posts' });
    await expect(newest.getByRole('link', { name: new RegExp(CURATOR_SUBSCRIBER_SENTINEL) })).toBeVisible();
    await expect(pass.getByRole('link', { name: 'Set up your profile' })).toBeVisible();
    await pass.getByRole('link', { name: 'View member posts' }).click();
    await expect(page.getByRole('radio', { name: 'Members only' })).toBeChecked();
  });

  test('a member on a later visit sees the plain member pass with View member posts and Manage', async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      curatorPage: fixtureMemberCuratorPage,
      membershipStatus: fixtureActiveMembershipStatus,
    });
    await page.goto(CURATOR_PATH);

    const pass = phonePass(page);
    await expect(pass).toContainText(fixtureCuratorPage.membership!.name);
    await expect(pass).toContainText('$5.50/month · renews');
    await expect(pass.getByRole('link', { name: 'View member posts' })).toBeVisible();
    await expect(pass.getByRole('button', { name: 'Manage' })).toBeVisible();
    await expect(pass.getByRole('heading', { name: 'You\'re in' })).toHaveCount(0);
    expect(await top(page, pass)).toBeLessThan(await top(page, posts(page)));
    await expect(page.getByRole('button', { name: `Follow ${NAME}`, exact: true })).toHaveCount(0);
  });

  test('a curator with no plan shows no pass, and the posts follow the tabs', async ({ page }) => {
    await mockCassetteApp(page, { currentUser: fixtureUsers.viewer, curatorPage: fixtureFreeCuratorPage });
    await page.goto(CURATOR_PATH);

    await expect(posts(page).getByText('Sunday Morning Selects')).toBeVisible();
    await expect(phonePass(page)).toHaveCount(0);
    await expect(page.locator('aside[aria-label="Membership"]')).toBeHidden();
    await expect(page.locator('header').getByRole('button', { name: `Follow ${NAME}`, exact: true })).toBeVisible();
  });

  test('the owner previews the offer with an inert Join and no Follow', async ({ page }) => {
    const owner = { ...fixtureUsers.playlistCurator };
    await mockCassetteApp(page, {
      currentUser: owner,
      curatorPage: { ...fixtureCuratorPage, viewer: { isOwner: true, isMember: false, hasMemberBadge: false } },
    });
    await page.goto(CURATOR_PATH);

    const join = phonePass(page).getByRole('button', { name: 'Join' });
    await expect(join).toHaveAttribute('aria-disabled', 'true');
    await expect(join).toHaveAttribute('tabindex', '-1');
    await expect(page.getByRole('button', { name: `Follow ${NAME}`, exact: true })).toHaveCount(0);
  });

  test('the loading pass and header hold the places of the loaded ones', async ({ page }) => {
    await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });
    await page.goto(CURATOR_PATH);
    await expect(phonePass(page)).toBeVisible();
    const loaded = { pass: (await phonePass(page).boundingBox())!, tabs: (await page.getByRole('tablist').first().boundingBox())! };

    let release = () => {};
    const released = new Promise<void>((resolve) => { release = resolve; });
    await page.route('**/api/v1/curators/*/page**', async (route) => {
      await released;
      await route.fallback();
    });
    await page.reload();
    const skeleton = page.locator('aside[aria-label="Membership"] + div .card-quiet');
    await expect(skeleton).toBeVisible();
    const held = { pass: (await skeleton.boundingBox())!, tabs: (await page.getByRole('tablist').first().boundingBox())! };
    release();
    expect(Math.abs(held.tabs.y - loaded.tabs.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(held.pass.y - loaded.pass.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(held.pass.height - loaded.pass.height)).toBeLessThanOrEqual(1);
  });
});

test('desktop keeps the wallet pass in the right rail beside the posts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });
  await page.goto(CURATOR_PATH);

  const pass = page.getByTestId('curator-membership-card');
  await expect(pass).toBeVisible();
  await expect(pass.locator('[data-shared-tint="head"]')).toBeVisible();
  await expect(phonePass(page)).toBeHidden();
  const feed = (await posts(page).boundingBox())!;
  const rail = (await pass.boundingBox())!;
  expect(rail.x).toBeGreaterThan(feed.x + feed.width);
  expect(Math.abs(rail.y - feed.y)).toBeLessThan(40);
  await expect(page.getByTestId('membership-join')).toHaveText(`Join ${NAME}`);
});
