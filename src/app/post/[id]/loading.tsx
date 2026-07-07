import { EntitySkeleton } from '@/components/features/entity/entity-skeleton';

/**
 * Route-level loading boundary for /post/[id].
 *
 * Reuses the same EntitySkeleton that PostClientPage shows while fetching,
 * so route transition -> client data load reads as one continuous skeleton.
 * Having this boundary also lets Next commit navigation instantly and
 * prefetch the segment from <Link>, instead of blocking the click on the
 * server response.
 */
export default function Loading() {
  return <EntitySkeleton />;
}
