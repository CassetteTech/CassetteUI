'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function EditProfileSkeleton() {
  return (
    <div aria-hidden>
      <Skeleton className="mb-8 h-10 w-52" />
      <div className="space-y-12">
        {[5, 1, 3].map((rows, section) => (
          <div key={section}>
            <div className="border-b border-border pb-3">
              <Skeleton className="h-5 w-32" />
            </div>
            <div className="divide-y divide-border/60">
              {Array.from({ length: rows }, (_, row) => (
                <div key={row} className="grid gap-3 py-5 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-8">
                  <Skeleton className="h-4 w-20 sm:mt-2.5" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
