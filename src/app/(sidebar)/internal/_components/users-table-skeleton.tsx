'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { TableRow, TableCell } from '@/components/ui/table';

export function UsersTableSkeleton() {
  return (
    <>
      {/* Desktop skeleton rows */}
      <div className="hidden lg:contents">
        {Array.from({ length: 5 }).map((_, i) => (
          <TableRow key={i}>
            <TableCell><Skeleton className="h-4 w-24" /></TableCell>
            <TableCell><Skeleton className="h-4 w-36" /></TableCell>
            <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
            <TableCell><Skeleton className="h-4 w-10" /></TableCell>
            <TableCell><Skeleton className="h-4 w-28" /></TableCell>
            <TableCell><Skeleton className="h-4 w-6" /></TableCell>
            <TableCell><Skeleton className="h-4 w-8" /></TableCell>
          </TableRow>
        ))}
      </div>
    </>
  );
}

export function UsersCardSkeleton() {
  return (
    <div className="space-y-3 lg:hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-16 rounded-md" />
          </div>
          <Skeleton className="h-3 w-36" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
