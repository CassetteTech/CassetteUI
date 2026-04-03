'use client';

import { useMemo } from 'react';
import { FileText, ExternalLink, Copy, Clock, Globe, Link, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

function MetadataRow({ icon: Icon, label, children }: { icon: React.ElementType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
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

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied`);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Issue Detail</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <DetailSkeleton />
        ) : issue ? (
          <div className="space-y-4">
            {/* Type + Context badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="default">{issue.reportType}</Badge>
              <Badge variant="outline">{issue.sourceContext}</Badge>
            </div>

            {/* Reporter */}
            <div className="flex items-center gap-3 rounded-lg bg-muted/40 p-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="text-xs font-medium bg-background">
                  {(issue.username || issue.userEmail || 'A').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {issue.username || issue.userEmail || 'Anonymous'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {issue.userEmail && issue.username ? issue.userEmail : ''}
                </p>
              </div>
            </div>

            {/* Metadata */}
            <div className="divide-y">
              <MetadataRow icon={FileText} label="Issue ID">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs truncate">{issue.id}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 shrink-0"
                    onClick={() => void handleCopy(issue.id, 'Issue ID')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </MetadataRow>

              <MetadataRow icon={Clock} label="Created">
                {formatDate(issue.createdAt)}
              </MetadataRow>

              {issue.pageUrl && (
                <MetadataRow icon={Globe} label="Page URL">
                  <a
                    href={issue.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-full"
                  >
                    <span className="truncate">{issue.pageUrl}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </MetadataRow>
              )}

              {issue.sourceLink && (
                <MetadataRow icon={Link} label="Source Link">
                  <a
                    href={issue.sourceLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline truncate max-w-full"
                  >
                    <span className="truncate">{issue.sourceLink}</span>
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </a>
                </MetadataRow>
              )}
            </div>

            {/* Payload */}
            {formattedPayload && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground">
                    <div className="flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5" />
                      Payload Data
                    </div>
                    <Badge variant="outline" className="text-[10px] h-4 px-1.5">JSON</Badge>
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="relative mt-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={() => void handleCopy(formattedPayload, 'Payload')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <ScrollArea className="max-h-[360px]">
                      <pre className="rounded-lg border bg-muted/30 p-3 pr-10 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                        {formattedPayload}
                      </pre>
                    </ScrollArea>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        ) : (
          <EmptyState icon={Inbox} title="No issue selected" description="Click an issue from the table to view its details and payload." />
        )}
      </CardContent>
    </Card>
  );
}
