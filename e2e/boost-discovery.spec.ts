/** Verifies that closed Boost sales leave no discovery links, while customers keep a way to their campaign records. */

import { expect, type Page, test } from '@playwright/test';
import {
  fixturePaidPromotionCampaign,
  fixturePaidPromotionSubjects,
  fixtureUsers,
} from './support/cassette-fixtures';
import { mockCassetteApp } from './support/mock-cassette-app';

const promoteLinks = (page: Page) => page.locator('a[href="/promote"]');

// A rejected campaign whose payment is being refunded: a record with a receipt and a refund.
const refundingCampaign = {
  ...fixturePaidPromotionCampaign,
  status: 'rejected',
  rejectionReason: 'Track rights could not be verified.',
  paymentStatus: 'refund_pending',
  discountAmountMinor: 0,
  taxAmountMinor: 0,
  finalTotalMinor: fixturePaidPromotionCampaign.amountMinor,
  amountRefundedMinor: 0,
  refundableRemainderMinor: fixturePaidPromotionCampaign.amountMinor,
} as const;

/** Navigates once Bridge has answered the availability read, so a hidden link
    means sales are closed rather than not yet known. */
async function visit(page: Page, path: string) {
  const availability = page.waitForResponse('**/api/v1/paid-promotions/availability');
  await page.goto(path);
  await availability;
}

test('hides Boost discovery while sales are closed and keeps the direct page', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, paidPromotionSalesEnabled: false });

  const ownedCampaigns = page.waitForResponse('**/api/v1/paid-promotions/campaigns');
  await visit(page, '/');
  await ownedCampaigns;
  await expect(page.getByText('Make music?')).toHaveCount(0);
  await expect(promoteLinks(page)).toHaveCount(0);
  // The signed-in pill only links to the profile; the account routes live in the sidebar and the menu.
  await expect(page.getByTestId('navbar-profile-link')).toHaveAttribute('href', `/profile/${fixtureUsers.member.username}`);

  await visit(page, '/explore');
  await expect(page.locator('footer').last()).toContainText('Release Notes');
  await expect(promoteLinks(page)).toHaveCount(0);

  await visit(page, '/memberships');
  await expect(page.getByRole('heading', { name: 'Memberships', level: 1 })).toBeVisible();
  await expect(promoteLinks(page)).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/explore');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('#mobile-menu-panel')).toBeVisible();
  await expect(promoteLinks(page)).toHaveCount(0);

  await visit(page, '/promote');
  await expect(page.getByRole('heading', { name: 'Boost is not available yet' })).toBeVisible();
});

// Closing sales hides the public offer, not a customer's own records: the
// account link stays, and it leads to the campaign, its receipt, and its refund.
test('keeps the campaign link for a customer with campaigns while sales are closed', async ({ page }) => {
  await mockCassetteApp(page, {
    currentUser: fixtureUsers.member,
    paidPromotionSalesEnabled: false,
    paidPromotionCampaigns: [refundingCampaign],
    paidPromotionSubjects: fixturePaidPromotionSubjects,
  });

  await visit(page, '/');
  await expect(page.getByText('Make music?')).toHaveCount(0);
  await visit(page, '/explore');
  await expect(page.getByRole('link', { name: 'Promote your music' })).toHaveCount(0);
  await expect(page.locator('footer a[href="/promote"]')).toHaveCount(0);
  await expect(promoteLinks(page).filter({ hasNotText: 'Your Campaigns' })).toHaveCount(0);

  // On desktop the customer reaches the campaigns from the sidebar, which shows one /promote row.
  await visit(page, '/memberships');
  const sidebarFooter = page.locator('[data-slot="sidebar-footer"]');
  await expect(sidebarFooter.getByRole('link', { name: 'Promote', exact: true })).toHaveCount(0);
  await sidebarFooter.getByRole('link', { name: 'Your Campaigns' }).click();

  await expect(page).toHaveURL(/\/promote$/);
  await expect(page.getByRole('heading', { name: 'Promotion home' })).toBeVisible();
  await expect(page.locator('a[href^="/promote/new"]')).toHaveCount(0);
  await page.getByTestId(`paid-promotion-campaign-link-${refundingCampaign.id}`).click();
  const payment = page.getByRole('region', { name: 'Payment & receipt' });
  await expect(payment).toContainText('Refund in progress');
  await page.goto(`/promote/${refundingCampaign.id}/return`);
  await expect(page.getByTestId('paid-promotion-campaign-status')).toContainText('refunded in full');
  await expect(page.getByTestId('paid-promotion-reopen-checkout')).toHaveCount(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await visit(page, '/explore');
  await page.getByRole('button', { name: 'Open menu' }).click();
  const menu = page.locator('#mobile-menu-panel');
  await expect(menu.getByRole('link', { name: 'Your Campaigns' })).toHaveAttribute('href', '/promote');
  await expect(menu.getByRole('link', { name: 'Promote', exact: true })).toHaveCount(0);
  await expect(promoteLinks(page)).toHaveCount(1);
});

test('shows Boost discovery once sales are open', async ({ page }) => {
  await mockCassetteApp(page, { currentUser: fixtureUsers.member, paidPromotionSalesEnabled: true });

  await visit(page, '/explore');
  await expect(page.getByRole('link', { name: 'Promote your music' })).toBeVisible();

  // Below 1024 px the menu holds the account routes, Your Campaigns among them.
  await page.setViewportSize({ width: 900, height: 900 });
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.locator('#mobile-menu-panel').getByRole('link', { name: 'Your Campaigns' })).toBeVisible();
  await page.getByRole('button', { name: 'Close menu' }).click();
  await page.setViewportSize({ width: 1280, height: 720 });

  // The sidebar shows one row for /promote: Promote while sales are open.
  await visit(page, '/memberships');
  const sidebarFooter = page.locator('[data-slot="sidebar-footer"]');
  await expect(sidebarFooter.getByRole('link', { name: 'Promote', exact: true })).toHaveAttribute('href', '/promote');
  await expect(sidebarFooter.getByRole('link', { name: 'Your Campaigns' })).toHaveCount(0);
});
