'use client';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * ProfileHeader's line boxes: the avatar beside the name, handle, and likes count,
 * then one bio line, in the same card.
 */
export function ProfileHeaderSkeleton() {
  return (
    <div aria-hidden className="px-3 pt-3 sm:px-4 sm:pt-4">
      <div className="card-quiet flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex items-start gap-4">
          <Skeleton className="size-[4.5rem] shrink-0 rounded-full sm:size-24" />
          <div className="min-w-0 flex-1">
            <div className="flex h-[1.875rem] items-center sm:h-10">
              <Skeleton className="h-6 w-40 sm:h-7 sm:w-48" />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className="h-2.5 w-24" />
            </div>
            <div className="mt-2 flex h-[1.875rem] items-center">
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
        <div className="flex h-[1.421875rem] items-center sm:h-6">
          <Skeleton className="h-3.5 w-3/4" />
        </div>
      </div>
    </div>
  );
}
