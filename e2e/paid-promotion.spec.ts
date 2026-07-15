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
      {
        status: 'in_review',
        paymentStatus: 'paid',
        discountAmountMinor: 5000,
        taxAmountMinor: 1500,
        finalTotalMinor: 21500,
        amountRefundedMinor: 0,
        refundableRemainderMinor: 21500,
      },
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
  const checkoutRequestPromise = page.waitForRequest((request) =>
    request.method() === 'POST' &&
    new URL(request.url()).pathname.endsWith('/checkout-session'),
  );
  await page.getByTestId('paid-promotion-submit').click();
  const campaignRequest = await campaignRequestPromise;
  const checkoutRequest = await checkoutRequestPromise;
  const campaignPayload = campaignRequest.postDataJSON() as Record<string, unknown>;

  expect(campaignPayload.trackId).toBe(fixtureConvertTemplates.paidPromotionTrack.musicElementId);
  expect(campaignPayload.rateCardId).toBe(fixturePaidPromotionRateCards[0].id);
  expect(campaignPayload.attestationAccepted).toBe(true);
  expect(campaignPayload).not.toHaveProperty('amountMinor');
  expect(campaignPayload).not.toHaveProperty('currency');
  expect(campaignPayload).not.toHaveProperty('attestationVersion');
  expect(campaignPayload).not.toHaveProperty('price');
  expect(campaignPayload).not.toHaveProperty('couponId');
  expect(campaignPayload).not.toHaveProperty('promotionCodeId');
  expect(campaignPayload).not.toHaveProperty('finalTotalMinor');
  expect(checkoutRequest.postData()).toBeNull();

  await expect(page).toHaveURL(
    new RegExp(`/promote/${fixturePaidPromotionCampaign.id}/return\\?session_id=`),
  );
  await expect(page.getByRole('heading', { name: 'Waiting for payment confirmation' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
  await expect(page.getByText('Discount', { exact: true }).locator('..'))
    .toContainText('USD 50.00');
  await expect(page.getByText('Tax', { exact: true }).locator('..'))
    .toContainText('USD 15.00');
  await expect(page.getByText('Final total', { exact: true }).locator('..'))
    .toContainText('USD 215.00');
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

test('shows a zero-total campaign as paid and visibly non-refundable', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'in_review',
      paymentStatus: 'paid',
      discountAmountMinor: fixturePaidPromotionCampaign.amountMinor,
      taxAmountMinor: 0,
      finalTotalMinor: 0,
      amountRefundedMinor: 0,
      refundableRemainderMinor: 0,
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  await expect(page.getByRole('heading', { name: 'Payment received' })).toBeVisible();
  await expect(page.getByText('This zero-total campaign has no refundable charge.')).toBeVisible();
  await expect(page.getByText('Final total', { exact: true }).locator('..')).toContainText('USD 0.00');
});

test('fails visibly when a paid campaign has unknown checkout totals', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionCampaign: {
      ...fixturePaidPromotionCampaign,
      status: 'in_review',
      paymentStatus: 'paid',
    },
  });

  await page.goto(`/promote/${fixturePaidPromotionCampaign.id}/return`);

  await expect(page.getByRole('heading', { name: 'Payment status unavailable' })).toBeVisible();
  await expect(page.getByRole('alert').filter({
    hasText: 'Final checkout totals are unavailable',
  })).toBeVisible();
  await expect(page.getByText('Final total', { exact: true }).locator('..')).toContainText('Unavailable');
});

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
