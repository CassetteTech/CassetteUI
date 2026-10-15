import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getLastViewedSponsoredExplorePostId,
  rememberViewedSponsoredExplorePost,
} from '../sponsored-explore-rotation';
import { createMemoryStorage } from '../../lib/__tests__/memory-storage';

function withBrowserStorage(run: (storage: Storage) => void) {
  const globals = globalThis as { window?: { localStorage: Storage } };
  const storage = createMemoryStorage();
  globals.window = { localStorage: storage };
  try {
    run(storage);
  } finally {
    delete globals.window;
  }
}

test('remembers the last sponsored post that was actually viewed', () => {
  withBrowserStorage(() => {
    assert.equal(getLastViewedSponsoredExplorePostId(), undefined);
    rememberViewedSponsoredExplorePost('p_20260824000000_00000000000002');
    assert.equal(
      getLastViewedSponsoredExplorePostId(),
      'p_20260824000000_00000000000002',
    );
  });
});

test('ignores invalid values instead of sending arbitrary rotation state', () => {
  withBrowserStorage((storage) => {
    rememberViewedSponsoredExplorePost('not-a-post');
    assert.equal(storage.length, 0);
    assert.equal(getLastViewedSponsoredExplorePostId(), undefined);
  });
});
