'use client';

import { AlertCircle, Clock, User } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { InternalIssueSummary } from '@/types';
import { formatDate } from './internal-utils';
import { IssuesTableSkeleton, IssuesCardSkeleton } from './issues-table-skeleton';
import { EmptyState } from './empty-state';

interface IssuesTableProps {
  issues: InternalIssueSummary[];
  isLoading: boolean;
  selectedIssueId: string | null;
  onSelectIssue: (issue: InternalIssueSummary) => void;
}

function reportTypeBadgeClass(type: string) {
  const t = type.toLowerCase();
  if (t.includes('bug') || t.includes('error')) return 'bg-destructive/10 text-destructive border-destructive/20';
  if (t.includes('feature') || t.includes('request')) return 'bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/20';
  if (t.includes('feedback')) return 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20';
  return 'bg-muted text-muted-foreground';
}

export function IssuesTable({ issues, isLoading, selectedIssueId, onSelectIssue }: IssuesTableProps) {
  if (isLoading) {
    return (
      <>
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">ID</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Context</TableHead>
                <TableHead>Reporter</TableHead>
                <TableHead className="text-right">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <IssuesTableSkeleton />
            </TableBody>
          </Table>
        </div>
        <IssuesCardSkeleton />
      </>
    );
  }

  if (!issues.length) {
    return <EmptyState icon={AlertCircle} title="No issues found" description="No issues match your current filters." />;
  }

  return (
    <>
      {/* Desktop table */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Reporter</TableHead>
              <TableHead className="text-right">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => {
              const isSelected = selectedIssueId === issue.id;
              return (
                <TableRow
                  key={issue.id}
                  className={`cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-primary/5 ring-1 ring-inset ring-primary/20'
                      : 'hover:bg-muted/40'
                  }`}
                  onClick={() => onSelectIssue(issue)}
                >
                  <TableCell>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {issue.id.length > 8 ? `${issue.id.slice(0, 8)}...` : issue.id}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`text-[11px] font-medium ${reportTypeBadgeClass(issue.reportType)}`}>
                      {issue.reportType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{issue.sourceContext}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-muted">
                        <User className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <span className="text-sm">{issue.username || issue.userEmail || 'Anonymous'}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDate(issue.createdAt)}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="space-y-2 lg:hidden">
        {issues.map((issue) => {
          const isSelected = selectedIssueId === issue.id;
          return (
            <div
              key={issue.id}
              className={`cursor-pointer rounded-lg border p-3 transition-all ${
                isSelected
                  ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/10'
                  : 'hover:bg-muted/30 hover:border-border/80'
              }`}
              onClick={() => onSelectIssue(issue)}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] text-muted-foreground">
                  {issue.id.length > 8 ? `${issue.id.slice(0, 8)}...` : issue.id}
                </span>
                <Badge variant="outline" className={`text-[10px] font-medium ${reportTypeBadgeClass(issue.reportType)}`}>
                  {issue.reportType}
                </Badge>
              </div>
              <p className="text-sm font-medium mt-1.5">{issue.sourceContext}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {issue.username || issue.userEmail || 'Anonymous'}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatDate(issue.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
