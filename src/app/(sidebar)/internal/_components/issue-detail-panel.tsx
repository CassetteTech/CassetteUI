'use client';

import { useMemo, useState } from 'react';
import {
  FileText,
  ExternalLink,
  Copy,
  Globe,
  Link,
  Inbox,
  MessageSquare,
  Music,
  Monitor,
  ChevronDown,
  Code,
} from 'lucide-react';
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

interface ParsedPayload {
  description?: string;
  context?: {
    elementType?: string;
    title?: string;
    artist?: string;
    platforms?: Record<string, unknown>;
    userTimezone?: string;
    screenSize?: string;
    [key: string]: unknown;
  };
  reportType?: string;
  sourceContext?: string;
  pageUrl?: string;
  sourceLink?: string;
  [key: string]: unknown;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-20 rounded-md" />
        <Skeleton className="h-5 w-24 rounded-md" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg" />
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-3/4" />
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

function reportTypeLabel(type: string) {
  const labels: Record<string, string> = {
    conversion_issue: 'Conversion Problem',
    missing_track: 'Missing Track/Album',
    wrong_match: 'Wrong Match',
    ui_bug: 'UI/App Bug',
    general_feedback: 'General Feedback',
  };
  return labels[type] ?? type;
}

function reportTypeBadgeClass(type: string) {
  const t = type.toLowerCase();
  if (t.includes('bug') || t.includes('error') || t === 'conversion_issue' || t === 'wrong_match')
    return 'bg-destructive/10 text-destructive border-destructive/20';
  if (t.includes('feature') || t === 'missing_track')
    return 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/20';
  if (t.includes('feedback') || t === 'general_feedback')
    return 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20';
  return 'bg-muted text-muted-foreground';
}

export function IssueDetailPanel({ issue, isLoading }: IssueDetailPanelProps) {
  const [showRawJson, setShowRawJson] = useState(false);

  const { parsed, formattedJson } = useMemo(() => {
    if (!issue?.payload) return { parsed: null, formattedJson: null };
    try {
      const obj = JSON.parse(issue.payload) as ParsedPayload;
      return {
        parsed: obj,
        formattedJson: JSON.stringify(obj, null, 2),
      };
    } catch {
      return { parsed: null, formattedJson: issue.payload };
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

  // Extract structured fields from parsed payload
  const description = parsed?.description;
  const context = parsed?.context;
  const hasMusicContext = context?.title || context?.artist || context?.elementType;
  const platforms = context?.platforms;
  const hasEnvironment = context?.userTimezone || context?.screenSize;

  // Collect any extra context fields not already displayed
  const extraContextFields = useMemo(() => {
    if (!context) return [];
    const knownKeys = new Set(['elementType', 'title', 'artist', 'platforms', 'userTimezone', 'screenSize']);
    return Object.entries(context).filter(([key]) => !knownKeys.has(key) && context[key] != null);
  }, [context]);

  // Collect extra top-level payload fields not already displayed
  const extraPayloadFields = useMemo(() => {
    if (!parsed) return [];
    const knownKeys = new Set(['reportType', 'sourceContext', 'pageUrl', 'sourceLink', 'description', 'context']);
    return Object.entries(parsed).filter(([key]) => !knownKeys.has(key) && parsed[key] != null);
  }, [parsed]);

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
              <Badge variant="outline" className={`text-[11px] font-medium ${reportTypeBadgeClass(issue.reportType)}`}>
                {reportTypeLabel(issue.reportType)}
              </Badge>
              <Badge variant="outline" className="text-[11px]">{issue.sourceContext}</Badge>
            </div>

            {/* User description - the most important content, shown prominently */}
            {description && (
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-start gap-2 mb-1.5">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">User Message</span>
                </div>
                <p className="text-sm leading-relaxed pl-5.5">{description}</p>
              </div>
            )}

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
              <div className="text-right shrink-0">
                <p className="text-[11px] text-muted-foreground">{formatDate(issue.createdAt)}</p>
              </div>
            </div>

            {/* Music/Conversion Context */}
            {hasMusicContext && (
              <div className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-1.5">
                  <Music className="h-3.5 w-3.5 text-primary" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Content Details</span>
                </div>
                <div className="grid gap-1.5 pl-5">
                  {context?.title && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-12">Title</span>
                      <span className="text-sm font-medium">{context.title}</span>
                    </div>
                  )}
                  {context?.artist && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-12">Artist</span>
                      <span className="text-sm">{context.artist}</span>
                    </div>
                  )}
                  {context?.elementType && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 w-12">Type</span>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">{context.elementType}</Badge>
                    </div>
                  )}
                </div>

                {/* Platform availability */}
                {platforms && Object.keys(platforms).length > 0 && (
                  <div className="pl-5 pt-1">
                    <span className="text-[11px] text-muted-foreground">Platforms:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {Object.entries(platforms).map(([platform, data]) => {
                        const hasData = data != null && data !== false && data !== '';
                        return (
                          <Badge
                            key={platform}
                            variant="outline"
                            className={`text-[10px] h-4 px-1.5 ${
                              hasData
                                ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {platform}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Links & Metadata */}
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

            {/* Environment info */}
            {hasEnvironment && (
              <div className="flex items-center gap-3 rounded-md bg-muted/30 px-3 py-2">
                <Monitor className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                  {context?.screenSize && <span>{context.screenSize}</span>}
                  {context?.screenSize && context?.userTimezone && <span className="text-border">|</span>}
                  {context?.userTimezone && <span>{context.userTimezone}</span>}
                </div>
              </div>
            )}

            {/* Extra context/payload fields not covered above */}
            {(extraContextFields.length > 0 || extraPayloadFields.length > 0) && (
              <div className="rounded-lg border p-3 space-y-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Additional Data</span>
                <div className="grid gap-1">
                  {extraPayloadFields.map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">{key}</span>
                      <span className="text-xs break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                  {extraContextFields.map(([key, value]) => (
                    <div key={key} className="flex items-baseline gap-2">
                      <span className="text-[11px] text-muted-foreground shrink-0 font-mono">context.{key}</span>
                      <span className="text-xs break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Raw JSON - collapsed by default */}
            {formattedJson && (
              <Collapsible open={showRawJson} onOpenChange={setShowRawJson}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between gap-2 h-7 px-2 text-[11px] font-medium text-muted-foreground hover:text-foreground">
                    <div className="flex items-center gap-1.5">
                      <Code className="h-3 w-3" />
                      Raw JSON
                    </div>
                    <ChevronDown className={`h-3 w-3 transition-transform ${showRawJson ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="relative mt-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 z-10"
                      onClick={() => void handleCopy(formattedJson, 'Payload')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <ScrollArea className="max-h-[300px]">
                      <pre className="rounded-lg border bg-muted/30 p-3 pr-10 text-[11px] font-mono leading-relaxed whitespace-pre-wrap break-all">
                        {formattedJson}
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
