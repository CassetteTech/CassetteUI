import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSponsoredExplorePlacementEnvelope } from '../sponsored-explore-contract';

test('normalizes the sponsored Explore envelope and forces the approved disclosure', () => {
  const placement = normalizeSponsoredExplorePlacementEnvelope({
    PlacementType: 'sponsored_explore',
    Label: 'Promoted',
    Post: { PostId: 'p_123', Title: 'A track' },
  });

  assert.equal(placement?.placementType, 'sponsored_explore');
  assert.equal(placement?.label, 'Sponsored');
  assert.equal(placement?.postPayload.PostId, 'p_123');
});

test('rejects unknown placement types and missing posts', () => {
  assert.equal(
    normalizeSponsoredExplorePlacementEnvelope({ placementType: 'organic', post: { postId: 'p_1' } }),
    undefined,
  );
  assert.equal(
    normalizeSponsoredExplorePlacementEnvelope({ placementType: 'sponsored_explore' }),
    undefined,
  );
  assert.equal(
    normalizeSponsoredExplorePlacementEnvelope({ placementType: 'sponsored_explore', post: {} }),
    undefined,
  );
});
