'use client';

import { AlertCircle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

export function IssuesTable({ issues, isLoading, selectedIssueId, onSelectIssue }: IssuesTableProps) {
  if (isLoading) {
    return (
      <>
        <div className="hidden lg:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Issue ID</TableHead>
                <TableHead>Report Type</TableHead>
                <TableHead>Source Context</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Created</TableHead>
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
              <TableHead>Issue ID</TableHead>
              <TableHead>Report Type</TableHead>
              <TableHead>Source Context</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => {
              const isSelected = selectedIssueId === issue.id;
              return (
                <TableRow
                  key={issue.id}
                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/40'}`}
                  onClick={() => onSelectIssue(issue)}
                >
                  <TableCell className="font-mono text-xs">{issue.id}</TableCell>
                  <TableCell>{issue.reportType}</TableCell>
                  <TableCell>{issue.sourceContext}</TableCell>
                  <TableCell>{issue.username || issue.userEmail || 'Anonymous'}</TableCell>
                  <TableCell>{formatDate(issue.createdAt)}</TableCell>
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
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-l-primary' : 'hover:bg-muted/30'}`}
              onClick={() => onSelectIssue(issue)}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">{issue.id}</span>
                <span className="text-xs font-medium">{issue.reportType}</span>
              </div>
              <p className="text-sm font-medium mt-1">{issue.sourceContext}</p>
              <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                <span>{issue.username || issue.userEmail || 'Anonymous'}</span>
                <span>{formatDate(issue.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
