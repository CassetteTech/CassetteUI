'use client';

import { Skeleton } from '@/components/ui/skeleton';

const avatarBlob = { borderRadius: '60% 40% 55% 45% / 55% 45% 55% 45%' } as const;

/**
 * ProfileHeader's line boxes: the avatar row with the name, handle, Follow, and Share, then two bio
 * lines and Show more.
 */
export function ProfileHeaderSkeleton() {
  return (
    <div aria-hidden className="flex flex-col gap-3 px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-14 shrink-0" style={avatarBlob} />
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex h-[1.5625rem] items-center">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="flex h-4 items-center">
              <Skeleton className="h-2.5 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-[5.5rem] shrink-0" />
          <div className="-mr-2 flex size-10 shrink-0 items-center justify-center">
            <Skeleton className="size-5" />
          </div>
        </div>
      </div>
      <div>
        <div className="flex flex-col text-sm leading-relaxed">
          <div className="flex h-[1lh] items-center"><Skeleton className="h-3.5 w-full" /></div>
          <div className="flex h-[1lh] items-center"><Skeleton className="h-3.5 w-3/4" /></div>
        </div>
        <div className="mt-1 flex h-[0.9375rem] items-center">
          <Skeleton className="h-2.5 w-20" />
        </div>
      </div>
    </div>
  );
}
