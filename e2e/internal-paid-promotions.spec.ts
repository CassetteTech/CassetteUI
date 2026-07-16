import { expect, test } from '@playwright/test';
import {
  fixtureInternalPaidPromotionCampaign,
  fixturePaidPromotionCampaign,
  fixturePaidPromotionRateCards,
  fixturePaidPromotionSubjects,
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
  await expect(page.getByText('Quote / subtotal', { exact: true }).last().locator('..'))
    .toContainText('USD 250.00');
  await expect(page.getByText('Discount', { exact: true }).locator('..'))
    .toContainText('USD 50.00');
  await expect(page.getByText('Tax', { exact: true }).locator('..'))
    .toContainText('USD 15.00');
  await expect(page.getByText('Final total', { exact: true }).locator('..'))
    .toContainText('USD 215.00');
  await expect(page.getByText('Refundable remainder', { exact: true }).locator('..'))
    .toContainText('USD 215.00');
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
  const canonicalPostId = 'p_20260715120000_abcdefghijklmn';

  await page.getByRole('button', { name: 'Add' }).click();
  let dialog = page.getByRole('dialog', { name: 'Add deliverable' });
  await dialog.getByLabel('Deliverable channel').selectOption('tiktok');
  await dialog.getByLabel('Canonical post ID').fill(canonicalPostId);
  await dialog.getByLabel('Internal notes').fill('Fixture TikTok placement');
  const createRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/deliverables'),
  );
  await dialog.getByRole('button', { name: 'Save deliverable' }).click();
  expect((await createRequest).postDataJSON()).toMatchObject({ postId: canonicalPostId });
  await expect(page.getByText('Fixture TikTok placement', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: canonicalPostId })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Tiktok deliverable' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit deliverable' });
  await expect(dialog.getByLabel('Canonical post ID')).toHaveValue(canonicalPostId);
  await dialog.getByLabel('Deliverable status').selectOption('scheduled');
  await dialog.getByLabel('Internal notes').fill('Scheduled TikTok placement');
  const preserveRequest = page.waitForRequest((request) =>
    request.method() === 'PUT' && new URL(request.url()).pathname.includes('/deliverables/'),
  );
  await dialog.getByRole('button', { name: 'Save deliverable' }).click();
  expect((await preserveRequest).postDataJSON()).toMatchObject({ postId: canonicalPostId });
  await expect(page.getByText('Scheduled TikTok placement', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Edit Tiktok deliverable' }).click();
  dialog = page.getByRole('dialog', { name: 'Edit deliverable' });
  await dialog.getByLabel('Canonical post ID').fill('');
  const clearRequest = page.waitForRequest((request) =>
    request.method() === 'PUT' && new URL(request.url()).pathname.includes('/deliverables/'),
  );
  await dialog.getByRole('button', { name: 'Save deliverable' }).click();
  expect((await clearRequest).postDataJSON()).toMatchObject({ postId: null });
  await expect(page.getByRole('link', { name: canonicalPostId })).toHaveCount(0);

  await page.getByRole('button', { name: 'Remove Tiktok deliverable' }).click();
  await page.getByRole('dialog', { name: 'Remove deliverable' })
    .getByRole('button', { name: 'Remove deliverable' }).click();
  await expect(page.getByText('Removed', { exact: true }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Reject' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Reject campaign' }).click();
  await expect(page.getByText('Rejected', { exact: true }).first()).toBeVisible();
});

test('shows the team subject catalog once through the paid-promotion shell', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });

  await page.goto('/internal/paid-promotions');
  await page.getByRole('link', { name: 'Subjects' }).click();

  await expect(page).toHaveURL('/internal/paid-promotions/subjects');
  await expect(page.getByRole('heading', { name: 'Subjects', level: 1 })).toHaveCount(1);
  const subjectTable = page.getByRole('table', { name: 'Paid-promotion canonical subject catalog' });
  await expect(subjectTable).toBeVisible();
  await expect(page.getByRole('cell', { name: /Signal Fire/ })).toBeVisible();
  await expect(subjectTable.getByText('In Review · 1', { exact: true })).toBeVisible();
  await expect(subjectTable.getByText('Completed · 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Focus on the release story and live arrangement.')).toHaveCount(0);
  await expect(page.getByText('pmp_FixturePayment01')).toHaveCount(0);
});

test('shows subject loading, empty, authorization-error, and unknown states visibly', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionSubjectsDelayMs: 250,
  });
  await page.goto('/internal/paid-promotions/subjects');
  await expect(page.getByText('Loading paid-promotion subjects…')).toBeVisible();
  await expect(page.getByRole('table', { name: 'Paid-promotion canonical subject catalog' })).toBeVisible();

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionSubjects: [],
  });
  await page.reload();
  await expect(page.getByText('No promoted subjects', { exact: true })).toBeVisible();

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionSubjectsStatus: 403,
  });
  await page.reload();
  await expect(page.getByRole('alert').filter({
    hasText: 'Paid-promotion subjects could not be shown.',
  })).toBeVisible();

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionSubjects: [{
      ...fixturePaidPromotionSubjects[0],
      campaignStatusCounts: { future_state: 2 },
    }],
  });
  await page.reload();
  await expect(page.getByRole('alert').filter({
    hasText: 'Invalid paid-promotion subject response: subjects[0].campaignStatusCounts.future_state.',
  })).toBeVisible();
});

test('keeps the subject catalog usable at a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await mockCassetteApp(page, { currentUser: fixtureUsers.team });

  await page.goto('/internal/paid-promotions/subjects');
  await expect(page.getByRole('list', { name: 'Paid-promotion canonical subject catalog' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Subjects', level: 1 })).toHaveCount(1);
  await expect.poll(() => page.evaluate(() => {
    const documentWidth = Math.max(
      document.documentElement.scrollWidth,
      document.body.scrollWidth,
    );
    return documentWidth - window.innerWidth;
  })).toBeLessThanOrEqual(1);
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
  await expect(page.getByText('Refunded amount').locator('..')
    .getByText('USD 215.00', { exact: true })).toBeVisible();
  await expect(page.getByText('Refund Pending', { exact: true })).toHaveCount(0);
});

test('validates partial refunds against only the server-returned remainder', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      payment: {
        ...fixtureInternalPaidPromotionCampaign.payment!,
        amountRefundedMinor: 17500,
        refundableRemainderMinor: 4000,
        status: 'partially_refunded',
      },
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await page.getByRole('button', { name: 'Initiate refund' }).click();
  const dialog = page.getByRole('dialog', { name: 'Initiate refund' });
  await dialog.getByLabel('Amount in minor units (optional)').fill('4001');
  await dialog.getByRole('button', { name: 'Initiate refund' }).click();
  await expect(dialog.getByRole('alert')).toContainText('server-returned remainder of 4000 minor units');

  await dialog.getByLabel('Amount in minor units (optional)').fill('4000');
  const refundRequest = page.waitForRequest((request) =>
    request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/refund'),
  );
  await dialog.getByRole('button', { name: 'Initiate refund' }).click();
  expect((await refundRequest).postDataJSON()).toEqual({ amountMinor: 4000 });
});

test('shows zero-total and unknown checkout totals as non-refundable', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      payment: {
        ...fixtureInternalPaidPromotionCampaign.payment!,
        discountAmountMinor: fixtureInternalPaidPromotionCampaign.payment!.amountMinor,
        taxAmountMinor: 0,
        finalTotalMinor: 0,
        amountRefundedMinor: 0,
        refundableRemainderMinor: 0,
      },
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await expect(page.getByText('This zero-total campaign has no refundable charge.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Initiate refund' })).toBeDisabled();

  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      payment: {
        ...fixtureInternalPaidPromotionCampaign.payment!,
        discountAmountMinor: null,
        taxAmountMinor: null,
        finalTotalMinor: null,
        refundableRemainderMinor: null,
      },
    },
  });
  await page.reload();

  await expect(page.getByRole('alert').filter({ hasText: 'Checkout totals are unavailable' }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Initiate refund' })).toBeDisabled();
});

test('rejects arithmetically inconsistent checkout totals visibly', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.team,
    internalPaidPromotionCampaign: {
      ...fixtureInternalPaidPromotionCampaign,
      payment: {
        ...fixtureInternalPaidPromotionCampaign.payment!,
        finalTotalMinor: 22000,
      },
    },
  });
  await page.goto('/internal/paid-promotions/' + fixturePaidPromotionCampaign.id);

  await expect(page.getByRole('alert').filter({
    hasText: 'Campaign detail could not be shown.',
  })).toContainText('Invalid paid-promotion server response: campaign.payment.finalTotalMinor');
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
