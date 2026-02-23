'use client';

import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import type { InternalAccountTypeAuditEntry } from '@/types';
import { normalizeAccountType, formatDate, accountTypeBadgeVariant, accountTypeBadgeClassName } from './internal-utils';
import { EmptyState } from './empty-state';

interface AuditLogTimelineProps {
  entries: InternalAccountTypeAuditEntry[];
  isLoading: boolean;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-4 pl-8 relative">
      <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="relative">
          <div className="absolute -left-8 top-1 h-2.5 w-2.5 rounded-full bg-muted" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-3 w-4" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AuditLogTimeline({ entries, isLoading }: AuditLogTimelineProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Type Audit Log</CardTitle>
        <CardDescription>Immutable history for account-type changes.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <TimelineSkeleton />
        ) : entries.length ? (
          <ScrollArea className="max-h-[420px]">
            <div className="space-y-4 pl-8 relative">
              <div className="absolute left-3 top-0 bottom-0 w-px bg-border" />
              {entries.map((entry) => {
                const before = normalizeAccountType(entry.beforeAccountType as string | number);
                const after = normalizeAccountType(entry.afterAccountType as string | number);
                const isUpgrade = after === 'Verified' || after === 'CassetteTeam';
                return (
                  <div key={entry.id} className="relative">
                    <div
                      className={`absolute -left-8 top-1 h-2.5 w-2.5 rounded-full ${
                        isUpgrade ? 'bg-success' : 'bg-warning'
                      }`}
                    />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={accountTypeBadgeVariant(before)} className={`text-xs ${accountTypeBadgeClassName(before)}`}>
                          {before}
                        </Badge>
                        <span className="text-xs text-muted-foreground">&rarr;</span>
                        <Badge variant={accountTypeBadgeVariant(after)} className={`text-xs ${accountTypeBadgeClassName(after)}`}>
                          {after}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{entry.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.actorUsername || entry.actorEmail || entry.actorUserId} &bull;{' '}
                        {formatDate(entry.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <EmptyState icon={Clock} title="No audit history" description="No audit entries for selected user." />
        )}
      </CardContent>
    </Card>
  );
}
