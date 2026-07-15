import { expect, test } from '@playwright/test';
import {
  fixtureInternalPaidPromotionCampaign,
  fixturePaidPromotionCampaign,
  fixturePaidPromotionRateCards,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

test('renders the team queue once, filters it, and shows complete campaign detail', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });

  await page.goto('/internal/paid-promotions');

  await expect(page.getByRole('heading', { name: 'Paid Promotions' })).toHaveCount(1);
  await expect(page.getByRole('navigation', { name: 'Internal console' }).first()).toBeVisible();
  await expect(page.getByRole('table', { name: 'Paid-promotion campaign queue' })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Signal Fire/ })).toBeVisible();

  const filteredRequest = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === '/api/v1/internal/paid-promotions/campaigns'
      && url.searchParams.get('status') === 'in_review';
  });
  await page.getByLabel('Campaign status').selectOption('in_review');
  await filteredRequest;

  await page.getByRole('link', {
    name: fixturePaidPromotionCampaign.id,
    exact: true,
  }).click();
  await expect(page).toHaveURL('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);
  await expect(page.getByRole('heading', { name: 'Signal Fire', level: 1 })).toHaveCount(1);
  await expect(page.getByText('Focus on the release story and live arrangement.')).toBeVisible();
  await expect(page.getByText('Self Artist', { exact: true })).toBeVisible();
  await expect(page.getByText('Paid', { exact: true })).toBeVisible();
  await expect(page.getByText('Instagram', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Stuck Pending', { exact: true })).toBeVisible();
});

test('manual quote submits only a server rate-card id', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      status: 'pending_payment',
      payment: null,
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Create manual quote' }).click();
  const dialog = page.getByRole('dialog', { name: 'Create manual quote' });
  await dialog.getByLabel('Server rate-card ID').fill(fixturePaidPromotionRateCards[0].id);
  const quoteRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/quote'),
  );
  await dialog.getByRole('button', { name: 'Create quote' }).click();
  const request = await quoteRequest;
  const payload = request.postDataJSON() as Record<string, unknown>;

  expect(payload).toEqual({ rateCardId: fixturePaidPromotionRateCards[0].id });
  expect(payload).not.toHaveProperty('amountMinor');
  expect(payload).not.toHaveProperty('currency');
  await expect(page.getByText('Manual Quote', { exact: true })).toBeVisible();
  await expect(page.getByText('pmq_FixtureSnapshot01', { exact: true })).toBeVisible();
});

test('runs approval and fulfillment transitions through refreshed server truth', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      deliverables: fixtureInternalPaidPromotionCampaign.deliverables.map((deliverable) => ({
        ...deliverable,
        status: 'verified',
        publishedAtUtc: deliverable.plannedAtUtc,
        evidenceUrl: 'https://evidence.cassette.test/placement',
      })),
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Approve and schedule' }).click();
  await expect(page.getByText('Scheduled', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Start fulfillment' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Start fulfillment' }).click();
  await expect(page.getByText('Fulfilling', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Mark delivered' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Mark delivered' }).click();
  await expect(page.getByText('Delivered', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Complete campaign' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Complete campaign' }).click();
  await expect(page.getByText('Completed', { exact: true }).first()).toBeVisible();
});

test('supports rejection and deliverable CRUD without bypassing server refresh', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Add' }).click();
  let dialog = page.getByRole('dialog', { name: 'Add deliverable' });
  await dialog.getByLabel('Deliverable channel').selectOption('tiktok');
  await dialog.getByLabel('Internal notes').fill('Fixture TikTok placement');
  await dialog.getByRole('button', { name: 'Save deliverable' }).click();
  await expect(page.getByText('Fixture TikTok placement', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Tiktok deliverable' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit deliverable' });
  await dialog.getByLabel('Deliverable status').selectOption('scheduled');
  await dialog.getByLabel('Internal notes').fill('Scheduled TikTok placement');
  await dialog.getByRole('button', { name: 'Save deliverable' }).click();
  await expect(page.getByText('Scheduled TikTok placement', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Remove Tiktok deliverable' }).click();
  await page.getByRole('dialog', { name: 'Remove deliverable' })
    .getByRole('button', { name: 'Remove deliverable' }).click();
  await expect(page.getByText('Removed', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reject campaign' }).click();
  await expect(page.getByText('Rejected', { exact: true }).first()).toBeVisible();
});

test('shows only refund pending and leaves refunded totals unchanged', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Initiate refund' }).click();
  const refundRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/refund'),
  );
  await page.getByRole('dialog', { name: 'Initiate refund' })
    .getByRole('button', { name: 'Initiate refund' }).click();
  const request = await refundRequest;

  expect(request.postDataJSON()).toEqual({});
  await expect(page.getByText('Refund Pending', { exact: true })).toBeVisible();
  await expect(page.getByText('USD 0.00', { exact: true })).toBeVisible();
  await expect(page.getByText('Partially Refunded', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Refunded', { exact: true })).toHaveCount(0);
});

test('reloads webhook-owned truth when refund initiation loses a race', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionRefundRaceStatus: 'refunded',
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Initiate refund' }).click();
  await page.getByRole('dialog', { name: 'Initiate refund' })
    .getByRole('button', { name: 'Initiate refund' }).click();

  await expect(page.getByLabel('Paid promotions operations').getByRole('alert').filter({
    hasText: 'changed while the refund was being initiated',
  })).toBeVisible();
  await expect(page.getByText('Refunded', { exact: true })).toBeVisible();
  await expect(page.getByText('Refunded by webhook').locator('..')
    .getByText('USD 250.00', { exact: true })).toBeVisible();
  await expect(page.getByText('Refund Pending', { exact: true })).toHaveCount(0);
});

test('verifies exceptions against server detail before resolving them', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  const detailRequest = page.waitForRequest((request) =>
    request.method() === 'GET'
      && new URL(request.url()).pathname.endsWith('/exceptions/pmx_FixtureException01'),
  );
  await page.getByRole('button', { name: 'Verify resolution' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Verify and resolve' }).click();
  await detailRequest;

  await expect(page.getByText('Resolved', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Verify resolution' })).toHaveCount(0);
});

test('fails visibly for an unknown server state', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      status: 'future_state',
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await expect(page.getByRole('alert').filter({
    hasText: 'Campaign detail could not be shown.',
  })).toContainText('Invalid paid-promotion server response: campaign.status');
});

test('keeps non-team users out of the internal console', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member });
  await page.goto('/internal/paid-promotions');
  await expect(page).toHaveURL('/');
});

test('keeps the internal queue usable at a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });

  await page.goto('/internal/paid-promotions');
  await expect(page.getByRole('list', { name: 'Paid-promotion campaign queue' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Paid Promotions' })).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
});
