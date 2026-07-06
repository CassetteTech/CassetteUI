'use client';

import { useState } from 'react';
import Link from 'next/link';
import { User, Copy, Check, ExternalLink } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { InternalUserDetail } from '@/types';
import { Panel, Field, Stat, StatusPill, type Tone } from './kit';
import { normalizeAccountType, formatDate } from './internal-utils';
import { UserAccountTypeControls } from './user-account-type-controls';

interface UserDetailPanelProps {
  user: InternalUserDetail | null;
  isLoading: boolean;
  selectedUserAccountType: ReturnType<typeof normalizeAccountType>;
  actorCanAssignVerified: boolean;
  targetAccountType: 'Regular' | 'Verified' | 'CassetteTeam';
  onTargetAccountTypeChange: (value: 'Regular' | 'Verified' | 'CassetteTeam') => void;
  targetCanAssignVerified: boolean;
  onTargetCanAssignVerifiedChange: (value: boolean) => void;
  accountTypeReason: string;
  onReasonChange: (reason: string) => void;
  updatingAccountType: boolean;
  onUpdateAccountType: () => void;
}

const TYPE_PILL: Record<string, { tone: Tone; label: string }> = {
  CassetteTeam: { tone: 'domain', label: 'Team' },
  Verified: { tone: 'info', label: 'Verified' },
  Regular: { tone: 'neutral', label: 'Regular' },
  Unknown: { tone: 'neutral', label: '—' },
};

export function UserDetailPanel({
  user,
  isLoading,
  selectedUserAccountType,
  actorCanAssignVerified,
  targetAccountType,
  onTargetAccountTypeChange,
  targetCanAssignVerified,
  onTargetCanAssignVerifiedChange,
  accountTypeReason,
  onReasonChange,
  updatingAccountType,
  onUpdateAccountType,
}: UserDetailPanelProps) {
  const [copied, setCopied] = useState(false);

  const copyId = async (id: string) => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isLoading) {
    return (
      <Panel title="User">
        <div className="space-y-2 p-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-full animate-pulse rounded bg-muted" />
          ))}
        </div>
      </Panel>
    );
  }

  if (!user) {
    return (
      <Panel title="User">
        <div className="flex flex-col items-center gap-1 px-4 py-12 text-center">
          <User className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">Select a user to inspect.</p>
        </div>
      </Panel>
    );
  }

  const pill = TYPE_PILL[selectedUserAccountType] ?? TYPE_PILL.Unknown;
  const profileHref = `/profile/${user.username}`;

  return (
    <Panel
      title="User"
      actions={
        <Link
          href={profileHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium text-domain transition-colors hover:bg-domain/10"
        >
          Profile
          <ExternalLink className="h-3 w-3" />
        </Link>
      }
    >
      {/* Identity — avatar + name link straight to the profile */}
      <div className="p-3">
        <div className="flex items-center gap-3">
          <Link href={profileHref} target="_blank" rel="noopener noreferrer" className="shrink-0">
            <Avatar className="h-11 w-11 ring-1 ring-border transition-shadow hover:ring-domain">
              {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={user.username} />}
              <AvatarFallback className="text-sm font-medium">
                {(user.displayName || user.username || '?').charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={profileHref}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate text-sm font-semibold text-foreground hover:text-domain hover:underline"
              >
                {user.displayName || user.username}
              </Link>
              <StatusPill tone={pill.tone} label={pill.label} dot={false} />
            </div>
            <p className="truncate text-[11px] text-muted-foreground">@{user.username}</p>
            <p className="truncate text-[11px] text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="flex divide-x divide-border border-t border-border">
        <Stat label="Likes" value={Number(user.likesReceivedAllTime ?? 0)} />
        <Stat label="30d" value={Number(user.likesReceived30d ?? 0)} />
        <Stat label="Posts" value={Number(user.postCount ?? 0)} />
      </div>

      {/* Meta */}
      <div className="border-t border-border px-3 py-1.5">
        <Field label="ID">
          <span className="inline-flex items-center gap-1">
            <span className="font-mono text-[11px]">{user.userId}</span>
            <button type="button" onClick={() => void copyId(user.userId)} className="text-muted-foreground hover:text-foreground">
              {copied ? <Check className="h-3 w-3 text-[hsl(var(--success-text))]" /> : <Copy className="h-3 w-3" />}
            </button>
          </span>
        </Field>
        <Field label="Joined">{formatDate(user.joinDate)}</Field>
        <Field label="Onboarded">
          <StatusPill tone={user.isOnboarded ? 'success' : 'neutral'} label={user.isOnboarded ? 'Yes' : 'No'} />
        </Field>
        <Field label="Services">
          <span className="inline-flex flex-wrap items-center justify-end gap-1">
            {user.connectedServices.length === 0 && <span className="text-muted-foreground">None</span>}
            {user.connectedServices.map((svc) => (
              <span key={svc.serviceType} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{svc.serviceType}</span>
            ))}
          </span>
        </Field>
        <Field label="Can assign verified">
          <StatusPill tone={user.canAssignVerified ? 'success' : 'neutral'} label={user.canAssignVerified ? 'Yes' : 'No'} />
        </Field>
      </div>

      {/* Role controls */}
      <div className="border-t border-border p-3">
        {actorCanAssignVerified ? (
          <UserAccountTypeControls
            currentType={selectedUserAccountType}
            currentCanAssignVerified={Boolean(user.canAssignVerified)}
            targetType={targetAccountType}
            onTargetTypeChange={onTargetAccountTypeChange}
            targetCanAssignVerified={targetCanAssignVerified}
            onTargetCanAssignVerifiedChange={onTargetCanAssignVerifiedChange}
            accountTypeReason={accountTypeReason}
            onReasonChange={onReasonChange}
            updatingAccountType={updatingAccountType}
            onApplyChanges={onUpdateAccountType}
          />
        ) : (
          <p className="text-[11px] text-muted-foreground">No CanAssignVerified permission.</p>
        )}
      </div>
    </Panel>
  );
}
