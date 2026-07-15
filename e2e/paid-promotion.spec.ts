import { expect, test } from '@playwright/test';
import {
  fixtureConvertTemplates,
  fixturePaidPromotionCampaign,
  fixturePaidPromotionRateCards,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('creates a server-priced paid-promotion campaign and trusts webhook-backed polling after return', async ({
  page,
}) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionPollSequence: [
      { status: 'pending_payment', paymentStatus: 'pending' },
      { status: 'in_review', paymentStatus: 'paid' },
    ],
  });

  await page.goto('/promote');
  await expect(page.getByRole('button', { name: 'Back', exact: true })).toBeVisible();
  await page.getByTestId('paid-promotion-track-input').fill(
    fixtureConvertTemplates.paidPromotionTrack.originalUrl,
  );
  await page.getByTestId('paid-promotion-resolve-track').click();

  const resolvedTrack = page.getByTestId('paid-promotion-resolved-track');
  await expect(resolvedTrack).toContainText('Signal Fire');
  await expect(resolvedTrack).toHaveAttribute('role', 'status');
  await expect(resolvedTrack).toBeFocused();
  await page.getByTestId(
    `paid-promotion-rate-card-${fixturePaidPromotionRateCards[0].id}`,
  ).click();
  await page.getByTestId('paid-promotion-brief').fill(
    'Focus on the release story and the live arrangement.',
  );
  await page.getByLabel('Promoter kind').click();
  await page.getByRole('option', { name: 'Artist', exact: true }).click();
  await page.getByLabel('Relationship to the artist').click();
  await page.getByRole('option', { name: 'I am the artist', exact: true }).click();
  await page.getByTestId('paid-promotion-attestation').check();

  const campaignRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname === '/api/v1/paid-promotions/campaigns',
  );
  await page.getByTestId('paid-promotion-submit').click();
  const campaignRequest = await campaignRequestPromise;
  const campaignPayload = campaignRequest.postDataJSON() as Record<string, unknown>;

  expect(campaignPayload.trackId).toBe(fixtureConvertTemplates.paidPromotionTrack.musicElementId);
  expect(campaignPayload.rateCardId).toBe(fixturePaidPromotionRateCards[0].id);
  expect(campaignPayload.attestationAccepted).toBe(true);
  expect(campaignPayload).not.toHaveProperty('amountMinor');
  expect(campaignPayload).not.toHaveProperty('currency');
  expect(campaignPayload).not.toHaveProperty('attestationVersion');

  await expect(page).toHaveURL(
    new RegExp(`/promote/${fixturePaidPromotionCampaign.id}/return\\?session_id=`),
  );
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
});

test('redirects anonymous paid-promotion intake visitors through the existing auth return flow', async ({
  page,
}) => {
  await mockCassetteApp(page);

  await page.goto('/promote');

  await expect(page).toHaveURL('/auth/signin?redirect=/promote');
});

for (const expected of [
  { paymentStatus: 'processing', heading: 'Payment is processing' },
  { paymentStatus: 'failed', heading: 'Payment was not completed' },
  { paymentStatus: 'expired', heading: 'Checkout expired' },
] as const) {
  test(`renders the persisted ${expected.paymentStatus} return state`, async ({ page }) => {
    await mockCassetteApp(page, {
      currentUser: fixtureUsers.member,
      paidPromotionCampaign: {
        ...fixturePaidPromotionCampaign,
        paymentStatus: expected.paymentStatus,
      },
    });

    await page.goto(
      `/promote/${fixturePaidPromotionCampaign.id}/return?session_id=cs_untrusted_query_value`,
    );

    await expect(page.getByRole('heading', { name: expected.heading })).toBeVisible();
  });
}

test('keeps paid-promotion intake within a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });

  await page.goto('/promote');
  await expect(page.getByTestId('paid-promotion-track-input')).toBeVisible();
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});
