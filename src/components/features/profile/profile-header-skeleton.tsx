'use client';

import { Skeleton } from '@/components/ui/skeleton';

interface ProfileHeaderSkeletonProps {
  isSmallScreen?: boolean;
  isLargeScreen?: boolean;
}

export function ProfileHeaderSkeleton({
  isSmallScreen = false,
  isLargeScreen = false
}: ProfileHeaderSkeletonProps) {
  const avatarSize = isSmallScreen ? 'w-12 h-12' : isLargeScreen ? 'w-24 h-24 lg:w-32 lg:h-32' : 'w-16 h-16';
  const padding = isSmallScreen ? 'p-3' : isLargeScreen ? 'p-4' : 'p-3';

  return (
    <div className={`text-card-foreground ${padding} lg:bg-transparent lg:p-0`}>
      <div className="flex flex-col gap-3 bg-transparent p-4 lg:p-0 rounded-lg lg:rounded-none">
        {/* Top Row: Avatar + User Info */}
        <div className="flex items-start gap-4 lg:gap-6">
          {/* Avatar Skeleton */}
          <Skeleton className={`${avatarSize} rounded-full flex-shrink-0`} />

          {/* User Info Skeleton */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <Skeleton className={`h-7 w-40 ${isLargeScreen ? 'h-9 w-56' : ''}`} />
            </div>
            <Skeleton className="h-5 w-24 mb-2" />
          </div>
        </div>

        {/* Bio Skeleton - Fixed min-height to prevent shifts */}
        <div className="min-h-[48px] lg:min-h-[56px]">
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>

        {/* Connected Services Skeleton */}
        <div className="flex items-center mb-4 gap-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="w-6 h-6 rounded-full" />
          ))}
        </div>

        {/* Action Buttons Skeleton */}
        <div className="flex gap-3 lg:flex-col lg:gap-4">
          <Skeleton className={`${isLargeScreen ? 'w-[200px] h-12' : isSmallScreen ? 'w-[120px] h-8' : 'w-[132px] h-9'} rounded-xl`} />
          <Skeleton className={`${isLargeScreen ? 'w-[200px] h-12' : isSmallScreen ? 'w-[120px] h-8' : 'w-[132px] h-9'} rounded-xl`} />
        </div>
      </div>
    </div>
  );
}
