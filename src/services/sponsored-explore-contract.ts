export interface SponsoredExplorePlacementEnvelope {
  placementType: 'sponsored_explore';
  label: 'Sponsored';
  postPayload: Record<string, unknown>;
}

export function normalizeSponsoredExplorePlacementEnvelope(
  rawPlacement: unknown,
): SponsoredExplorePlacementEnvelope | undefined {
  if (!rawPlacement || typeof rawPlacement !== 'object') {
    return undefined;
  }

  const placement = rawPlacement as Record<string, unknown>;
  const placementType = placement.placementType ?? placement.PlacementType;
  const rawPost = placement.post ?? placement.Post;
  if (placementType !== 'sponsored_explore' || !rawPost || typeof rawPost !== 'object') {
    return undefined;
  }

  const postPayload = rawPost as Record<string, unknown>;
  const postId = postPayload.postId ?? postPayload.PostId;
  if (typeof postId !== 'string' || postId.trim() === '') {
    return undefined;
  }

  return {
    placementType: 'sponsored_explore',
    label: 'Sponsored',
    postPayload,
  };
}
