'use client';

import { useMemo } from 'react';
import { FileText, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import type { InternalIssueDetail } from '@/types';
import { formatDate } from './internal-utils';
import { EmptyState } from './empty-state';

interface IssueDetailPanelProps {
  issue: InternalIssueDetail | null;
  isLoading: boolean;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Separator />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Separator />
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

export function IssueDetailPanel({ issue, isLoading }: IssueDetailPanelProps) {
  const formattedPayload = useMemo(() => {
    if (!issue?.payload) return null;
    try {
      return JSON.stringify(JSON.parse(issue.payload), null, 2);
    } catch {
      return issue.payload;
    }
  }, [issue?.payload]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Issue Detail</CardTitle>
        <CardDescription>Payload and metadata captured via in-app report submissions.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <DetailSkeleton />
        ) : issue ? (
          <>
            {/* Header: Type + Context badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{issue.reportType}</Badge>
              <Badge variant="outline">{issue.sourceContext}</Badge>
            </div>

            <Separator />

            {/* Reporter */}
            <div className="flex items-center gap-3 text-sm">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {(issue.username || issue.userEmail || 'A').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{issue.username || issue.userEmail || 'Anonymous'}</p>
                <p className="text-xs text-muted-foreground">{formatDate(issue.createdAt)}</p>
              </div>
            </div>

            <Separator />

            {/* Metadata */}
            <div className="grid gap-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Issue ID</span>
                <span className="font-mono text-xs">{issue.id}</span>
              </div>
              {issue.pageUrl && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Page URL</span>
                  <a
                    href={issue.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[200px]"
                  >
                    {issue.pageUrl}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
              {issue.sourceLink && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Source Link</span>
                  <a
                    href={issue.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-[200px]"
                  >
                    {issue.sourceLink}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </div>
              )}
            </div>

            {/* Payload */}
            {formattedPayload && (
              <>
                <Separator />
                <Collapsible defaultOpen>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 px-0">
                      <FileText className="h-4 w-4" />
                      Payload
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ScrollArea className="max-h-[360px]">
                      <pre className="rounded-md border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap break-all">
                        {formattedPayload}
                      </pre>
                    </ScrollArea>
                  </CollapsibleContent>
                </Collapsible>
              </>
            )}
          </>
        ) : (
          <EmptyState icon={FileText} title="No issue selected" description="Select an issue to inspect details." />
        )}
      </CardContent>
    </Card>
  );
}
