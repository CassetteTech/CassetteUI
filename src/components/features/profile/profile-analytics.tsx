'use client';

import { Card } from '@/components/ui/card';
import { ProfileAnalyticsSummary } from '@/types';
import { theme } from '@/lib/theme';
import {
  Eye, Users, MousePointerClick, UserCheck, TrendingUp, ExternalLink,
  BarChart3, Activity
} from 'lucide-react';

interface ProfileAnalyticsProps {
  summary?: ProfileAnalyticsSummary;
  isLoading?: boolean;
}

function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function formatTimestamp(value?: string | null) {
  if (!value) return '---';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '---';
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${Math.floor(diffHours)}h ago`;
  if (diffDays < 7) return `${Math.floor(diffDays)}d ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getPrivacyBadgeClass(privacy: string): string {
  switch (privacy?.toLowerCase()) {
    case 'public': return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400';
    case 'private': return 'bg-amber-500/15 text-amber-600 dark:text-amber-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type?.toLowerCase()) {
    case 'track': return 'bg-sky-500/15 text-sky-600 dark:text-sky-400';
    case 'album': return 'bg-violet-500/15 text-violet-600 dark:text-violet-400';
    case 'artist': return 'bg-rose-500/15 text-rose-600 dark:text-rose-400';
    case 'playlist': return 'bg-teal-500/15 text-teal-600 dark:text-teal-400';
    default: return 'bg-muted text-muted-foreground';
  }
}

/** Inline bar visualization — pure CSS, no chart library needed */
function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 2) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}

/* ─── Loading skeleton ─── */
function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Hero stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 bg-card/80 border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-muted/60" />
              <div className="h-3 w-20 rounded bg-muted/60" />
            </div>
            <div className="h-9 w-20 rounded bg-muted/60 mb-1" />
            <div className="h-3 w-28 rounded bg-muted/40" />
          </Card>
        ))}
      </div>
      {/* Detail stats skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="p-5 bg-card/80 border-border/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-xl bg-muted/60" />
              <div className="h-3 w-20 rounded bg-muted/60" />
            </div>
            <div className="h-9 w-20 rounded bg-muted/60 mb-1" />
            <div className="h-3 w-28 rounded bg-muted/40" />
          </Card>
        ))}
      </div>
      {/* Table skeleton */}
      <Card className="p-5 bg-card/80 border-border/50">
        <div className="h-5 w-36 rounded bg-muted/60 mb-5" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-3 w-3 rounded-full bg-muted/40" />
              <div className="h-4 flex-1 rounded bg-muted/40" />
              <div className="h-4 w-12 rounded bg-muted/40" />
              <div className="h-4 w-12 rounded bg-muted/40" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Empty state ─── */
function AnalyticsEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div
        className="h-16 w-16 rounded-2xl flex items-center justify-center mb-6"
        style={{ backgroundColor: `${theme.colors.brandRed}15` }}
      >
        <BarChart3 className="h-8 w-8" style={{ color: theme.colors.brandRed }} />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2" style={{ fontFamily: theme.fonts.teko }}>
        No analytics yet
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Analytics will appear here once people start viewing your profile and posts.
      </p>
    </div>
  );
}

/* ─── Main dashboard ─── */
export function ProfileAnalytics({ summary, isLoading = false }: ProfileAnalyticsProps) {
  if (isLoading && !summary) return <AnalyticsSkeleton />;
  if (!summary) return <AnalyticsEmpty />;

  const maxViews = Math.max(...(summary.topPosts.map(p => p.views)), 1);
  const maxClicks = Math.max(...(summary.topPosts.map(p => p.clicks)), 1);

  const heroStats = [
    {
      label: 'Profile Views',
      value: summary.profileVisitsTotal,
      subtitle: `${formatNumber(summary.profileVisitorsUnique)} unique visitors`,
      icon: Eye,
      accent: theme.colors.brandRed,
    },
    {
      label: 'Post Views',
      value: summary.postViewsTotal,
      subtitle: `${formatNumber(summary.postViewersUnique)} unique viewers`,
      icon: TrendingUp,
      accent: theme.colors.info,
    },
    {
      label: 'Outbound Clicks',
      value: summary.outboundClicksTotal,
      subtitle: `${formatNumber(summary.outboundClickersUnique)} unique clickers`,
      icon: MousePointerClick,
      accent: theme.colors.success,
    },
  ];

  const detailStats = [
    {
      label: 'Unique Visitors',
      value: summary.profileVisitorsUnique,
      subtitle: 'Distinct profile visitors',
      icon: UserCheck,
      accent: theme.colors.brandRedL,
    },
    {
      label: 'Unique Viewers',
      value: summary.postViewersUnique,
      subtitle: 'Distinct post viewers',
      icon: Users,
      accent: theme.colors.accentLilac,
    },
    {
      label: 'Unique Clickers',
      value: summary.outboundClickersUnique,
      subtitle: 'Distinct outbound clickers',
      icon: ExternalLink,
      accent: theme.colors.accentTeal,
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── Hero Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {heroStats.map((stat) => (
          <Card
            key={stat.label}
            className="group relative overflow-hidden p-5 bg-card/80 border-border/50
                       hover:border-border transition-all duration-300"
          >
            {/* Subtle accent gradient in top-right */}
            <div
              className="absolute -top-8 -right-8 h-24 w-24 rounded-full opacity-[0.07]
                         group-hover:opacity-[0.12] transition-opacity duration-500"
              style={{ backgroundColor: stat.accent }}
            />

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${stat.accent}18` }}
                >
                  <stat.icon className="h-5 w-5" style={{ color: stat.accent }} />
                </div>
                <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {stat.label}
                </span>
              </div>

              <p
                className="text-3xl font-bold text-foreground leading-none mb-1"
                style={{ fontFamily: theme.fonts.teko, letterSpacing: '-0.02em' }}
              >
                {formatNumber(stat.value)}
              </p>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* ─── Detail Stats ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {detailStats.map((stat) => (
          <Card
            key={stat.label}
            className="p-5 bg-card/80 border-border/50 hover:border-border transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: `${stat.accent}18` }}
              >
                <stat.icon className="h-5 w-5" style={{ color: stat.accent }} />
              </div>
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
            </div>
            <p
              className="text-3xl font-bold text-foreground leading-none mb-1"
              style={{ fontFamily: theme.fonts.teko, letterSpacing: '-0.02em' }}
            >
              {formatNumber(stat.value)}
            </p>
            <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          </Card>
        ))}
      </div>

      {/* ─── Top Posts ─── */}
      <Card className="bg-card/80 border-border/50 overflow-hidden">
        <div className="p-5 pb-3 border-b border-border/40">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3
              className="text-base font-semibold text-foreground"
              style={{ fontFamily: theme.fonts.teko, letterSpacing: '0.02em' }}
            >
              Top Posts
            </h3>
          </div>
        </div>

        {summary.topPosts.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">No post data yet.</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="px-5 py-3 font-medium">Post</th>
                    <th className="px-3 py-3 font-medium">Type</th>
                    <th className="px-3 py-3 font-medium">Privacy</th>
                    <th className="px-3 py-3 font-medium text-right">Views</th>
                    <th className="px-3 py-3 font-medium w-24"></th>
                    <th className="px-3 py-3 font-medium text-right">Clicks</th>
                    <th className="px-3 py-3 font-medium w-24"></th>
                    <th className="px-5 py-3 font-medium text-right">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {summary.topPosts.map((post, idx) => (
                    <tr
                      key={post.postId}
                      className="group hover:bg-muted/30 transition-colors duration-150"
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="text-xs font-mono text-muted-foreground/60 w-5 text-right tabular-nums"
                          >
                            {idx + 1}
                          </span>
                          <span className="font-medium text-foreground truncate max-w-[200px]">
                            {post.title}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${getTypeBadgeClass(post.elementType)}`}>
                          {post.elementType}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${getPrivacyBadgeClass(post.privacy)}`}>
                          {post.privacy}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground font-medium">
                        {post.views.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={post.views} max={maxViews} color={theme.colors.info} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground font-medium">
                        {post.clicks.toLocaleString()}
                      </td>
                      <td className="px-3 py-3">
                        <MiniBar value={post.clicks} max={maxClicks} color={theme.colors.success} />
                      </td>
                      <td className="px-5 py-3 text-right text-muted-foreground text-xs">
                        {formatTimestamp(post.lastInteractionAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden divide-y divide-border/30">
              {summary.topPosts.map((post, idx) => (
                <div key={post.postId} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground/60 shrink-0">
                        {idx + 1}.
                      </span>
                      <span className="font-medium text-foreground text-sm truncate">
                        {post.title}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {formatTimestamp(post.lastInteractionAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${getTypeBadgeClass(post.elementType)}`}>
                      {post.elementType}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-md ${getPrivacyBadgeClass(post.privacy)}`}>
                      {post.privacy}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Views</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {post.views.toLocaleString()}
                        </span>
                      </div>
                      <MiniBar value={post.views} max={maxViews} color={theme.colors.info} />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between mb-1">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Clicks</span>
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {post.clicks.toLocaleString()}
                        </span>
                      </div>
                      <MiniBar value={post.clicks} max={maxClicks} color={theme.colors.success} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
