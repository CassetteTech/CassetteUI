import type { Page } from '@playwright/test';
import { fixtureCuratorPage } from './cassette-fixtures';

const NAME = fixtureCuratorPage.curator.displayName!;

// Exact name: "Follow Crate Keeper" is also a substring of "Unfollow Crate Keeper".
export const followButton = (page: Page) =>
  page.getByRole('button', { name: `Follow ${NAME}`, exact: true }).filter({ visible: true });

export const followWrites = (state: { curatorFollowRequests: Array<{ method: string }> }) =>
  state.curatorFollowRequests.filter(({ method }) => method !== 'GET').map(({ method }) => method);
