import assert from 'node:assert/strict';
import test from 'node:test';
import { GET } from '../.well-known/apple-app-site-association/route';

void test('the app site association is JSON that opens only profile, post, memberships, and feed links in the iOS app', async () => {
  const response = GET();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');
  assert.deepEqual(await response.json(), {
    applinks: {
      details: [
        {
          appIDs: ['9LYHZBVHB7.com.matttoppi.CassetteApp'],
          components: [
            { '/': '/profile/edit', exclude: true },
            { '/': '/profile/*' },
            { '/': '/post/*' },
            { '/': '/memberships' },
            { '/': '/feed' },
          ],
        },
      ],
    },
  });
});
