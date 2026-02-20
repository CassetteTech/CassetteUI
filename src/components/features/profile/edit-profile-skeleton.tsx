'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function EditProfileSkeleton() {
  return (
    <div className="max-w-xl mx-auto">
      {/* Header skeleton */}
      <div className="text-center mb-8">
        <Skeleton className="h-9 w-48 sm:w-64 mx-auto mb-2" />
        <Skeleton className="h-5 w-64 sm:w-80 mx-auto" />
      </div>

      {/* Avatar skeleton */}
      <div className="flex justify-center mb-6">
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>

      {/* Form fields skeleton */}
      <div className="space-y-6">
        {/* Full Name field */}
        <div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Username field */}
        <div>
          <Skeleton className="h-4 w-20 mb-2" />
          <Skeleton className="h-10 w-full rounded-md" />
        </div>

        {/* Bio field */}
        <div>
          <Skeleton className="h-4 w-12 mb-2" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <Skeleton className="h-10 w-24 rounded-md" />
          <Skeleton className="h-10 flex-1 rounded-md" />
        </div>
      </div>

      {/* Music connections skeleton */}
      <div className="mt-8">
        <Skeleton className="h-6 w-48 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
