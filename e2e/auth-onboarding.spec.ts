import { expect, test } from '@playwright/test';
import { fixtureCuratorPage, fixtureNoMembershipStatus, fixtureUsers } from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const AVATAR_FILE = {
  name: 'avatar.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ioAAAAASUVORK5CYII=',
    'base64',
  ),
};

test('runs the trimmed promote-intent onboarding and returns to the campaign intake', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.newcomer,
  });

  await page.goto('/promote/new');
  await expect(page).toHaveURL('/auth/signin?redirect=/promote/new');
  await expect(
    page.getByText('Sign in to manage your campaign, payment, and receipts.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/onboarding');
  await expect(
    page.getByText('Set up your account so you can manage your campaign, payment, and receipts.'),
  ).toBeVisible();

  await page.getByTestId('onboarding-start').click();
  // The trimmed flow has no multi-step chrome and only the handle step.
  await expect(page.getByText(/Step 1 of/)).toHaveCount(0);
  await page.getByTestId('onboarding-username').fill('promobuyer');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();

  await expect(page).toHaveURL('/promote/new');
  await expect(page.getByTestId('paid-promotion-subject-input')).toBeVisible();
});

test('keeps the membership purchase visible through sign-in and minimal onboarding, then resumes checkout', async ({
  page,
}) => {
  const curatorPath = `/profile/${fixtureCuratorPage.curator.username}`;
  const { state } = await mockCassetteApp(page, {
    curatorPage: fixtureCuratorPage,
    googleAuthUser: fixtureUsers.newcomer,
    membershipStatus: fixtureNoMembershipStatus,
  });
  const kofi = page.locator('[aria-label="Support Cassette on Ko-fi"]');

  await page.goto(curatorPath);
  await page.getByTestId('curator-membership-card').getByText('Annual', { exact: true }).click();
  await page.getByTestId('membership-join').click();
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=/);

  // Sign-in: trusted offer, annual total billed annually, no donation ask, Google-only.
  const signInSummary = page.getByTestId('membership-purchase-summary');
  await expect(signInSummary).toContainText(fixtureCuratorPage.curator.displayName!);
  await expect(signInSummary.getByTestId('membership-purchase-total')).toHaveText('$55.00/year');
  await expect(signInSummary).toContainText('billed annually');
  await expect(signInSummary).toContainText('Renews annually');
  await expect(page.getByText('Google is currently the only sign-in option.')).toBeVisible();
  await expect(kofi).toHaveCount(0);

  // The purchase survives switching to sign-up and back.
  await page.getByRole('link', { name: /Sign Up/ }).click();
  await expect(page).toHaveURL(/\/auth\/signup\?redirect=/);
  await expect(page.getByTestId('membership-purchase-total')).toHaveText('$55.00/year');
  await expect(page.getByRole('heading', { name: 'Create a free account' })).toBeVisible();
  await expect(kofi).toHaveCount(0);

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/onboarding');

  // Onboarding: no welcome interruption, only the handle step, summary still visible.
  await expect(page.getByTestId('onboarding-start')).toHaveCount(0);
  await expect(page.getByText(/Step 1 of/)).toHaveCount(0);
  await expect(page.getByTestId('membership-purchase-total')).toHaveText('$55.00/year');
  await expect(kofi).toHaveCount(0);
  await page.getByTestId('onboarding-username').fill('cratefan');
  const appOrigin = new URL(page.url()).origin;
  await page.route('https://checkout.stripe.test/membership-session', (route) => route.fulfill({
    status: 302,
    headers: { location: `${appOrigin}${curatorPath}?membership=canceled` },
  }));
  await page.getByRole('button', { name: 'Save and continue to payment' }).click();

  await expect(page).toHaveURL(`${curatorPath}?membership=canceled`);
  await expect.poll(() => state.membershipCheckoutRequests.at(-1)).toEqual({
    planId: fixtureCuratorPage.membership!.planId,
    interval: 'year',
  });
});

test('rejects a membership redirect that points off-site', async ({ page }) => {
  await mockCassetteApp(page, { curatorPage: fixtureCuratorPage });

  await page.goto('/auth/signin?redirect=//evil.example/profile/x%3Fmembership%3Djoin%26interval%3Dyear');
  await expect(page.getByRole('heading', { name: 'Welcome back!' })).toBeVisible();
  await expect(page.getByTestId('membership-purchase-summary')).toHaveCount(0);
});

test('resumes add-music after a gated visitor completes onboarding', async ({ page }) => {
  await mockCassetteApp(page, {
    googleAuthUser: fixtureUsers.newcomer,
  });

  await page.goto('/add-music');
  await expect(page).toHaveURL(/\/auth\/signin\?redirect=\/add-music$/);

  await page.getByRole('button', { name: 'Continue with Google' }).click();
  await expect(page).toHaveURL('/onboarding');

  await page.getByTestId('onboarding-start').click();
  await page.getByTestId('onboarding-username').fill('freshhandle');
  await expect(page.getByTestId('onboarding-handle-next')).toBeEnabled();
  await page.getByTestId('onboarding-handle-next').click();

  await page.getByTestId('onboarding-avatar-file-input').setInputFiles(AVATAR_FILE);
  await expect(page.getByRole('dialog', { name: 'Adjust profile photo' })).toBeVisible();
  await page.getByTestId('avatar-crop-apply').click();
  await page.getByTestId('onboarding-avatar-next').click();
  await page.getByTestId('onboarding-finish-setup').click();

  await expect(page).toHaveURL('/add-music');
  await expect(page.locator('[data-testid="add-music-input"]:visible')).toBeVisible();
});
