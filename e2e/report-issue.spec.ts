import { expect, test } from '@playwright/test';

import { fixturePosts, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('preserves a failed report draft across a mobile close and clears it only after success', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.publicTrack],
    issueReportFailures: 1,
  });

  await page.goto('/post/post-public-track');

  const openReport = page.getByRole('main').last().getByRole('button', {
    name: 'Report a Problem',
  });
  await openReport.click();

  const dialog = page.getByRole('dialog', { name: 'Report a Problem' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: /Conversion Problem/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect.poll(() => dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(0, -rect.left, rect.right - window.innerWidth);
  })).toBeLessThanOrEqual(1);

  const description = page.locator('#description');
  await expect(description).toHaveAttribute('maxlength', '5000');
  await description.fill('The play button stops responding after the first tap.');
  await expect(page.getByText('53/5,000')).toBeVisible();

  await page.getByRole('button', { name: 'Submit Report' }).click();
  await expect(page.getByRole('alert')).toContainText('An error occurred. Please try again.');

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toBeHidden();

  await openReport.click();
  await expect(description).toHaveValue('The play button stops responding after the first tap.');

  await page.getByRole('button', { name: 'Submit Report' }).click();
  await expect(page.getByText('Thank you for your report!')).toBeVisible();

  const done = page.getByRole('button', { name: 'Done' });
  await done.scrollIntoViewIfNeeded();
  const doneBounds = await done.boundingBox();
  expect(doneBounds).not.toBeNull();
  expect(doneBounds!.y + doneBounds!.height).toBeLessThanOrEqual(667);
  await done.click();

  await openReport.click();
  await expect(description).toHaveValue('');
});

test('does not carry a report draft to a different post with the same source link', async ({ page }) => {
  const secondPost = {
    ...fixturePosts.publicTrack,
    postId: 'post-report-second',
    musicElementId: 'track-report-second',
    title: 'Midnight Replay',
  };

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    posts: [fixturePosts.publicTrack, secondPost],
  });

  await page.goto('/profile/djaurora?tab=tracks');
  await page.locator('[data-testid="profile-content-pane"]:visible')
    .first()
    .locator('a[href^="/post/post-public-track"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/post\/post-public-track/);
  const firstReportButton = page.getByRole('main').last().getByRole('button', {
    name: 'Report a Problem',
  });
  await firstReportButton.click();
  await page.locator('#description').fill('This draft belongs to the first post.');
  await page.getByRole('button', { name: 'Cancel' }).click();

  await page.locator('a[href="/profile/djaurora"]').first().click();
  await expect(page).toHaveURL(/\/profile\/djaurora\?tab=tracks$/);
  await page.locator('[data-testid="profile-content-pane"]:visible')
    .first()
    .locator('a[href^="/post/post-report-second"]')
    .first()
    .click();
  await expect(page).toHaveURL(/\/post\/post-report-second/);
  await expect(page.getByRole('main').last()).toContainText('Midnight Replay');

  await page.getByRole('main').last().getByRole('button', {
    name: 'Report a Problem',
  }).click();
  await expect(page.locator('#description')).toHaveValue('');
});
